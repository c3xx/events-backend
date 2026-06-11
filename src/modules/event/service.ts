import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { orderWorkflowSteps, unreachable } from "@/lib/helpers.js";
import * as eventTypeRepository from "@/modules/event-type/repository.js";
import * as organizationRepository from "@/modules/organization/repository.js";
import * as permissionRepository from "@/modules/permission/repository.js";
import * as roleRepository from "@/modules/role/repository.js";
import * as userRepository from "@/modules/user/repository.js";
import * as workflowTemplateRepository from "@/modules/workflow-template/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";
import type { EventScope } from "./scopes.js";
import * as workflowInstanceRepository from "./workflow-instance/repository.js";

export async function createEvent(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	input: schemas.CreateEventSchema,
) {
	if (
		!(await permissionRepository.hasPermissionInManagedEntity(
			user,
			"organization",
			[input.organizationId],
			"event:manage",
		))
	) {
		throw new ForbiddenError("You do not have any required permission for this");
	}

	if ((await organizationRepository.getOrganization(input.organizationId)) == null) {
		throw new NotFoundError("Organization not found");
	}
	const eventType = await eventTypeRepository.getEventType(input.typeId);
	if (eventType == null) {
		throw new NotFoundError("Event type not found");
	} else if (eventType.isActive === false) {
		throw new ConflictError("Event type is inactive");
	}
	if (
		input.parentEventId != null &&
		(await repository.findEventById(input.parentEventId)) == null
	) {
		throw new NotFoundError("Parent event not found");
	}

	return await repository.createEvent({
		organizationId: input.organizationId,
		title: input.title,
		typeId: input.typeId,
		categoryId: input.categoryId,
		expectedParticipants: input.expectedParticipants,
		requestDetails: input.requestDetails,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		parentEventId: input.parentEventId,
		createdBy: user.id,
	});
}

export async function updateEvent(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	eventId: number,
	input: schemas.UpdateEventSchema,
) {
	const orgIds = await repository.findEventOrganizerOrgIds(eventId);
	if (orgIds.length === 0) throw new NotFoundError("Event not found");

	const hasAccess = await permissionRepository.hasPermissionInManagedEntity(
		user,
		"organization",
		orgIds,
		"event:manage",
	);

	if (!hasAccess) {
		throw new ForbiddenError("You do not have any required permission for this");
	}

	const result = await repository.updateEvent({
		id: eventId,
		title: input.title,
		typeId: input.typeId,
		categoryId: input.categoryId,
		expectedParticipants: input.expectedParticipants,
		requestDetails: input.requestDetails,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		parentEventId: input.parentEventId,
	});
	if (result == null) {
		throw new NotFoundError("Event not found");
	} else if ("eventExist" in result) {
		throw new ConflictError("Only draft events can be updated");
	}
	return result;
}

export async function getEvent(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	eventId: number,
) {
	const event = await repository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	if (user.type === "admin") return event;

	const perms = new Set(user.permissions);
	if (perms.has("event:view_all")) return event;
	if (perms.has("event:view_all_non_draft") && event.status !== "draft") return event;
	if (perms.has("event:view_all_confirmed") && event.status === "approved") return event;

	const eventOrgIds = event.organizers.map((o) => o.organization.id);

	if (eventOrgIds.length > 0) {
		const hasAccess = await permissionRepository.hasPermissionInManagedEntity(
			user,
			"organization",
			eventOrgIds,
			"event:view_own",
		);

		if (hasAccess) return event;
	}

	throw new ForbiddenError("You do not have permission to view this event");
}

export async function getEvents(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	filter: schemas.GetEventsQuerySchema,
) {
	if (user.type === "admin") {
		return await repository.findEvents({
			status: filter.status,
			typeId: filter.typeId,
			viewAll: true,
		});
	}

	const perms = new Set(user.permissions);
	const grants = {
		viewAll: perms.has("event:view_all"),
		viewAllNonDraft: perms.has("event:view_all_non_draft"),
		viewAllConfirmed: perms.has("event:view_all_confirmed"),
		viewOwn: perms.has("event:view_own"),
	};

	if (!Object.values(grants).some(Boolean)) return [];

	const orgIds =
		grants.viewOwn && !grants.viewAll
			? (await userRepository.getUserOrganizations(user.id, "event:view_own")).map((org) => org.id)
			: [];

	return await repository.findEvents({
		status: filter.status,
		typeId: filter.typeId,
		viewAll: grants.viewAll,
		viewAllNonDraft: !grants.viewAll && grants.viewAllNonDraft,
		viewAllConfirmed: !grants.viewAll && !grants.viewAllNonDraft && grants.viewAllConfirmed,
		orgIds,
	});
}

type InstanceInsertData = {
	eventId: number;
	submittedBy: number;
	steps: {
		name: string;
		roles: {
			roleId: number;
			targetGroupApprovalCriteria: WorkflowTargetGroupApprovalCriteria;
			targetGroups: {
				managedEntityId: number;
				userRoleIds: number[];
			}[];
		}[];
	}[];
};

export async function createWorkflowInstance(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	event: EventScope["event"],
) {
	const host = event.organizers.find((o) => o.role === "host");
	if (!host) {
		throw new NotFoundError("Host organizer not found");
	}

	const hasPermission = await permissionRepository.hasPermissionInManagedEntity(
		user,
		"organization",
		[host.organization.id],
		"event:manage",
	);
	if (!hasPermission) {
		throw new ForbiddenError("You do not have any required permission for this");
	}

	const existing = await workflowInstanceRepository.findActiveInstance(event.id);
	if (existing) {
		throw new ConflictError("An active workflow instance already exists for this event");
	}

	const eventType = await eventTypeRepository.getEventType(event.type.id);
	if (!eventType) {
		throw new NotFoundError("Event type not found");
	}

	const template = await workflowTemplateRepository.findByIdWithRoles(eventType.workflowTemplateId);
	if (!template) {
		throw new NotFoundError("Workflow template not found");
	}
	if (template.initialStepId == null || template.steps.length === 0) {
		throw new ConflictError("Workflow template has no steps configured");
	}

	const orderedSteps = orderWorkflowSteps(template.steps, template.initialStepId);

	const organizerOrgIds = event.organizers.map((o) => o.organization.id);
	const venueIds = event.venueAllotments.map((va) => va.venue.id);

	const [orgManagedEntities, venueManagedEntities] = await Promise.all([
		workflowInstanceRepository.findAncestorOrganizationManagedEntities(organizerOrgIds), // get all managed entity related to event organizers
		workflowInstanceRepository.findVenueManagedEntityIds(venueIds), // get all managed entity related to the venues
	]);

	const allManagedEntities = [...orgManagedEntities, ...venueManagedEntities];
	const allManagedEntityIds = allManagedEntities.map((e) => e.managedEntityId);

	const roleIds = [
		...new Set(orderedSteps.flatMap((step) => step.stepRoles.map((stepRole) => stepRole.role.id))),
	];

	const assignments = await roleRepository.findAssignmentsForRoles(roleIds, allManagedEntityIds); // Find the userRole of all roles in the related managed entities

	const entitiesByTypeAndKind = new Map<string, number[]>();
	// create a map for storing (enityType,typeRef)=>managedEnitityIds[]
	// e.g (Organization, club)=>[CodingClub, CSI]

	for (const entity of allManagedEntities) {
		const key = `${entity.managedEntityType}:${entity.typeRefId}`;

		if (!entitiesByTypeAndKind.has(key)) {
			entitiesByTypeAndKind.set(key, []);
		}

		const managedEntityIds = entitiesByTypeAndKind.get(key);
		if (managedEntityIds == null) unreachable();
		managedEntityIds.push(entity.managedEntityId);
	}

	const assignmentMap = new Map<string, number[]>();
	//create a map for storing (roleId,enityId)=>userRoleIds[]
	// e.g (clubHead, CodingClub)=>[userRole A,userRole B]
	for (const assignment of assignments) {
		const key = `${assignment.roleId}:${assignment.managedEntityId}`;

		if (!assignmentMap.has(key)) {
			assignmentMap.set(key, []);
		}

		const userRoleIds = assignmentMap.get(key);
		if (userRoleIds == null) unreachable();
		userRoleIds.push(assignment.userRoleId);
	}

	const steps: InstanceInsertData["steps"] = [];

	for (const step of orderedSteps) {
		const resolvedRoles: InstanceInsertData["steps"][number]["roles"] = [];

		for (const stepRole of step.stepRoles) {
			//A step can have multiple roles
			const role = stepRole.role;

			const matchingEntityIds =
				entitiesByTypeAndKind.get(`${role.managedEntityType}:${role.typeRefId}`) ?? []; //get enities which has the given role

			const targetGroups = matchingEntityIds.map((managedEntityId) => ({
				managedEntityId,
				userRoleIds: assignmentMap.get(`${role.id}:${managedEntityId}`) ?? [], //get userRole with the role under the given entity
			}));

			resolvedRoles.push({
				roleId: role.id,
				targetGroupApprovalCriteria: stepRole.targetGroupApprovalCriteria,
				targetGroups,
			});
		}

		steps.push({
			name: step.name,
			roles: resolvedRoles,
		});
	}

	const result = await workflowInstanceRepository.insertWorkflowInstance({
		eventId: event.id,
		submittedBy: user.id,
		steps,
	});

	return result;
}

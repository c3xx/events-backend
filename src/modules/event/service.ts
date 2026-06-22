import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
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

export async function createEvent(user: AuthenticatedUser, input: schemas.CreateEventSchema) {
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
	user: AuthenticatedUser,
	event: EventScope["event"],
	input: schemas.UpdateEventSchema,
) {
	if (event.status !== "draft") throw new BadRequestError("Only draft events can be modified");

	const hostOrganizers = event.organizers.filter((organizer) => organizer.role === "host");
	if (hostOrganizers.length !== 1 || hostOrganizers[0] == null) unreachable();
	const hostOrganizer = hostOrganizers[0]; // note: only host can do stuff.

	const hasAccess = await permissionRepository.hasPermissionInManagedEntity(
		user,
		"organization",
		[hostOrganizer.organization.id],
		"event:manage",
	);

	if (!hasAccess) {
		throw new ForbiddenError("You do not have permission to update this event");
	}

	const result = await repository.updateEvent({
		id: event.id,
		title: input.title,
		typeId: input.typeId,
		categoryId: input.categoryId,
		expectedParticipants: input.expectedParticipants,
		requestDetails: input.requestDetails,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		parentEventId: input.parentEventId,
	});
	return result;
}

export async function getEvent(event: EventScope["event"]) {
	return event;
}

export async function getEvents(user: AuthenticatedUser, filter: schemas.GetEventsQuerySchema) {
	const userOrganizations = await userRepository.getUserOrganizations(user.id, "event:view_own");
	if (userOrganizations.length === 0) return [];
	const userOrganizationsIds = userOrganizations.map((org) => org.id);

	return await repository.findEvents({
		organizationIds: userOrganizationsIds,
		status: filter.status,
		typeId: filter.typeId,
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

export async function submitEvent(user: AuthenticatedUser, event: EventScope["event"]) {
	const host = event.organizers.find((o) => o.role === "host");
	if (!host) {
		throw new NotFoundError("Host organizer not found");
	}
	// Only host organization can submit event
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

	const template = await workflowTemplateRepository.findByIdWithRoles(
		eventType.workflowTemplate.id,
	);
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

export async function getParentableEvents(
	user: AuthenticatedUser,
	parentableFor: schemas.GetParentableEventsSchema,
) {
	const hasPermission = permissionRepository.hasPermissionInManagedEntity(
		user,
		"organization",
		[parentableFor.organizationId],
		"event:manage",
	);
	if (!hasPermission) {
		throw new ForbiddenError("You don't have permission to view this");
	}

	return repository.findParentableEvents(parentableFor);
}

export async function discardDraftEvent(user: AuthenticatedUser, event: EventScope["event"]) {
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

	if (event.status !== "draft") {
		throw new ConflictError("Only draft events can be discarded");
	}

	await repository.discardDraftEvent(event.id);
}

export async function cancelApprovedEvent(user: AuthenticatedUser, event: EventScope["event"]) {
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

	if (event.status !== "approved") {
		throw new ConflictError("Only approved events can be cancelled");
	}

	const now = new Date();
	const endsAt = new Date(event.endsAt);
	if (endsAt <= now) {
		throw new ConflictError("Cannot cancel an event that has already ended");
	}

	const result = await repository.cancelApprovedEvent(event.id);
	if (result == null) {
		throw new NotFoundError("Event not found");
	}

	return { id: result.id };
}

import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { orderWorkflowSteps, unreachable } from "@/lib/helpers.js";
import * as permissionRepository from "@/modules/permission/repository.js";
import type { EventScope } from "../scopes.js";
import * as repository from "./repository.js";

export async function getLatestWorkflowInstance(event: EventScope["event"]) {
	const rows = await repository.getLatestWorkflowInstance(event.id);
	const instance = hydrateWorkflowInstance(rows);
	if (instance == null) {
		throw new NotFoundError("No workflow instance found");
	}
	instance.steps = orderWorkflowSteps(instance.steps, instance.initialStepId);
	return instance;
}

export async function getAllWorkflowInstances(event: EventScope["event"]) {
	const instances = await repository.getAllWorkflowInstances(event.id);
	return instances;
}

export async function getWorkflowInstance(event: EventScope["event"], workflowInstanceId: number) {
	const rows = await repository.getWorkflowInstance(event.id, workflowInstanceId);
	const instance = hydrateWorkflowInstance(rows);
	if (instance == null) {
		throw new NotFoundError("No workflow instance found");
	}
	instance.steps = orderWorkflowSteps(instance.steps, instance.initialStepId);
	return instance;
}

export async function abortWorkflowInstance(
	event: EventScope["event"],
	instanceId: number,
	user: { id: number; type: UserType; permissions: PermissionCode[] },
) {
	const hostOrganizers = event.organizers.filter((o) => o.role === "host");
	if (hostOrganizers.length !== 1 || hostOrganizers[0] == null) unreachable();
	const host = hostOrganizers[0];

	const hasPermission = await permissionRepository.hasPermissionInManagedEntity(
		user,
		"organization",
		[host.organization.id],
		"event:manage",
	);
	if (!hasPermission) throw new ForbiddenError("You do not have permission to abort this workflow");

	const rows = await repository.getWorkflowInstance(event.id, instanceId);
	const instance = hydrateWorkflowInstance(rows);
	if (instance == null) throw new NotFoundError("Workflow instance not found");
	if (instance.status !== "active")
		throw new ConflictError("Only active workflow instances can be aborted");

	await repository.abortWorkflowInstance(instanceId, event.id);
}

function hydrateWorkflowInstance(rows: InstanceRow[]) {
	const first = rows[0];
	if (first == null) return undefined;

	const stepsMap = new Map<number, StepEntry>();

	for (const row of rows) {
		if (row.step_id == null || row.step_name == null || row.step_status == null) continue;

		if (!stepsMap.has(row.step_id)) {
			stepsMap.set(row.step_id, {
				id: row.step_id,
				name: row.step_name,
				status: row.step_status,
				nextStepId: row.step_next_step_id,
				stepRoles: new Map(),
			});
		}
		const step = stepsMap.get(row.step_id);
		if (step == null) unreachable();

		if (row.step_role_id == null || row.step_role_role_id == null || row.step_role_criteria == null)
			continue;

		if (!step.stepRoles.has(row.step_role_id)) {
			step.stepRoles.set(row.step_role_id, {
				id: row.step_role_id,
				roleId: row.step_role_role_id,
				targetGroupApprovalCriteria: row.step_role_criteria,
				targetGroups: new Map(),
			});
		}
		const stepRole = step.stepRoles.get(row.step_role_id);
		if (stepRole == null) unreachable();

		if (row.target_group_id == null || row.target_group_managed_entity_id == null) continue;

		if (!stepRole.targetGroups.has(row.target_group_id)) {
			stepRole.targetGroups.set(row.target_group_id, {
				id: row.target_group_id,
				managedEntityId: row.target_group_managed_entity_id,
				assignments: new Map(),
			});
		}
		const targetGroup = stepRole.targetGroups.get(row.target_group_id);
		if (targetGroup == null) unreachable();

		if (
			row.assignment_id == null ||
			row.assignment_status == null ||
			row.user_role_id == null ||
			row.user_id == null ||
			row.user_full_name == null ||
			row.role_id == null ||
			row.role_name == null
		)
			continue;

		if (!targetGroup.assignments.has(row.assignment_id)) {
			targetGroup.assignments.set(row.assignment_id, {
				id: row.assignment_id,
				status: row.assignment_status,
				completedAt: row.assignment_completed_at,
				userRole: {
					id: row.user_role_id,
					user: { id: row.user_id, fullName: row.user_full_name },
					role: { id: row.role_id, name: row.role_name },
				},
			});
		}
	}

	const steps = [...stepsMap.values()].map((step) => ({
		id: step.id,
		name: step.name,
		status: step.status,
		nextStepId: step.nextStepId,
		stepRoles: [...step.stepRoles.values()].map((sr) => ({
			id: sr.id,
			roleId: sr.roleId,
			targetGroupApprovalCriteria: sr.targetGroupApprovalCriteria,
			targetGroups: [...sr.targetGroups.values()].map((tg) => ({
				id: tg.id,
				managedEntityId: tg.managedEntityId,
				assignments: [...tg.assignments.values()],
			})),
		})),
	}));

	return {
		id: first.instance_id,
		createdAt: first.instance_created_at,
		initialStepId: first.instance_initial_step_id,
		status: first.instance_status,
		completedAt: first.instance_completed_at,
		eventId: first.instance_event_id,
		submittedBy: first.instance_submitted_by,
		steps,
	};
}

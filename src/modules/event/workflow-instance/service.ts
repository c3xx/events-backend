import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { orderWorkflowSteps, unreachable } from "@/lib/helpers.js";
import * as permissionRepository from "@/modules/permission/repository.js";
import type { EventScope } from "../scopes.js";
import * as repository from "./repository.js";

export async function getLatestWorkflowInstance(event: EventScope["event"]) {
	const instance = await repository.getLatestWorkflowInstance(event.id);
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
	const instance = await repository.getWorkflowInstance(event.id, workflowInstanceId);
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

	const instance = await repository.getWorkflowInstance(event.id, instanceId);
	if (instance == null) throw new NotFoundError("Workflow instance not found");
	if (instance.status !== "active")
		throw new ConflictError("Only active workflow instances can be aborted");

	await repository.abortWorkflowInstance(instanceId, event.id);
}

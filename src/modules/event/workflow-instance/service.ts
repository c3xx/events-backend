import { ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { orderWorkflowSteps } from "@/lib/helpers.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import type { EventScope } from "../scopes.js";
import * as repository from "./repository.js";

export async function getLatestWorkflowInstance(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	event: EventScope["event"],
) {
	const organizationIds = event.organizers.map((org) => org.organization.id);
	const hasPermission = await hasPermissionInManagedEntity(
		user,
		"organization",
		organizationIds,
		"event:view_own",
	);
	if (!hasPermission) {
		throw new ForbiddenError("You don't have permission to view this");
	}
	const instance = await repository.getLatestWorkflowInstance(event.id);

	if (instance == null) {
		throw new NotFoundError("No workflow instance found");
	}

	instance.steps = orderWorkflowSteps(instance.steps, instance.initialStepId);

	return instance;
}

export async function getAllWorkflowInstances(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	event: EventScope["event"],
) {
	const organizationIds = event.organizers.map((org) => org.organization.id);
	const hasPermission = await hasPermissionInManagedEntity(
		user,
		"organization",
		organizationIds,
		"event:view_own",
	);
	if (!hasPermission) {
		throw new ForbiddenError("You don't have permission to view this");
	}
	const instances = await repository.getAllWorkflowInstances(event.id);

	if (!instances?.length) {
		throw new NotFoundError("No workflow instance found");
	}

	return instances;
}

export async function getWorkflowInstance(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	event: EventScope["event"],
	workflowInstanceId: number,
) {
	const organizationIds = event.organizers.map((org) => org.organization.id);
	const hasPermission = await hasPermissionInManagedEntity(
		user,
		"organization",
		organizationIds,
		"event:view_own",
	);
	if (!hasPermission) {
		throw new ForbiddenError("You don't have permission to view this");
	}
	const instance = await repository.getWorkflowInstance(event.id, workflowInstanceId);

	if (instance == null) {
		throw new NotFoundError("No workflow instance found");
	}

	instance.steps = orderWorkflowSteps(instance.steps, instance.initialStepId);

	return instance;
}

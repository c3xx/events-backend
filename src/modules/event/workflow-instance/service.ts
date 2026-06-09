import { ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { orderWorkflowSteps } from "@/lib/helpers.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import type { eventScope } from "../scopes.js";
import * as repository from "./repository.js";

export async function getLatestWorkflowInstance(
	user: { id: number; type: UserType; permissions: PermissionCode[] },
	event: eventScope["event"],
) {
	const organizationIds = event.organizers.map((org) => org.organization.id);
	const hasPermission = await hasPermissionInManagedEntity(
		user,
		"organization",
		organizationIds,
		"event:view_own",
	);
	if (!hasPermission) {
		throw new ForbiddenError("You do not have any required permission for this");
	}
	const instance = await repository.getLatestWorkflowInstance(event.id);

	if (instance == null) {
		throw new NotFoundError("No workflow instance found");
	}

	instance.steps = orderWorkflowSteps(instance.steps, instance.initialStepId);

	return instance;
}

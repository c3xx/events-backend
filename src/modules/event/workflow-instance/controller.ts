import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import type { EventScope } from "../scopes.js";
import * as schema from "./schema.js";
import * as service from "./service.js";

export const getLatestWorkflowInstance: ScopedApiRequestHandler<
	EventScope,
	WorkflowInstance
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const result = await service.getLatestWorkflowInstance(user, res.locals.event);
	return ok(res, result);
};

export const getAllWorkflowInstances: ScopedApiRequestHandler<
	EventScope,
	WorkflowInstances
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const result = await service.getAllWorkflowInstances(user, res.locals.event);
	return ok(res, result);
};

export const getWorkflowInstance: ScopedApiRequestHandler<EventScope, WorkflowInstance> = async (
	req,
	res,
) => {
	const user = getAuthenticatedUser(req);
	const param = schema.workflowScopedSchema.parse(req.params);
	const result = await service.getWorkflowInstance(
		user,
		res.locals.event,
		param.workflowInstanceId,
	);
	return ok(res, result);
};

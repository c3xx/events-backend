import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import type { EventScope } from "../scopes.js";
import * as schema from "./schema.js";
import * as service from "./service.js";

export const getLatestWorkflowInstance: ScopedApiRequestHandler<
	EventScope,
	WorkflowInstance
> = async (_req, res) => {
	const result = await service.getLatestWorkflowInstance(res.locals.event);
	return ok(res, result);
};

export const getAllWorkflowInstances: ScopedApiRequestHandler<
	EventScope,
	WorkflowInstances
> = async (_req, res) => {
	const result = await service.getAllWorkflowInstances(res.locals.event);
	return ok(res, result);
};

export const getWorkflowInstance: ScopedApiRequestHandler<EventScope, WorkflowInstance> = async (
	req,
	res,
) => {
	const param = schema.workflowScopedSchema.parse(req.params);
	const result = await service.getWorkflowInstance(res.locals.event, param.workflowInstanceId);
	return ok(res, result);
};

export const abortWorkflowInstance: ScopedApiRequestHandler<EventScope, true> = async (
	req,
	res,
) => {
	const user = getAuthenticatedUser(req);
	const param = schema.workflowInstanceItemScopedSchema.parse(req.params);
	await service.abortWorkflowInstance(res.locals.event, param.id, user);
	return ok(res, true);
};

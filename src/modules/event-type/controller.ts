import { ok } from "@/lib/helpers.js";
import {
	createEventTypeSchema,
	eventTypeScopedSchema,
	allowedParentParamsSchema,
} from "./schema.js";
import * as service from "./service.js";

export const getEventTypes: ApiRequestHandler<
	{
		id: number;
		name: string;
		isActive: boolean;
	}[]
> = async (_req, res) => {
	const result = await service.getEventTypes();
	return ok(res, result);
};

export const getEventType: ApiRequestHandler<{
	id: number;
	name: string;
	workflowTemplateId: number;
	isActive: boolean;
}> = async (req, res) => {
	const params = eventTypeScopedSchema.parse(req.params);
	const result = await service.getEventType(params.id);
	return ok(res, result);
};

export const createEventType: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = createEventTypeSchema.parse(req.body);
	const result = await service.createEventType(body);
	return ok(res, result);
};

export const deleteEventType: ApiRequestHandler<true> = async (req, res) => {
	const params = eventTypeScopedSchema.parse(req.params);
	await service.deleteEventType(params.id);
	return ok(res, true);
};

export const getEventTypeChildTypes: ApiRequestHandler<{ id: number; name: string }[]> = async (
	req,
	res,
) => {
	const params = eventTypeScopedSchema.parse(req.params);
	const result = await service.getEventTypeChildTypes(params.id);
	return ok(res, result);
};

export const addAllowedChildType: ApiRequestHandler<{
	parentTypeId: number;
	childTypeId: number;
}> = async (req, res) => {
	const params = allowedParentParamsSchema.parse(req.params);
	const result = await service.addAllowedChildType(params);
	return ok(res, result);
};

export const removeAllowedChildType: ApiRequestHandler<true> = async (req, res) => {
	const params = allowedParentParamsSchema.parse(req.params);
	await service.removeAllowedChildType(params);
	return ok(res, true);
};

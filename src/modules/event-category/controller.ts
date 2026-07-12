import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const createEventType: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = schemas.createEventCategorySchema.parse(req.body);
	const result = await service.createEventCategory(body);
	return ok(res, result);
};

export const getEventCategories: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (_req, res) => {
	const result = await service.getEventCategories();
	return ok(res, result);
};

export const updateEventCategory: ApiRequestHandler<{ id: number }> = async (req, res) => {
	const params = schemas.eventCategoryScopedSchema.parse(req.params);
	const body = schemas.updateEventCategorySchema.parse(req.body);
	const result = await service.updateEventCategory(params.id, body);
	return ok(res, result);
};

export const deleteEventCategory: ApiRequestHandler<true> = async (req, res) => {
	const params = schemas.eventCategoryScopedSchema.parse(req.params);
	await service.deleteEventCategory(params.id);
	return ok(res, true);
};

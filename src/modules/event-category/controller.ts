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

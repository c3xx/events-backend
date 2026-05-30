import { ok } from "@/lib/helpers.js";
import { eventTypeScopedSchema } from "@/modules/event-type/schema.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getEventTypeChildTypes: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (req, res) => {
	const params = eventTypeScopedSchema.parse(req.params);
	const result = await service.getEventTypeChildTypes(params.id);
	return ok(res, result);
};

export const addAllowedChildType: ApiRequestHandler<{
	parentTypeId: number;
	childTypeId: number;
}> = async (req, res) => {
	const params = schemas.allowedParentParamsSchema.parse(req.params);
	const result = await service.addAllowedChildType(params);
	return ok(res, result);
};

export const removeAllowedChildType: ApiRequestHandler<true> = async (req, res) => {
	const params = schemas.allowedParentParamsSchema.parse(req.params);
	await service.removeAllowedChildType(params);
	return ok(res, true);
};

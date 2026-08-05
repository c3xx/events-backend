import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getLayers: ApiRequestHandler<
	{
		id: number;
		nextLayerId: number | null;
		label: string;
		sameLevelControlPolicy: "allowed" | "disallowed";
	}[]
> = async (_req, res) => {
	const result = await service.getAllLayers();
	return ok(res, result);
};

export const getLayer: ApiRequestHandler<{
	id: number;
	nextLayerId: number | null;
	label: string;
	sameLevelControlPolicy: "allowed" | "disallowed";
}> = async (req, res) => {
	const params = schemas.layerScopedSchema.parse(req.params);
	const result = await service.getLayer(params.layerId);
	return ok(res, result);
};

export const createLayer: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = schemas.createLayerSchema.parse(req.body);
	const result = await service.createLayer(body);
	return ok(res, result);
};

export const deleteLayer: ApiRequestHandler<true> = async (req, res) => {
	const params = schemas.layerScopedSchema.parse(req.params);
	await service.deleteLayer(params.layerId);
	return ok(res, true);
};

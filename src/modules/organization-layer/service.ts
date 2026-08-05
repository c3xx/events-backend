import { NotFoundError } from "@/lib/errors.js";
import { unreachable } from "@/lib/helpers.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getAllLayers() {
	const layers = await repository.getAll();

	if (layers.length === 0) return [];

	const byId = new Map<number, (typeof layers)[number]>();
	const prevByNextId = new Map<number, number>();

	let lastLayerId: number | null = null;

	for (const layer of layers) {
		if (byId.has(layer.id)) unreachable();
		byId.set(layer.id, layer);

		if (layer.nextLayerId) {
			if (prevByNextId.has(layer.nextLayerId)) unreachable();
			prevByNextId.set(layer.nextLayerId, layer.id);
		} else {
			if (lastLayerId != null) unreachable();
			lastLayerId = layer.id;
		}
	}

	if (lastLayerId == null) unreachable();

	const ordered: typeof layers = [];

	const seen = new Set<number>();

	while (lastLayerId != null) {
		if (seen.has(lastLayerId)) unreachable();
		seen.add(lastLayerId);

		const layer = byId.get(lastLayerId);
		if (layer == null) unreachable();

		ordered.unshift(layer);
		lastLayerId = prevByNextId.get(lastLayerId) ?? null;
	}

	return ordered;
}

export async function getLayer(layerId: number) {
	const layer = await repository.findLayerById(layerId);
	if (layer == null) throw new NotFoundError("Could not find the layer");
	return layer;
}

export async function createLayer(input: schemas.CreateLayerSchema) {
	return await repository.insert({
		label: input.label,
		sameLevelControlPolicy: input.sameLevelControlPolicy,
		nextLayerId: input.nextLayerId,
	});
}

export async function deleteLayer(layerId: number) {
	const layer = await repository.findLayerById(layerId);
	if (layer == null) throw new NotFoundError("Could not find the layer");

	// todo: check for organizations

	await repository.remove(layerId);
}

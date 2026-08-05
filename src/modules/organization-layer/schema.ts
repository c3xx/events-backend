import z from "zod";
import { ORGANIZATIONS_SAME_LAYER_CONTROL_POLICIES } from "@/lib/constants.js";
import { idLike } from "@/lib/helpers.js";

export const createLayerSchema = z.object({
	label: z.string().min(1).max(256),
	sameLevelControlPolicy: z.enum(ORGANIZATIONS_SAME_LAYER_CONTROL_POLICIES),
	nextLayerId: idLike("Invalid next layer reference").nullish(),
});

export const layerScopedSchema = z.object({
	layerId: idLike("Invalid layer reference"),
});

export type CreateLayerSchema = z.output<typeof createLayerSchema>;

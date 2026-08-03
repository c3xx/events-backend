import z from "zod";
import { FACILITY_PROVIDER_ENTITY_TYPES } from "@/lib/constants.js";
import { idLike } from "@/lib/helpers.js";

export const addFacilityProviderSchema = z.object({
	providerType: z.enum(FACILITY_PROVIDER_ENTITY_TYPES),
	providerId: idLike("Invalid provider ID"), // org / venue id
});

export const removeFacilityProviderSchema = z.object({
	providerId: idLike("Invalid provider ID"), // actual provider id
});

export type AddFacilityProviderSchema = z.output<typeof addFacilityProviderSchema>;
export type RemoveFacilityProviderSchema = z.output<typeof removeFacilityProviderSchema>;

import z from "zod";
import {
	FACILITY_ASSOCIATION_METHODS,
	FACILITY_OVERLAP_POLICIES,
	FACILITY_WORKFLOW_PARTICIPATION_POLICIES,
} from "@/lib/constants.js";
import { idLike } from "@/lib/helpers.js";

export const createFacilitySchema = z.object({
	name: z
		.string({ error: "Invalid facility name" })
		.trim()
		.nonempty({ error: "Facility name cannot be empty" })
		.max(256, {
			error: "Facility name length cannot exceed 256 characters",
		}),
	typeId: idLike("Invalid facility type ID"),
	association: z.enum(FACILITY_ASSOCIATION_METHODS),
	overlapPolicy: z.enum(FACILITY_OVERLAP_POLICIES),
	workflowParticipationPolicy: z.enum(FACILITY_WORKFLOW_PARTICIPATION_POLICIES),
});

export const changeAvailabilitySchema = z.object({
	availability: z.boolean(),
});

export type CreateFacilitySchema = z.output<typeof createFacilitySchema>;

export type ChangeAvailabilitySchema = z.output<typeof changeAvailabilitySchema>;

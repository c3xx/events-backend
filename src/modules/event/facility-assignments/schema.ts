import z from "zod";
import { idLike } from "@/lib/helpers.js";

export const assignEventFacilitySchema = z
	.object({
		facilityId: idLike("Invalid facility ID"),
		venueAllotmentId: idLike("Invalid venue allotment ID").nullish(),
	})
	.strict();

export const eventFacilityScopedSchema = z
	.object({
		eventFacilityId: idLike("Invalid facility assignment ID"),
	})
	.strict();

export type AssignEventFacilitySchema = z.output<typeof assignEventFacilitySchema>;
export type EventFacilityScopedSchema = z.output<typeof eventFacilityScopedSchema>;

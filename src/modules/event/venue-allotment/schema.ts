import z from "zod";

export const createVenueAllotmentSchema = z
	.object({
		venueId: z.coerce.number({ error: "Invalid venue ID" }).int({ error: "Invalid venue ID" }),
		startsAt: z.iso.datetime({ offset: true }),
		endsAt: z.iso.datetime({ offset: true }),
	})
	.refine((d) => new Date(d.startsAt) < new Date(d.endsAt), {
		error: "Event cannot end before it starts",
	})
	.strict();

export type CreateVenueAllotmentSchema = z.output<typeof createVenueAllotmentSchema>;

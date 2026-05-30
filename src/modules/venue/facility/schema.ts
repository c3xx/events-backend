import z from "zod";

export const setVenueFacilitiesSchema = z
	.object({
		facilityId: z.array(
			z.coerce.number({ error: "Invalid facility ID" }).int({ error: "Invalid facility ID" }),
			{ error: "Invalid set of facility IDs" },
		),
	})
	.strict();

export type SetVenueFacilitiesSchema = z.output<typeof setVenueFacilitiesSchema>;

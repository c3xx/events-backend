import z from "zod";

export const allowedParentParamsSchema = z
	.object({
		id: z.coerce.number({ error: "Invalid event type ID" }).int({ error: "Invalid event type ID" }),
		childId: z.coerce
			.number({ error: "Invalid child event type ID" })
			.int({ error: "Invalid child event type ID" }),
	})
	.strict();

export type AllowedParentParamsSchema = z.output<typeof allowedParentParamsSchema>;

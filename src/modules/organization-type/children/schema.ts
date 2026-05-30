import z from "zod";

export const addAllowedParentParamsSchema = z
	.object({
		id: z.coerce
			.number({ error: "Invalid organization type ID" })
			.int({ error: "Invalid organization type ID" }),
		childId: z.coerce
			.number({ error: "Invalid child organization type ID" })
			.int({ error: "Invalid child organization type ID" }),
	})
	.strict();

export type AddAllowedParentParamsSchema = z.output<typeof addAllowedParentParamsSchema>;

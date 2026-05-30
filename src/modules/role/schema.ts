import z from "zod";

export const roleScopedSchema = z
	.object({
		id: z.coerce.number({ error: "Invalid role ID" }).int({ error: "Invalid role ID" }),
	})
	.strict();

export type RoleScopedSchema = z.output<typeof roleScopedSchema>;

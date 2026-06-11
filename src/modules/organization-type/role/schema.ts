import z from "zod";

export const createOrganizationTypeRoleSchema = z
	.object({
		name: z
			.string({ error: "Invalid role name" })
			.trim()
			.nonempty({ error: "Name must not be empty" })
			.max(256, { error: "Name cannot be longer than 256 characters" }),
	})
	.strict();

export type CreateOrganizationTypeRoleSchema = z.output<typeof createOrganizationTypeRoleSchema>;

import z from "zod";

export const createOrganizationSchema = z
	.object({
		name: z
			.string({ error: "Invalid name value" })
			.trim()
			.nonempty({ error: "Name cannot be empty" })
			.max(256, { error: "Name cannot exceed 256 characters" }),
		organizationTypeId: z.int({ error: "Invalid organization type ID" }),
		parentOrganizationId: z.int({ error: "Invalid organization ID" }).nullish(), // note: do this everywhere
	})
	.strict();

export const organizationScopedSchema = z
	.object({
		id: z.coerce
			.number({ error: "Invalid organization ID" })
			.int({ error: "Invalid organization ID" }),
	})
	.strict();

export type CreateOrganizationSchema = z.output<typeof createOrganizationSchema>;
export type OrganizationScopedSchema = z.output<typeof organizationScopedSchema>;

export const updateOrganizationSchema = z
	.object({
		name: z
			.string({ error: "Invalid name value" })
			.trim()
			.nonempty({ error: "Name cannot be empty" })
			.max(256, { error: "Name cannot exceed 256 characters" })
			.optional(),
		isActive: z.boolean({ error: "isActive must be a boolean" }).optional(),
	})
	.strict()
	.refine((data) => data.name !== undefined || data.isActive !== undefined, {
		error: "At least one field must be provided",
	});

export type UpdateOrganizationSchema = z.output<typeof updateOrganizationSchema>;

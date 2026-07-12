import z from "zod";

export const createEventCategorySchema = z.object({
	name: z
		.string({ error: "Expected a string as category name" })
		.trim()
		.min(3, { error: "Name is too short" })
		.max(256, { error: "Name cannot be longer than 256 characters" }),
});

export const updateEventCategorySchema = z
	.object({
		name: z
			.string({ error: "Expected a string as category name" })
			.trim()
			.min(3, { error: "Name is too short" })
			.max(256, { error: "Name cannot be longer than 256 characters" })
			.optional(),
		isActive: z.boolean({ error: "isActive must be a boolean" }).optional(),
	})
	.strict()
	.refine((d) => d.name !== undefined || d.isActive !== undefined, {
		error: "At least one of name or isActive must be provided",
	});

export const eventCategoryScopedSchema = z
	.object({
		id: z
			.coerce.number({ error: "Invalid category ID" })
			.int({ error: "Invalid category ID" }),
	})
	.strict();

export type CreateEventCategorySchema = z.output<typeof createEventCategorySchema>;
export type UpdateEventCategorySchema = z.output<typeof updateEventCategorySchema>;

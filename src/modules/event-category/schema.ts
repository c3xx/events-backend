import z from "zod";

export const createEventCategorySchema = z.object({
	name: z
		.string({ error: "Expected a string as category name" })
		.trim()
		.min(3, { error: "Name is too short" })
		.max(256, { error: "Name cannot be longer than 256 characters" }),
});

export type CreateEventCategorySchema = z.output<typeof createEventCategorySchema>;

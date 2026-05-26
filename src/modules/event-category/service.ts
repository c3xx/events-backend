import * as repository from "./repository.js";
import type * as schema from "./schema.js";

export async function createEventCategory(input: schema.CreateEventCategorySchema) {
	return await repository.insert({ name: input.name });
}

export async function getEventCategories() {
	return await repository.findMany();
}

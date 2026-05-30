import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function createEventCategory(input: schemas.CreateEventCategorySchema) {
	return await repository.insert({ name: input.name });
}

export async function getEventCategories() {
	return await repository.findMany();
}

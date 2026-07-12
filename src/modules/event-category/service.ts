import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function createEventCategory(input: schemas.CreateEventCategorySchema) {
	return await repository.insert({ name: input.name });
}

export async function getEventCategories() {
	return await repository.findMany();
}

export async function updateEventCategory(id: number, input: schemas.UpdateEventCategorySchema) {
	const updated = await repository.updateEventCategory(id, input);
	if (updated == null) throw new NotFoundError("Event category not found");
	return updated;
}

export async function deleteEventCategory(id: number) {
	const result = await repository.deleteEventCategory(id);
	if ((result.rowCount ?? 0) === 0) throw new NotFoundError("Event category not found");
	return result;
}

import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getEventTypes() {
	return await repository.getEventTypes();
}

export async function getEventType(eventTypeId: number) {
	const eventType = await repository.getEventType(eventTypeId);
	if (eventType == null) throw new NotFoundError("Event type not found");
	return eventType;
}

export async function createEventType(input: schemas.CreateEventTypeSchema) {
	return await repository.createEventType({
		name: input.name,
		workflowTemplateId: input.workflowTemplateId,
		venuePolicy: input.venuePolicy,
		collaborationPolicy: input.collaborationPolicy,
	});
}

export async function updateEventType(id: number, input: schemas.UpdateEventTypeSchema) {
	const updated = await repository.updateEventType(id, input);
	if (updated == null) throw new NotFoundError("Event type not found");
	return updated;
}

export async function deleteEventType(eventTypeId: number) {
	const result = await repository.deleteEventType(eventTypeId);
	if ((result.rowCount ?? 0) === 0) throw new NotFoundError("Event type not found");
	return result;
}

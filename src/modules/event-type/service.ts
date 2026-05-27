import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type { AllowedParentParamsSchema, CreateEventTypeSchema } from "./schema.js";

export async function getEventTypes() {
	return await repository.getEventTypes();
}

export async function getEventType(eventTypeId: number) {
	const eventType = await repository.getEventType(eventTypeId);
	if (eventType == null) throw new NotFoundError("Event type not found");
	return eventType;
}

export async function createEventType(input: CreateEventTypeSchema) {
	return await repository.createEventType({
		name: input.name,
		workflowTemplateId: input.workflowTemplateId,
		venuePolicy: input.venuePolicy,
		collaborationPolicy: input.collaborationPolicy,
	});
}

export async function deleteEventType(eventTypeId: number) {
	const result = await repository.deleteEventType(eventTypeId);
	if ((result.rowCount ?? 0) === 0) throw new NotFoundError("Event type not found");
	return result;
}

export async function getEventTypeChildTypes(parentEventTypeId: number) {
	return await repository.getEventTypeChildTypes(parentEventTypeId);
}

export async function addAllowedChildType(input: AllowedParentParamsSchema) {
	return await repository.addAllowedChildType({
		parentTypeId: input.id,
		childTypeId: input.childId,
	});
}

export async function removeAllowedChildType(input: AllowedParentParamsSchema) {
	return await repository.removeAllowedChildType({
		parentTypeId: input.id,
		childTypeId: input.childId,
	});
}

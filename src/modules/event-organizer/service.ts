import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import * as eventRepository from "@/modules/event/repository.js"; //expected in event!
import * as repository from "./repository.js";
import type { AddEventOrganizerSchema } from "./schema.js";

export async function getEventOrganizers(eventId: number) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");
	return await repository.getEventOrganizers(eventId);
}

export async function addEventOrganizer(eventId: number, input: AddEventOrganizerSchema) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	if (event.status !== "draft") {
		throw new ForbiddenError("Organizers can be added only at draft stage");
	}

	const existing = await repository.findEventOrganizersByOrganizationId(eventId, input.organizationId);
	if (existing != null) {
		throw new ConflictError("Organization is already an organizer of the event");
	}
	
	return await repository.addEventOrganizer({
		eventId,
		organizationId: input.organizationId,
		role: input.role,
	});
}

export async function removeEventOrganizer(eventId: number, organizerId: number) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	if (event.status !== "draft") {
		throw new ForbiddenError("Organizers can only be removed during draft stage");
	}

	const organizer = await repository.findEventOrganizer(eventId, organizerId);
	if (organizer == null) {
		throw new NotFoundError("Organizer not found");
	}

	if (organizer.role === "host") {
		throw new ConflictError("Cannot remove host of the event");
	}

	return await repository.removeEventOrganizer(organizerId);
}

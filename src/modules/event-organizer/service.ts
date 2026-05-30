import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import * as eventRepository from "@/modules/event/repository.js"; //expected in event!
import * as invitationRepository from "@/modules/event-organizer-invitation/repository.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type { AddEventOrganizerSchema, RemoveEventOrganizerSchema } from "./schema.js";

export async function getEventOrganizers(eventId: number) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");
	return await repository.getEventOrganizers(eventId);
}

export async function addEventOrganizer(
	eventId: number,
	input: AddEventOrganizerSchema,
	user: { id: number; type: UserType },
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	if (event.status !== "draft") {
		throw new ForbiddenError("Organizers can be added only at draft stage");
	}
	const eventOrganizer = await invitationRepository.findEventOrganizerUser(
		eventId,
		user.id,
		input.userRoleId,
	);
	if (eventOrganizer == null) {
		throw new ForbiddenError("Your organization is not an organizer of this event");
	}

	const canAdd = await hasPermissionInManagedEntity(
		user,
		"organization",
		[eventOrganizer.organizationId],
		"event_organizer:add",
	);
	if (!canAdd) {
		throw new ForbiddenError("You do not have permission to add an organizer");
	}
	const existing = await repository.findEventOrganizersByOrganizationId(
		eventId,
		input.organizationId,
	);
	if (existing != null) {
		throw new ConflictError("Organization is already an organizer of the event");
	}

	return await repository.addResourceProvider({
		eventId,
		organizationId: input.organizationId,
	});
}

export async function removeEventOrganizer(
	eventId: number,
	organizerId: number,
	input: RemoveEventOrganizerSchema,
	user: { id: number; type: UserType },
) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	if (event.status !== "draft") {
		throw new ForbiddenError("Organizers can only be removed during draft stage");
	}

	const organizer = await repository.findEventOrganizer(organizerId);
	if (organizer == null) {
		throw new NotFoundError("Organizer not found");
	}

	if (organizer.role === "host") {
		throw new ConflictError("Cannot remove host of the event");
	}
	const eventOrganizer = await invitationRepository.findEventOrganizerUser(
		eventId,
		user.id,
		input.userRoleId,
	);
	if (eventOrganizer == null) {
		throw new ForbiddenError("Your organization is not an organizer of this event");
	}

	const canRemove = await hasPermissionInManagedEntity(
		user,
		"organization",
		[eventOrganizer.organizationId],
		"event_organizer:remove",
	);
	if (!canRemove) {
		throw new ForbiddenError("You do not have permission to remove an organizer");
	}
	return await repository.removeEventOrganizer(organizerId);
}

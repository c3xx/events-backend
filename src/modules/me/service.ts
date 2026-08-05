import { NotFoundError } from "@/lib/errors.js";
import { dateKey } from "@/lib/helpers.js";
import * as userRepository from "@/modules/user/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getUserDetails(user: AuthenticatedUser): Promise<Frontend.AuthenticatedUser> {
	const details = await userRepository.getFullUser(user.id);
	if (details == null) throw new NotFoundError("User not found");
	return details;
}

export async function getEventCreatableOrganizations(user: AuthenticatedUser) {
	return await userRepository.getUserOrganizations(user.id, "event:manage");
}

export async function updateProfile(userId: number, input: schemas.UpdateProfileSchema) {
	const result = await userRepository.updateUser(userId, { fullName: input.fullName });
	if (result == null) throw new NotFoundError("User not found");
}

export async function getCalendar(params: schemas.GetCalendarParamsSchema) {
	const firstDate = params.start ?? new Date();
	firstDate.setHours(0, 0, 0, 0);

	const events = await repository.getCalendarEvents({
		startDate: firstDate.toISOString(),
		nextDays: params.next,
		venueId: params.venueId,
		status: params.status,
	});

	if (events.length === 0) return [];

	const lastDate = new Date(firstDate);
	lastDate.setDate(lastDate.getDate() + params.next);
	lastDate.setHours(23, 59, 59, 999);

	const grouped: Record<
		string,
		{
			utcDate: string;
			events: CalculatedCalendarDayEvent[];
		}
	> = {};

	for (const event of events) {
		const startsAt = new Date(event.startsAt);
		const endsAt = new Date(event.endsAt);

		if (
			(startsAt < firstDate && endsAt < firstDate) ||
			(startsAt > lastDate && endsAt > lastDate)
		) {
			// event timings outside the range.
			continue;
		}

		const currentDate = new Date(event.startsAt);

		do {
			const dayStartsAt = new Date(currentDate);
			dayStartsAt.setHours(0, 0, 0, 0);

			const dayEndsAt = new Date(currentDate);
			dayEndsAt.setHours(23, 59, 59, 999);

			// if currentdate is not within the wanted range:

			// move forward until the current date comes within the range
			if (dayEndsAt < firstDate) {
				currentDate.setDate(currentDate.getDate() + 1); // go next day
				continue;
			}

			// if this day is not within the last date
			if (dayStartsAt > endsAt || dayStartsAt > lastDate) break;

			const calculatedEvent: CalculatedCalendarDayEvent = {
				id: event.id,
				title: event.title,
				status: event.status,
				category: event.category,
				startsAt: event.startsAt,
				endsAt: event.endsAt,
				timings: {
					startsAt: event.startsAt,
					endsAt: event.endsAt,
				},
				hostOrganization: event.hostOrganization,
				parentEvent: event.parentEvent,
				venueAllotments: [], // filled later
				allVenueAllotments: event.venueAllotments,
			};

			const currentDateKey = dateKey(currentDate);
			grouped[currentDateKey] ??= {
				utcDate: currentDateKey,
				events: [],
			};

			if (currentDateKey === dateKey(startsAt)) {
				// if this is the starting day
				calculatedEvent.timings.startsAt = event.startsAt;
			} else {
				// if its not the starting day, its just starts at 00:00
				calculatedEvent.timings.startsAt = dayStartsAt.toISOString();
			}

			if (currentDateKey === dateKey(endsAt)) {
				// last day!
				calculatedEvent.timings.endsAt = event.endsAt;
			} else {
				// not the last day, so go to 23:59
				calculatedEvent.timings.endsAt = dayEndsAt.toISOString();
			}

			for (const venueAllotment of event.venueAllotments) {
				const allotmentStartsAt = new Date(venueAllotment.startsAt);
				const allotmentEndsAt = new Date(venueAllotment.endsAt);

				if (allotmentStartsAt > dayEndsAt) {
					// if the allotment starts after the day ends, meaning, this day has no allotment.
					continue;
				}
				// same but written separately for understanding:
				if (allotmentEndsAt < dayStartsAt) {
					// if the allotment ends even before the day starts = this day is not involved.
					continue;
				}

				const calculatedAllotment: CalculatedCalendarDayEvent["venueAllotments"][number] = {
					id: venueAllotment.id,
					venue: venueAllotment.venue,
					startsAt: venueAllotment.startsAt,
					endsAt: venueAllotment.endsAt,
					timings: {
						startsAt: venueAllotment.startsAt,
						endsAt: venueAllotment.endsAt,
					},
				};

				let start: Date = allotmentStartsAt;
				let end: Date = allotmentEndsAt;

				if (allotmentEndsAt > dayEndsAt) {
					// the allotment ends someday after today. so it goes until 23:59
					end = dayEndsAt;
				}

				if (allotmentStartsAt < dayStartsAt) {
					// the allotment has started even before the day has begun, so 00:00
					start = dayStartsAt;
				}

				calculatedAllotment.timings.startsAt = start.toISOString();
				calculatedAllotment.timings.endsAt = end.toISOString();

				calculatedEvent.venueAllotments.push(calculatedAllotment);
			}

			grouped[currentDateKey].events.push(calculatedEvent);

			currentDate.setDate(currentDate.getDate() + 1); // go next day
		} while (currentDate <= lastDate);
	}

	return Object.entries(grouped)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([, data]) => data);
}

import { db, schema } from "@/db/index.js";
import { ConflictError, NotFoundError } from "@/lib/errors.js";
import { dbAction, unreachable } from "@/lib/helpers.js";
import { and, eq, exists, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const createEvent = dbAction(
	async (data: {
		organizationId: number;
		eventTitle: string;
		eventTypeId: number;
		expectedParticipants: number;
		requestDetails: string;
		startsAt: string;
		endsAt: string;
		parentEventId: number | null | undefined;
	}) => {
		return await db.transaction(async (tx) => {
			const [eventInserted] = await tx
				.insert(schema.event)
				.values({
					eventTitle: data.eventTitle,
					eventTypeId: data.eventTypeId,
					expectedParticipants: data.expectedParticipants,
					requestDetails: data.requestDetails,
					status: "draft",
					startsAt: data.startsAt,
					endsAt: data.endsAt,
					parentEventId: data.parentEventId,
				})
				.returning({ id: schema.event.id });
			if (eventInserted == null) unreachable();
			const [oraganizerInsert] = await tx
				.insert(schema.eventOrganizer)
				.values({
					eventId: eventInserted.id,
					organizationId: data.organizationId,
					role: "host",
				})
				.returning({ id: schema.eventOrganizer.id });
			if (oraganizerInsert == null) unreachable();
			return eventInserted;
		});
	},
);

export const findEvents = dbAction(
	async (filter: {
		status?: EventStatus[] | undefined;
		eventTypeId?: number | undefined;
		viewAll?: boolean | undefined;
		viewAllConfirmed?: boolean | undefined;
		orgIds?: number[] | undefined;
	}) => {
		const baseConditions: SQL[] = [isNull(schema.event.deletedAt)];

		if (filter.eventTypeId !== undefined) {
			baseConditions.push(eq(schema.event.eventTypeId, filter.eventTypeId));
		}

		const accessConditions: SQL[] = [];

		if (filter.viewAll && filter.status && filter.status.length > 0) {
			accessConditions.push(inArray(schema.event.status, filter.status));
		}

		if (filter.viewAllConfirmed) {
			accessConditions.push(eq(schema.event.status, "completed" as const));
		}

		if (filter.orgIds && filter.orgIds.length > 0) {
			const orgExists = exists(
				db
					.select({ _: sql`1` })
					.from(schema.eventOrganizer)
					.where(
						and(
							eq(schema.eventOrganizer.eventId, schema.event.id),
							inArray(schema.eventOrganizer.organizationId, filter.orgIds),
							isNull(schema.eventOrganizer.deletedAt),
						),
					),
			);

			if (filter.status && filter.status.length > 0) {
				const statusCondition = inArray(schema.event.status, filter.status);
				accessConditions.push(and(statusCondition, orgExists) ?? orgExists);
			} else {
				accessConditions.push(orgExists);
			}
		}

		const where =
			accessConditions.length > 0
				? and(...baseConditions, or(...accessConditions))
				: and(...baseConditions);

		const rows = await db.query.event.findMany({
			where,
			columns: {
				id: true,
				eventTitle: true,
				status: true,
				parentEventId: true,
				startsAt: true,
			},
			with: {
				eventType: {
					columns: { id: true, name: true },
				},
				parentEvent: {
					columns: { id: true, eventTitle: true },
				},
				organizers: {
					where: isNull(schema.eventOrganizer.deletedAt),
					columns: { role: true },
					with: {
						organization: {
							columns: { id: true, name: true },
						},
					},
				},
			},
			orderBy: schema.event.startsAt,
		});

		return rows.map((event) => ({
			id: event.id,
			eventTitle: event.eventTitle,
			eventType: { id: event.eventType.id, name: event.eventType.name },
			status: event.status,
			parentEvent: event.parentEvent
				? { id: event.parentEvent.id, eventTitle: event.parentEvent.eventTitle }
				: null,
			startsAt: event.startsAt,
			organizers: event.organizers.map((o) => ({
				organizerId: o.organization.id,
				organizerName: o.organization.name,
				organizerType: o.role,
			})),
		}));
	},
);

export const findEventById = dbAction(async (eventId: number) => {
	const event = await db.query.event.findFirst({
		where: and(eq(schema.event.id, eventId), isNull(schema.event.deletedAt)),
		columns: {
			id: true,
			eventTitle: true,
			expectedParticipants: true,
			requestDetails: true,
			status: true,
			parentEventId: true,
			startsAt: true,
			endsAt: true,
			createdAt: true,
			updatedAt: true,
		},
		with: {
			eventType: {
				columns: { id: true, name: true },
			},
			parentEvent: {
				columns: { id: true, eventTitle: true },
			},
			organizers: {
				where: isNull(schema.eventOrganizer.deletedAt),
				columns: { role: true },
				with: {
					organization: {
						columns: { id: true, name: true },
					},
				},
			},
			venueAllotments: {
				where: isNull(schema.venueAllotment.deletedAt),
				columns: { id: true, startsAt: true, endsAt: true },
				with: {
					venue: {
						columns: { id: true, name: true },
					},
				},
			},
			report: {
				columns: { id: true, details: true, submittedAt: true },
			},
		},
	});

	return event ?? null;
});

export const findEventOrganizerOrgIds = dbAction(async (eventId: number) => {
	const rows = await db
		.select({ organizationId: schema.eventOrganizer.organizationId })
		.from(schema.eventOrganizer)
		.where(
			and(eq(schema.eventOrganizer.eventId, eventId), isNull(schema.eventOrganizer.deletedAt)),
		);
	return rows.map((r) => r.organizationId);
});

export const updateEvent = dbAction(
	async (data: {
		eventId: number;
		eventTitle?: string | undefined;
		eventTypeId?: number | undefined;
		expectedParticipants?: number | undefined;
		requestDetails?: string | undefined;
		parentEventId?: number | null | undefined;
		startsAt?: string | undefined;
		endsAt?: string | undefined;
	}) => {
		const [updated] = await db
			.update(schema.event)
			.set({
				eventTitle: data.eventTitle,
				eventTypeId: data.eventTypeId,
				expectedParticipants: data.expectedParticipants,
				requestDetails: data.requestDetails,
				parentEventId: data.parentEventId,
				startsAt: data.startsAt,
				endsAt: data.endsAt,
			})
			.where(
				and(
					eq(schema.event.id, data.eventId),
					eq(schema.event.status, "draft"),
					isNull(schema.event.deletedAt),
				),
			)
			.returning({ id: schema.event.id });
		if (updated != null) return updated;

		const [existing] = await db
			.select({ status: schema.event.status })
			.from(schema.event)
			.where(and(eq(schema.event.id, data.eventId), isNull(schema.event.deletedAt)))
			.limit(1);

		if (existing == null) throw new NotFoundError("Event not found");
		throw new ConflictError("Only draft events can be updated");
	},
);

// export const getOrganizationEvents = dbAction(async (organizationId: number) => {
// 	return await db
// 		.select({
// 			id: schema.event.id,
// 			eventTitle: schema.event.eventTitle,
// 			eventType: schema.eventType.name,
// 			status: schema.event.status,
// 			parentEventId: schema.event.parentEventId,
// 			parentEventTitle: parentEvent.eventTitle,
// 			startsAt: schema.event.startsAt,
// 		})
// 		.from(schema.eventOrganizer)
// 		.innerJoin(schema.event, eq(schema.eventOrganizer.eventId, schema.event.id))
// 		.innerJoin(schema.eventType, eq(schema.event.eventTypeId, schema.eventType.id))
// 		.leftJoin(parentEvent, eq(schema.event.parentEventId, parentEvent.id))
// 		.where(eq(schema.eventOrganizer.organizationId, organizationId))
// 		.orderBy(schema.event.startsAt);
// });

export async function findOverlappingVenueAllotments(
	allotments: { venueId: number; startsAt: string; endsAt: string }[],
) {
	if (allotments.length === 0) return [];

	const conflictConditions = allotments.map((a) =>
		and(
			eq(schema.venueAllotment.venueId, a.venueId),
			lt(schema.venueAllotment.startsAt, a.endsAt),
			gt(schema.venueAllotment.endsAt, a.startsAt),
			isNull(schema.venueAllotment.deletedAt),
		),
	);

	return await db
		.select({
			venue: { id: schema.venue.id, name: schema.venue.name },
			event: { id: schema.event.id, eventTitle: schema.event.eventTitle },
			startsAt: schema.venueAllotment.startsAt,
			endsAt: schema.venueAllotment.endsAt,
		})
		.from(schema.venueAllotment)
		.innerJoin(schema.venue, eq(schema.venueAllotment.venueId, schema.venue.id))
		.innerJoin(schema.event, eq(schema.venueAllotment.eventId, schema.event.id))
		.where(or(...conflictConditions));
}

export async function insertVenueAllotments(
	eventId: number,
	allotments: { venueId: number; startsAt: string; endsAt: string }[],
) {
	const valuesToInsert = allotments.map((a) => ({
		venueId: a.venueId,
		eventId: eventId,
		startsAt: a.startsAt,
		endsAt: a.endsAt,
	}));

	return await db
		.insert(schema.venueAllotment)
		.values(valuesToInsert)
		.returning({ id: schema.venueAllotment.id });
}

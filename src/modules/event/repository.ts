import type { SQL } from "drizzle-orm";
import { and, eq, exists, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const createEvent = dbAction(
	async (data: {
		organizationId: number;
		title: string;
		typeId: number;
		categoryId: number;
		expectedParticipants: number;
		requestDetails: string;
		startsAt: string;
		endsAt: string;
		parentEventId: number | null | undefined;
		createdBy: number;
	}) => {
		return await db.transaction(async (tx) => {
			const [event] = await tx
				.insert(schema.event)
				.values({
					title: data.title,
					typeId: data.typeId,
					categoryId: data.categoryId,
					expectedParticipants: data.expectedParticipants,
					requestDetails: data.requestDetails,
					status: "draft",
					startsAt: data.startsAt,
					endsAt: data.endsAt,
					parentEventId: data.parentEventId,
					createdBy: data.createdBy,
				})
				.returning({
					id: schema.event.id,
				});
			if (event == null) unreachable();

			const [organizer] = await tx
				.insert(schema.eventOrganizer)
				.values({
					eventId: event.id,
					organizationId: data.organizationId,
					role: "host",
				})
				.returning({ id: schema.eventOrganizer.id });
			if (organizer == null) unreachable();

			return event;
		});
	},
);

export const findEvents = dbAction(
	async (filter: {
		status?: EventStatus[] | undefined;
		typeId?: number | undefined;
		viewAll?: boolean | undefined;
		viewAllNonDraft?: boolean | undefined;
		viewAllConfirmed?: boolean | undefined;
		orgIds?: number[] | undefined;
	}) => {
		const baseConditions: SQL[] = [isNull(schema.event.deletedAt)];

		if (filter.typeId !== undefined) {
			baseConditions.push(eq(schema.event.typeId, filter.typeId));
		}

		// Wraps a condition with an optional status filter on top
		const withStatusFilter = (condition: SQL): SQL => {
			if (filter.status && filter.status.length > 0) {
				return and(condition, inArray(schema.event.status, filter.status)) as SQL;
			}
			return condition;
		};

		// Each item here is an OR branch — user sees events matching any one of these
		const accessConditions: SQL[] = [];

		if (filter.viewAll && filter.status && filter.status.length > 0) {
			// Admin-like: see all events but filtered by status
			accessConditions.push(inArray(schema.event.status, filter.status));
		} else if (filter.viewAllNonDraft) {
			// Can see everything except drafts
			accessConditions.push(withStatusFilter(ne(schema.event.status, "draft" as const)));
		} else if (filter.viewAllConfirmed) {
			// Can only see completed events
			accessConditions.push(eq(schema.event.status, "approved" as const));
		}

		if (filter.orgIds && filter.orgIds.length > 0) {
			// User's orgs: show events where their org is an organizer
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
			accessConditions.push(withStatusFilter(orgExists));
		}

		// Base conditions always apply; access is granted if any OR branch matches
		const where =
			accessConditions.length > 0
				? and(...baseConditions, or(...accessConditions))
				: and(...baseConditions);

		const rows = await db.query.event.findMany({
			where,
			columns: {
				id: true,
				title: true,
				status: true,
				parentEventId: true,
				startsAt: true,
			},
			with: {
				type: {
					columns: { id: true, name: true },
				},
				category: {
					columns: { id: true, name: true },
				},
				parentEvent: {
					columns: { id: true, title: true },
				},
				organizers: {
					where: isNull(schema.eventOrganizer.deletedAt),
					columns: { id: true, role: true },
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
			title: event.title,
			type: { id: event.type.id, name: event.type.name },
			category: { id: event.category.id, name: event.category.name },
			status: event.status,
			parentEvent: event.parentEvent
				? { id: event.parentEvent.id, title: event.parentEvent.title }
				: null,
			startsAt: event.startsAt,
			organizers: event.organizers.map((o) => ({
				id: o.id,
				organization: {
					id: o.organization.id,
					name: o.organization.name,
				},
				role: o.role,
			})),
		}));
	},
);

export const findEventById = dbAction(async (eventId: number) => {
	const event = await db.query.event.findFirst({
		where: and(eq(schema.event.id, eventId), isNull(schema.event.deletedAt)),
		columns: {
			id: true,
			title: true,
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
			type: {
				columns: { id: true, name: true },
			},
			category: {
				columns: { id: true, name: true },
			},
			parentEvent: {
				columns: { id: true, title: true },
			},
			organizers: {
				where: isNull(schema.eventOrganizer.deletedAt),
				columns: { id: true, role: true },
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

	return event;
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
		id: number;
		title?: string | undefined;
		typeId?: number | undefined;
		categoryId?: number | undefined;
		expectedParticipants?: number | undefined;
		requestDetails?: string | undefined;
		parentEventId?: number | null | undefined;
		startsAt?: string | undefined;
		endsAt?: string | undefined;
	}) => {
		const [updated] = await db
			.update(schema.event)
			.set({
				title: data.title,
				typeId: data.typeId,
				categoryId: data.categoryId,
				expectedParticipants: data.expectedParticipants,
				requestDetails: data.requestDetails,
				parentEventId: data.parentEventId,
				startsAt: data.startsAt,
				endsAt: data.endsAt,
			})
			.where(
				and(
					eq(schema.event.id, data.id),
					eq(schema.event.status, "draft"),
					isNull(schema.event.deletedAt),
				),
			)
			.returning({ id: schema.event.id });
		if (updated != null) return updated;

		const [existing] = await db
			.select({ eventExist: sql`1` })
			.from(schema.event)
			.where(and(eq(schema.event.id, data.id), isNull(schema.event.deletedAt)))
			.limit(1);
		return existing;
	},
);

export const getParentable = dbAction(async (data: { typeId: number; organizationId: number }) => {
	return await db
		.select({ id: schema.event.id, title: schema.event.title })
		.from(schema.event)
		.innerJoin(
			schema.eventOrganizer,
			and(
				eq(schema.event.id, schema.eventOrganizer.eventId),
				eq(schema.eventOrganizer.organizationId, data.organizationId),
				inArray(schema.eventOrganizer.role, ["host", "co_host"] as const),
				isNull(schema.eventOrganizer.deletedAt),
			),
		)
		.innerJoin(
			schema.eventTypeAllowedParent,
			and(
				eq(schema.eventTypeAllowedParent.parentTypeId, schema.event.typeId),
				eq(schema.eventTypeAllowedParent.childTypeId, data.typeId),
			),
		)
		.where(
			and(
				eq(schema.event.status, "approved" as const),
				gt(schema.event.endsAt, sql`now()`),
				isNull(schema.event.deletedAt),
			),
		);
});

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

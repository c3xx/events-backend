import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
		organizationIds: number[];
		status?: EventStatus[] | undefined;
		typeId?: number | undefined;
	}) => {
		const parentEvent = alias(schema.event, "parentEvent");

		return await db
			.select({
				id: schema.event.id,
				title: schema.event.title,
				status: schema.event.status,
				startsAt: schema.event.startsAt,
				type: {
					id: schema.eventType.id,
					name: schema.eventType.name,
				},
				category: {
					id: schema.eventCategory.id,
					name: schema.eventCategory.name,
				},
				parentEvent: {
					id: parentEvent.id,
					title: parentEvent.title,
				},
				organizers: sql<
					{
						id: number;
						role: EventOrganizerRole;
						organization: {
							id: number;
							name: string;
						};
					}[]
				>`json_agg(json_build_object('id', ${schema.eventOrganizer.id}, 'role', ${schema.eventOrganizer.role}, 'organization', json_build_object('id', ${schema.organization.id}, 'name', ${schema.organization.name})))`,
			})
			.from(schema.event)
			.innerJoin(schema.eventCategory, eq(schema.event.categoryId, schema.eventCategory.id))
			.innerJoin(schema.eventType, eq(schema.event.typeId, schema.eventType.id))
			.leftJoin(parentEvent, eq(schema.event.parentEventId, parentEvent.id))
			.innerJoin(
				schema.eventOrganizer,
				and(
					eq(schema.eventOrganizer.eventId, schema.event.id),
					isNull(schema.eventOrganizer.deletedAt),
				),
			)
			.innerJoin(
				schema.organization,
				and(
					eq(schema.organization.id, schema.eventOrganizer.organizationId),
					isNull(schema.organization.deletedAt),
				),
			)
			.where(
				and(
					inArray(
						schema.organization.id,
						filter.organizationIds,
						// db
						// 	.selectDistinct({ id: schema.organization.id })
						// 	.from(schema.userRole)
						// 	.innerJoin(
						// 		schema.managedEntity,
						// 		and(
						// 			eq(schema.managedEntity.id, schema.userRole.managedEntityId),
						// 			eq(schema.managedEntity.managedEntityType, "organization"),
						// 		),
						// 	)
						// 	.innerJoin(
						// 		schema.organization,
						// 		eq(schema.organization.id, schema.managedEntity.refId),
						// 	)
						// 	.where(eq(schema.userRole.userId, 7)),
					),

					filter.status != null ? inArray(schema.event.status, filter.status) : undefined,
					filter.typeId != null ? eq(schema.event.typeId, filter.typeId) : undefined,

					isNull(schema.event.deletedAt),
				),
			)
			.groupBy(schema.event.id, schema.eventType.id, schema.eventCategory.id, parentEvent.id)
			.orderBy(schema.event.startsAt);
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

		if (updated == null) unreachable();

		return updated;
	},
);

export const findParentableEvents = dbAction(
	async (data: { typeId: number; organizationId: number }) => {
		return await db
			.select({ id: schema.event.id, title: schema.event.title })
			.from(schema.event)
			.innerJoin(
				schema.eventOrganizer,
				and(
					eq(schema.event.id, schema.eventOrganizer.eventId),
					eq(schema.eventOrganizer.organizationId, data.organizationId),
					inArray(schema.eventOrganizer.role, ["host", "co_host"]),
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
					eq(schema.event.status, "approved"),
					gt(schema.event.endsAt, sql`now()`),
					isNull(schema.event.deletedAt),
				),
			);
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

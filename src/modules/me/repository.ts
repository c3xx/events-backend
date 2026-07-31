import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { jsonAgg, jsonBuildObject, jsonBuildObjectNullable } from "@/db/helpers.js";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";

export const getCalendarEvents = dbAction(
	async (data: {
		startDate: string;
		nextDays: number;
		venueId?: number | undefined;
		status: ("approved" | "pending")[];
	}) => {
		const parentEvent = alias(schema.event, "parent_event");
		const hostOrganization = alias(schema.organization, "host_organization");
		const hostOrganizationType = alias(schema.organizationType, "host_organization_type");

		return await db
			.select({
				id: schema.event.id,
				title: schema.event.title,
				status: schema.event.status,
				startsAt: schema.event.startsAt,
				endsAt: schema.event.endsAt,
				parentEvent: jsonBuildObjectNullable(
					{
						id: parentEvent.id,
						title: parentEvent.title,
					},
					parentEvent.id,
				),
				hostOrganization: jsonBuildObject({
					id: hostOrganization.id,
					name: hostOrganization.name,
					type: jsonBuildObject({
						id: hostOrganizationType.id,
						name: hostOrganizationType.name,
					}),
				}),
				category: jsonBuildObject({
					id: schema.eventCategory.id,
					name: schema.eventCategory.name,
				}),
				venueAllotments: jsonAgg(
					jsonBuildObject({
						id: schema.venueAllotment.id,
						venue: jsonBuildObject({
							id: schema.venue.id,
							name: schema.venue.name,
							type: jsonBuildObject({
								id: schema.venueType.id,
								name: schema.venueType.name,
							}),
						}),
						startsAt: schema.venueAllotment.startsAt,
						endsAt: schema.venueAllotment.endsAt,
					}),
				),
			})
			.from(schema.event)
			.leftJoin(
				parentEvent,
				and(eq(schema.event.parentEventId, parentEvent.id), isNull(parentEvent.deletedAt)),
			)
			.innerJoin(
				schema.eventOrganizer,
				and(
					eq(schema.event.id, schema.eventOrganizer.eventId),
					eq(schema.eventOrganizer.role, "host"),
					isNull(schema.eventOrganizer.deletedAt),
				),
			)
			.innerJoin(
				hostOrganization,
				and(
					eq(schema.eventOrganizer.organizationId, hostOrganization.id),
					isNull(hostOrganization.deletedAt),
				),
			)
			.innerJoin(
				hostOrganizationType,
				and(
					eq(hostOrganization.organizationTypeId, hostOrganizationType.id),
					isNull(hostOrganizationType.deletedAt),
				),
			)
			.innerJoin(
				schema.eventCategory,
				and(
					eq(schema.event.categoryId, schema.eventCategory.id),
					isNull(schema.eventCategory.deletedAt),
				),
			)
			.innerJoin(
				schema.venueAllotment,
				and(
					data.venueId != null ? eq(schema.venueAllotment.venueId, data.venueId) : undefined,
					eq(schema.venueAllotment.eventId, schema.event.id),
					isNull(schema.venueAllotment.deletedAt),
				),
			)
			.innerJoin(
				schema.venue,
				and(
					eq(schema.venueAllotment.venueId, schema.venue.id),
					isNull(schema.venueAllotment.deletedAt),
				),
			)
			.innerJoin(
				schema.venueType,
				and(eq(schema.venue.venueTypeId, schema.venueType.id), isNull(schema.venueType.deletedAt)),
			)
			.where(
				and(
					gte(schema.event.endsAt, sql`date_trunc('day', ${data.startDate}::timestamptz)`),
					lt(
						schema.event.startsAt,
						sql`date_trunc('day', ${data.startDate}::timestamptz + ${`${data.nextDays}d`}::interval)`,
					),
					inArray(schema.event.status, data.status),
					isNull(schema.event.deletedAt),
				),
			)
			.orderBy(asc(schema.event.startsAt))
			.groupBy(
				schema.event.id,
				parentEvent.id,
				schema.eventCategory.id,
				hostOrganization.id,
				hostOrganizationType.id,
			);
	},
);

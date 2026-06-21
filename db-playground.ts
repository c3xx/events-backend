// @ts-nocheck

import { and, eq, exists, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "./src/db/index.js";
import { getFullUser, getUserOrganizations } from "./src/modules/user/repository.js";
import { loadEnvFile } from "node:process";
import { alias } from "drizzle-orm/pg-core";

const parentEvent = alias(schema.event, "parentEvent");

const result = await db
	.select({
		id: schema.event.id,
		title: schema.event.title,
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
				(await getUserOrganizations(7, "event:view_own")).map((o) => o.id),
			),

			// filters
			// filter.status != null ? inArray(schema.event.status, filter.status) : undefined,
			// filter.typeId != null ? eq(schema.event.typeId, filter.typeId) : undefined,

			isNull(schema.event.deletedAt),
		),
	)
	.groupBy(schema.event.id, schema.eventType.id, schema.eventCategory.id, parentEvent.id)
	.orderBy(schema.event.startsAt);

// console.log(await getFullUser())

// const d = await db
// 	.select({
// 		id: schema.event.id,
// 		title: schema.event.title,
// 	})
// 	.from(schema.event)
// 	.innerJoin(
// 		schema.eventOrganizer,
// 		and(
// 			eq(schema.eventOrganizer.eventId, schema.event.id),
// 			isNull(schema.eventOrganizer.deletedAt)
// 		)
// 	)
// 	.innerJoin(schema.organization, and(
// 		eq(schema.organization.id, schema.eventOrganizer.organizationId),
// 		isNull(schema.organization.deletedAt)
// 	))
// 	.where(and(
// 		inArray(schema.organization.id,
// 			db.selectDistinct({ id: schema.organization.id })
// 				.from(schema.userRole)
// 				.innerJoin(schema.managedEntity, and(
// 					eq(schema.managedEntity.id, schema.userRole.managedEntityId),
// 					eq(schema.managedEntity.managedEntityType, "organization"),
// 				))
// 				.innerJoin(schema.organization, eq(schema.organization.id, schema.managedEntity.refId))
// 				.where(eq(schema.userRole.userId, 13)
// 			)
// 		),
// 		isNull(schema.event.deletedAt)))
// 	.groupBy(schema.event.id)

// console.log(await db.select().from(schema.eventOrganizer))
// console.log(await db.select().from(schema.organization))

// console.dir(await getFullUser(7), { depth: 33 });
// console.dir(await getEventTypes(4), { depth: 33 });

console.dir(result, { depth: 33 });

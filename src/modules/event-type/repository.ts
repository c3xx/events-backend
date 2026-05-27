import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getEventTypes = dbAction(async () => {
	return await db
		.select({
			id: schema.eventType.id,
			name: schema.eventType.name,
			isActive: schema.eventType.isActive,
			venuePolicy: schema.eventType.venuePolicy,
			collaborationPolicy: schema.eventType.collaborationPolicy,
		})
		.from(schema.eventType)
		.where(isNull(schema.eventType.deletedAt))
		.orderBy(schema.eventType.createdAt);
});

export const createEventType = dbAction(
	async (data: {
		name: string;
		venuePolicy: EventTypeVenuePolicy;
		collaborationPolicy: EventTypeCollaborationPolicy;
		workflowTemplateId: number;
	}) => {
		const [inserted] = await db
			.insert(schema.eventType)
			.values({
				name: data.name,
				venuePolicy: data.venuePolicy,
				collaborationPolicy: data.collaborationPolicy,
				workflowTemplateId: data.workflowTemplateId,
			})
			.returning({ id: schema.eventType.id });

		if (inserted == null) unreachable();

		return inserted;
	},
);

export const getEventType = dbAction(async (id: number) => {
	return await db.query.eventType.findFirst({
		where: and(eq(schema.eventType.id, id), isNull(schema.eventType.deletedAt)),
		columns: {
			id: true,
			name: true,
			workflowTemplateId: true,
			isActive: true,
			collaborationPolicy: true,
			venuePolicy: true,
		},
	});
});

export const deleteEventType = dbAction(async (id: number) => {
	const result = await db
		.update(schema.eventType)
		.set({ deletedAt: sql`NOW()` })
		.where(and(eq(schema.eventType.id, id), isNull(schema.eventType.deletedAt)));
	return result;
});

export const getEventTypeChildTypes = dbAction(async (parentEventId: number) => {
	return await db
		.select({ id: schema.eventTypeAllowedParent.childTypeId, name: schema.eventType.name })
		.from(schema.eventTypeAllowedParent)
		.innerJoin(schema.eventType, eq(schema.eventTypeAllowedParent.childTypeId, schema.eventType.id))
		.where(eq(schema.eventTypeAllowedParent.parentTypeId, parentEventId))
		.orderBy(schema.eventTypeAllowedParent.createdAt);
});

export const addAllowedChildType = dbAction(
	async (data: { parentTypeId: number; childTypeId: number }) => {
		const [inserted] = await db
			.insert(schema.eventTypeAllowedParent)
			.values({
				parentTypeId: data.parentTypeId,
				childTypeId: data.childTypeId,
			})
			.returning({
				parentTypeId: schema.eventTypeAllowedParent.parentTypeId,
				childTypeId: schema.eventTypeAllowedParent.childTypeId,
			});

		if (inserted == null) return unreachable();

		return inserted;
	},
);

export const removeAllowedChildType = dbAction(
	async (data: { parentTypeId: number; childTypeId: number }) => {
		await db
			.delete(schema.eventTypeAllowedParent)
			.where(
				and(
					eq(schema.eventTypeAllowedParent.parentTypeId, data.parentTypeId),
					eq(schema.eventTypeAllowedParent.childTypeId, data.childTypeId),
				),
			);
	},
);

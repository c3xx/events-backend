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
			workflowTemplate: sql<{
				id: number;
				name: string;
			}>`json_build_object('id', ${schema.workflowTemplate.id},'name', ${schema.workflowTemplate.name})`.as(
				"workflowTemplate",
			),
		})
		.from(schema.eventType)
		.innerJoin(
			schema.workflowTemplate,
			and(
				eq(schema.workflowTemplate.id, schema.eventType.workflowTemplateId),
				isNull(schema.workflowTemplate.deletedAt),
			),
		)
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

export const getEventType = dbAction(async (eventTypeId: number) => {
	const [eventType] = await db
		.select({
			id: schema.eventType.id,
			name: schema.eventType.name,
			isActive: schema.eventType.isActive,
			venuePolicy: schema.eventType.venuePolicy,
			collaborationPolicy: schema.eventType.collaborationPolicy,
			workflowTemplate: sql<{
				id: number;
				name: string;
			}>`json_build_object('id', ${schema.workflowTemplate.id},'name', ${schema.workflowTemplate.name})`.as(
				"workflowTemplate",
			),
		})
		.from(schema.eventType)
		.innerJoin(
			schema.workflowTemplate,
			and(
				eq(schema.workflowTemplate.id, schema.eventType.workflowTemplateId),
				isNull(schema.workflowTemplate.deletedAt),
			),
		)
		.where(and(eq(schema.eventType.id, eventTypeId), isNull(schema.eventType.deletedAt)));

	return eventType;
});

export const deleteEventType = dbAction(async (id: number) => {
	const result = await db
		.update(schema.eventType)
		.set({ deletedAt: sql`NOW()` })
		.where(and(eq(schema.eventType.id, id), isNull(schema.eventType.deletedAt)));
	return result;
});

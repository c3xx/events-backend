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

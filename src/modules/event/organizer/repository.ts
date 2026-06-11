import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getEventOrganizers = dbAction(async (eventId: number) => {
	return await db.query.eventOrganizer.findMany({
		where: and(isNull(schema.eventOrganizer.deletedAt), eq(schema.eventOrganizer.eventId, eventId)),
		columns: {
			id: true,
			role: true,
		},
		with: {
			organization: {
				columns: {
					id: true,
					name: true,
				},
			},
		},
	});
});

export const insertEventOrganizer = dbAction(
	async (data: { eventId: number; organizationId: number; role: EventOrganizerRole }) => {
		const [inserted] = await db.insert(schema.eventOrganizer).values(data).returning({
			id: schema.eventOrganizer.id,
			role: schema.eventOrganizer.role,
			organizationId: schema.eventOrganizer.organizationId,
		});
		if (inserted == null) unreachable();
		return inserted;
	},
);

export const removeEventOrganizer = dbAction(async (organizerId: number) => {
	await db
		.update(schema.eventOrganizer)
		.set({ deletedAt: new Date().toISOString() })
		.where(eq(schema.eventOrganizer.id, organizerId));
});

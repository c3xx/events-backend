import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";
import { organization } from "@/db/schema.js";

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

export const findEventOrganizer = dbAction(async (organizerId: number, eventId: number) => {
	const [organizer] = await db
		.select({
			id: schema.eventOrganizer.id,
			role: schema.eventOrganizer.role,
			organizationId: schema.eventOrganizer.organizationId,
		})
		.from(schema.eventOrganizer)
		.where(
			and(
				eq(schema.eventOrganizer.id, organizerId),
				eq(schema.eventOrganizer.eventId, eventId),
				isNull(schema.eventOrganizer.deletedAt),
			),
		)
		.limit(1);
	return organizer;
});

export const findEventOrganizersByOrganizationId = dbAction(
	async (eventId: number, organizationId: number) => {
		const [organizer] = await db
			.select({ id: schema.eventOrganizer.id })
			.from(schema.eventOrganizer)
			.where(
				and(
					eq(schema.eventOrganizer.eventId, eventId),
					eq(schema.eventOrganizer.organizationId, organizationId),
					isNull(schema.eventOrganizer.deletedAt),
				),
			)
			.limit(1);
		return organizer;
	},
);

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
	const [removed] = await db
		.update(schema.eventOrganizer)
		.set({ deletedAt: new Date().toISOString() })
		.where(eq(schema.eventOrganizer.id, organizerId))
		.returning({ id: schema.eventOrganizer.id });

	if (removed == null) unreachable();
	return removed;
});

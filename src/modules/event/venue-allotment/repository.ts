import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const insertVenueAllotment = dbAction(
	async (eventId: number, allotments: { venueId: number; startsAt: string; endsAt: string }) => {
		return await db.transaction(async (tx) => {
			const [overlap] = await tx
				.select({
					venue: { id: schema.venue.id, name: schema.venue.name },
					event: { id: schema.event.id, title: schema.event.title },
					startsAt: schema.venueAllotment.startsAt,
					endsAt: schema.venueAllotment.endsAt,
				})
				.from(schema.venueAllotment)
				.innerJoin(schema.venue, eq(schema.venueAllotment.venueId, schema.venue.id))
				.innerJoin(schema.event, eq(schema.venueAllotment.eventId, schema.event.id))
				.where(
					and(
						eq(schema.venueAllotment.venueId, allotments.venueId),
						lt(schema.venueAllotment.startsAt, allotments.endsAt),
						gt(schema.venueAllotment.endsAt, allotments.startsAt),
						or(eq(schema.venueAllotment.eventId, eventId), eq(schema.event.status, "approved")),
						isNull(schema.venueAllotment.deletedAt),
					),
				);

			if (overlap)
				return {
					success: false as const,
					conflict: overlap,
				};

			const [created] = await tx
				.insert(schema.venueAllotment)
				.values({
					eventId: eventId,
					venueId: allotments.venueId,
					startsAt: allotments.startsAt,
					endsAt: allotments.endsAt,
				})
				.returning({ id: schema.venueAllotment.id });
			if (created == null) unreachable();
			return {
				success: true as const,
				id: created.id,
			};
		});
	},
);

export const deleteVenueAllotment = dbAction(async (eventId: number, allotmentId: number) => {
	const [deleted] = await db
		.update(schema.venueAllotment)
		.set({ deletedAt: sql`now()` })
		.where(
			and(
				eq(schema.venueAllotment.id, allotmentId),
				eq(schema.venueAllotment.eventId, eventId),
				isNull(schema.venueAllotment.deletedAt),
			),
		)
		.returning({ id: schema.venueAllotment.id });
	return deleted;
});


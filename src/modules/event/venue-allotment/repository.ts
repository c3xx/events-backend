import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const insertVenueAllotment = dbAction(
	async (
		eventId: number,
		allotment: {
			venueId: number;
			startsAt: string;
			endsAt: string;
		},
	) => {
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
						eq(schema.venueAllotment.venueId, allotment.venueId),
						lt(schema.venueAllotment.startsAt, allotment.endsAt),
						gt(schema.venueAllotment.endsAt, allotment.startsAt),
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
					venueId: allotment.venueId,
					startsAt: allotment.startsAt,
					endsAt: allotment.endsAt,
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

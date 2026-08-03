import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const insertFacilityAssignment = dbAction(
	async (
		eventId: number,
		data: {
			facilityId: number;
			venueAllotmentId?: number | null | undefined;
		},
	) => {
		return await db.transaction(async (tx) => {
			const [facilityInfo] = await tx
				.select({
					id: schema.facility.id,
					overlapPolicy: schema.facility.overlapPolicy,
				})
				.from(schema.facility)
				.where(and(eq(schema.facility.id, data.facilityId), isNull(schema.facility.deletedAt)))
				.limit(1);

			if (facilityInfo == null) return;

			if (facilityInfo.overlapPolicy === "exclusive") {
				const [overlap] = await tx
					.select({
						event: {
							id: schema.event.id,
							title: schema.event.title,
							startsAt: schema.event.startsAt,
							endsAt: schema.event.endsAt,
						},
					})
					.from(schema.eventFacility)
					.innerJoin(schema.event, eq(schema.eventFacility.eventId, schema.event.id))
					.where(
						and(
							eq(schema.eventFacility.facilityId, data.facilityId), // whether this facility is..
							or(eq(schema.eventFacility.eventId, eventId), eq(schema.event.status, "approved")), // ..taken by the same event or any event that is approved
							isNull(schema.eventFacility.deletedAt),
						),
					);

				if (overlap != null) return { success: false as const, conflict: overlap };
			}

			const [assignment] = await db
				.insert(schema.eventFacility)
				.values({
					eventId: eventId,
					facilityId: data.facilityId,
					venueAllotmentId: data.venueAllotmentId,
				})
				.returning({
					id: schema.eventFacility.id,
				});

			if (assignment == null) unreachable();

			return { success: true as const, assignment: assignment };
		});
	},
);

export const deleteFacilityAssignment = dbAction(
	async (eventId: number, facilityAssignmentId: number) => {
		const [deleted] = await db
			.update(schema.eventFacility)
			.set({ deletedAt: sql`now()` })
			.where(
				and(
					eq(schema.eventFacility.eventId, eventId),
					eq(schema.eventFacility.id, facilityAssignmentId),
					isNull(schema.eventFacility.deletedAt),
				),
			)
			.returning({ id: schema.eventFacility.id });

		return deleted;
	},
);

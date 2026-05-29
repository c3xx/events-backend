import { and, eq, notInArray } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";

export const getVenueFacilities = dbAction(async (venueId: number) => {
	return await db
		.select({
			id: schema.venueFacility.id,
			facilityId: schema.facility.id,
			facilityName: schema.facility.name,
		})
		.from(schema.venueFacility)
		.innerJoin(schema.facility, eq(schema.venueFacility.facilityId, schema.facility.id))
		.where(eq(schema.venueFacility.venueId, venueId));
});

export const setVenueFacilities = dbAction(
	async (venueId: number, data: { facilityIds: number[] }) => {
		const upsertCte = db.$with("upsert").as(
			db
				.insert(schema.venueFacility)
				.values(
					data.facilityIds.map(
						(facilityId) =>
							({
								venueId: venueId,
								facilityId: facilityId,
							}) satisfies typeof schema.venueFacility.$inferInsert,
					),
				)
				.onConflictDoNothing({
					target: [schema.venueFacility.venueId, schema.venueFacility.facilityId],
				})
				.returning({ id: schema.venueFacility.id }),
		);

		const deleteCte = db
			.$with("delete")
			.as(
				db
					.delete(schema.venueFacility)
					.where(
						and(
							eq(schema.venueFacility.venueId, venueId),
							notInArray(schema.venueFacility.facilityId, data.facilityIds),
						),
					),
			);

		return await db
			.with(upsertCte, deleteCte)
			.select({ facilityId: schema.venueFacility.facilityId })
			.from(schema.venueFacility)
			.where(eq(schema.venueFacility.venueId, venueId));
	},
);

export const deleteAllVenueFacilities = dbAction(async (venueId: number) => {
	await db.delete(schema.venueFacility).where(eq(schema.venueFacility.venueId, venueId));
});

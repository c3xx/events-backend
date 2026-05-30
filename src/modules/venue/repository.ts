import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const createVenue = dbAction(
	async (data: {
		name: string;
		venueTypeId: number;
		maxCapacity: number;
		accessLevel: VenueAccessLevel;
		isAvailable: boolean;
		organizationId?: number | null | undefined;
		unavailabilityReason?: string | undefined;
	}) => {
		const [inserted] = await db
			.insert(schema.venue)
			.values({
				name: data.name,
				venueTypeId: data.venueTypeId,
				organizationId: data.organizationId,
				accessLevel: data.accessLevel,
				isAvailable: data.isAvailable,
				unavailabilityReason: data.unavailabilityReason,
				maxCapacity: data.maxCapacity,
			})
			.returning({ id: schema.venue.id });

		if (inserted == null) unreachable();

		return inserted;
	},
);

export const getVenues = dbAction(async () => {
	return await db.query.venue.findMany({
		where: isNull(schema.venue.deletedAt),
		columns: {
			id: true,
			name: true,
			accessLevel: true,
			isAvailable: true,
			unavailabilityReason: true,
			maxCapacity: true,
			organizationId: true,
			venueTypeId: true,
			isActive: true,
		},
	});
});

export const getVenue = dbAction(async (venueId: number) => {
	return await db.query.venue.findFirst({
		where: and(eq(schema.venue.id, venueId), isNull(schema.venue.deletedAt)),
		columns: {
			id: true,
			name: true,
			venueTypeId: true,
			maxCapacity: true,
			accessLevel: true,
			isAvailable: true,
			unavailabilityReason: true,
			organizationId: true, // note: if needed as full object, include in `with`
			isActive: true,
			createdAt: true,
		},
	});
});

export const findVenueManagedEntity = dbAction(async (venueId: number) => {
	const [relatedManagedEntity] = await db
		.select({ id: schema.managedEntity.id })
		.from(schema.managedEntity)
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, "venue"),
				eq(schema.managedEntity.refId, venueId),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.limit(1);

	return relatedManagedEntity;
});

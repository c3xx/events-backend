import { and, eq, isNull, sql } from "drizzle-orm";
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

export const updateVenue = dbAction(
	async (
		id: number,
		data: {
			name?: string | undefined;
			maxCapacity?: number | undefined;
			accessLevel?: VenueAccessLevel | undefined;
			isAvailable?: boolean | undefined;
			unavailabilityReason?: string | null | undefined;
			isActive?: boolean | undefined;
		},
	) => {
		const [updated] = await db
			.update(schema.venue)
			.set(data)
			.where(and(eq(schema.venue.id, id), isNull(schema.venue.deletedAt)))
			.returning({ id: schema.venue.id });
		return updated;
	},
);

export const softDeleteVenue = dbAction(async (id: number) => {
	const result = await db
		.update(schema.venue)
		.set({ deletedAt: sql`NOW()` })
		.where(and(eq(schema.venue.id, id), isNull(schema.venue.deletedAt)));
	return result;
});

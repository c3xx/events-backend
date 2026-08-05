import { and, eq, isNull, sql } from "drizzle-orm";
import { jsonAggDistinct, jsonBuildObject, jsonBuildObjectNullable } from "@/db/helpers.js";
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

export const findVenueById = dbAction(async (venueId: number) => {
	const [venue] = await db
		.select({
			id: schema.venue.id,
			name: schema.venue.name,
			type: jsonBuildObject({
				id: schema.venueType.id,
				name: schema.venueType.name,
			}),
			maxCapacity: schema.venue.maxCapacity,
			accessLevel: schema.venue.accessLevel,
			isAvailable: schema.venue.isAvailable,
			unavailabilityReason: schema.venue.unavailabilityReason,
			isActive: schema.venue.isActive,
			createdAt: schema.venue.createdAt,
			organization: jsonBuildObjectNullable(
				{
					id: schema.organization.id,
					name: schema.organization.name,
				},
				schema.venue.organizationId,
			),
			facilities: jsonAggDistinct(
				jsonBuildObject(
					{
						id: schema.facility.id,
						name: schema.facility.name,
						type: jsonBuildObject({
							id: schema.facilityType.id,
							name: schema.facilityType.name,
						}),
						isAvailable: schema.facility.isAvailable,
					},
					// schema.facility.id,
				),
				schema.facility.id,
			),
		})
		.from(schema.venue)
		.innerJoin(
			schema.venueType,
			and(eq(schema.venue.venueTypeId, schema.venueType.id), isNull(schema.venueType.deletedAt)),
		)
		.leftJoin(
			schema.organization,
			and(
				eq(schema.venue.organizationId, schema.organization.id),
				isNull(schema.organization.deletedAt),
			),
		)
		.leftJoin(
			schema.facilityProvider,
			and(
				eq(schema.venue.id, schema.facilityProvider.providerEntityRefId),
				eq(schema.facilityProvider.providerEntityType, "venue"),
				isNull(schema.facilityProvider.deletedAt),
			),
		)
		.leftJoin(
			schema.facility,
			and(
				eq(schema.facilityProvider.facilityId, schema.facility.id),
				isNull(schema.facility.deletedAt),
			),
		)
		.leftJoin(
			schema.facilityType,
			and(
				eq(schema.facility.typeId, schema.facilityType.id),
				isNull(schema.facilityType.deletedAt),
			),
		)
		.where(and(eq(schema.venue.id, venueId), isNull(schema.venue.deletedAt)))
		.groupBy(schema.venue.id, schema.venueType.id, schema.organization.id)
		.limit(1);

	return venue;
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
	return await db.transaction(async (tx) => {
		const [result] = await tx
			.update(schema.venue)
			.set({ deletedAt: sql`NOW()` })
			.where(and(eq(schema.venue.id, id), isNull(schema.venue.deletedAt)))
			.returning({ id: schema.venue.id });

		if (result == null) return null;

		const [managedEntity] = await tx
			.select({ id: schema.managedEntity.id })
			.from(schema.managedEntity)
			.where(
				and(
					eq(schema.managedEntity.managedEntityType, "venue"),
					eq(schema.managedEntity.refId, id),
					isNull(schema.managedEntity.deletedAt),
				),
			);

		if (managedEntity != null) {
			await tx
				.update(schema.managedEntity)
				.set({ deletedAt: sql`NOW()` })
				.where(eq(schema.managedEntity.id, managedEntity.id));

			await tx
				.update(schema.userRole)
				.set({ deletedAt: sql`NOW()` })
				.where(
					and(
						eq(schema.userRole.managedEntityId, managedEntity.id),
						isNull(schema.userRole.deletedAt),
					),
				);
		}

		await tx.delete(schema.venueFacility).where(eq(schema.venueFacility.venueId, id));

		await tx
			.update(schema.venueAllotment)
			.set({ deletedAt: sql`NOW()` })
			.where(and(eq(schema.venueAllotment.venueId, id), isNull(schema.venueAllotment.deletedAt)));

		return result;
	});
});

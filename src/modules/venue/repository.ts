import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";
import {
	jsonAgg,
	jsonAggDistinct,
	jsonBuildObject,
	jsonBuildObjectNullable,
} from "@/db/helpers.js";

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

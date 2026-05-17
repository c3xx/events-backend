import { and, eq, inArray, isNull, notInArray, type SQL, sql } from "drizzle-orm";
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

export const getVenueMembers = dbAction(
	async (
		managedEntityId: number,
		filters: {
			userId?: number;
		},
	) => {
		const userFilterClauses: SQL[] = [];

		if (filters.userId != null) {
			// User specific search
			userFilterClauses.push(eq(schema.user.id, filters.userId));
		} else {
			// Global search
			userFilterClauses.push(
				inArray(
					schema.user.id,
					db
						.select({ id: schema.userRole.userId })
						.from(schema.userRole)
						.where(
							and(
								eq(schema.userRole.managedEntityId, managedEntityId),
								isNull(schema.userRole.deletedAt),
							),
						),
				),
			);
		}

		return await db.query.user.findMany({
			where: and(isNull(schema.user.deletedAt), ...userFilterClauses),
			columns: {
				id: true,
				fullName: true,
				email: true,
			},
			with: {
				roles: {
					where: and(
						eq(schema.userRole.managedEntityId, managedEntityId),
						isNull(schema.userRole.deletedAt),
					),
					columns: {
						id: true,
						roleId: true,
						isActive: true,
					},
				},
			},
		});
	},
);

export const assignVenueMemberRoles = dbAction(
	async (data: { managedEntityId: number; userId: number; roleIds: number[] }) => {
		return await db.transaction(async (tx) => {
			const userRoles = await tx
				.select({
					id: schema.userRole.id,
					roleId: schema.userRole.roleId,
				})
				.from(schema.userRole)
				.where(
					and(
						eq(schema.userRole.managedEntityId, data.managedEntityId),
						eq(schema.userRole.userId, data.userId),
						isNull(schema.userRole.deletedAt),
					),
				);

			const newRoleIds = new Set(data.roleIds);
			const roleIdToId = new Map<number, number>();
			const toBeDeletedPks: number[] = [];

			for (const userRole of userRoles) {
				if (newRoleIds.has(userRole.roleId)) {
					roleIdToId.set(userRole.roleId, userRole.id);
				} else {
					// currently has, but not in the new list.
					toBeDeletedPks.push(userRole.id);
				}
			}

			const existingRoleIds = new Set(userRoles.map((ur) => ur.roleId));
			const toBeAdded = data.roleIds.filter((roleId) => !existingRoleIds.has(roleId));

			if (toBeDeletedPks.length > 0) {
				await tx
					.update(schema.userRole)
					.set({ deletedAt: sql`now()` })
					.where(inArray(schema.userRole.id, toBeDeletedPks));
			}

			if (toBeAdded.length > 0) {
				const inserted = await tx
					.insert(schema.userRole)
					.values(
						toBeAdded.map((roleId) => ({
							managedEntityId: data.managedEntityId,
							userId: data.userId,
							roleId: roleId,
						})),
					)
					.returning({ id: schema.userRole.id, roleId: schema.userRole.roleId });

				for (const row of inserted) {
					roleIdToId.set(row.roleId, row.id);
				}
			}

			return data.roleIds
				.map((roleId) => ({ id: roleIdToId.get(roleId), roleId }))
				.filter((entry): entry is { id: number; roleId: number } => entry.id != null);
		});
	},
);

export const deleteVenueMember = dbAction(
	async (data: { managedEntityId: number; userId: number }) => {
		return await db
			.update(schema.userRole)
			.set({ deletedAt: sql`now()` })
			.where(
				and(
					eq(schema.userRole.managedEntityId, data.managedEntityId),
					eq(schema.userRole.userId, data.userId),
					isNull(schema.userRole.deletedAt),
				),
			)
			.returning({ id: schema.userRole.id });
	},
);

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

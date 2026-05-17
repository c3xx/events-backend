import { and, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const createOrganization = dbAction(
	async (data: {
		name: string;
		organizationTypeId: number;
		parentOrganizationId: number | null | undefined;
	}) => {
		const [inserted] = await db
			.insert(schema.organization)
			.values({
				name: data.name,
				organizationTypeId: data.organizationTypeId,
				parentOrganizationId: data.parentOrganizationId ?? null,
			})
			.returning({ id: schema.organization.id });

		if (inserted == null) unreachable();

		return inserted;
	},
);

export const getOrganizations = dbAction(async () => {
	return await db.query.organization.findMany({
		where: isNull(schema.organization.deletedAt),
		columns: {
			id: true,
			name: true,
			organizationTypeId: true,
			parentOrganizationId: true,
			isActive: true,
			createdAt: true,
		},
	});
});

export const getOrganization = dbAction(async (organizationId: number) => {
	return await db.query.organization.findFirst({
		where: and(eq(schema.organization.id, organizationId), isNull(schema.organization.deletedAt)),
		columns: {
			id: true,
			name: true,
			organizationTypeId: true,
			parentOrganizationId: true,
			isActive: true,
			createdAt: true,
		},
	});
});

export const findOrganizationManagedEntity = dbAction(async (organizationId: number) => {
	const [relatedManagedEntity] = await db
		.select({ id: schema.managedEntity.id })
		.from(schema.managedEntity)
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, "organization"),
				eq(schema.managedEntity.refId, organizationId),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.limit(1);

	return relatedManagedEntity;
});

export const getOrganizationMembers = dbAction(
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

export const assignOrganizationMemberRoles = dbAction(
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

export const deleteOrganizationMember = dbAction(
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

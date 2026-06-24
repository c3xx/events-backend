import { and, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";

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

export const findOrganizerMemberWithRole = dbAction(
	async (data: { organizationId: number; userId: number; roleId: number }) => {
		const [userRole] = await db
			.select({ id: schema.userRole.id })
			.from(schema.userRole)
			.innerJoin(
				schema.managedEntity,
				and(
					eq(schema.managedEntity.id, schema.userRole.managedEntityId),
					eq(schema.managedEntity.managedEntityType, "organization"),
					isNull(schema.managedEntity.deletedAt),
				),
			)
			.innerJoin(
				schema.organization,
				and(
					eq(schema.organization.id, schema.managedEntity.refId),
					eq(schema.organization.id, data.organizationId),
					isNull(schema.organization.deletedAt),
				),
			)
			.innerJoin(
				schema.role,
				and(eq(schema.role.id, schema.userRole.roleId), isNull(schema.role.deletedAt)),
			)
			.where(
				and(
					eq(schema.userRole.userId, data.userId),
					eq(schema.userRole.roleId, data.roleId),
					isNull(schema.userRole.deletedAt),
				),
			)
			.limit(1);

		return userRole;
	},
);

import { and, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const insertUser = dbAction(async (userData: { email: string; fullName: string }) => {
	const [user] = await db
		.insert(schema.user)
		.values({
			type: "end_user",
			email: userData.email,
			fullName: userData.fullName,
			isActive: false,
		})
		.returning({
			id: schema.user.id,
		});

	if (user == null) unreachable();
	return user;
});

export const getUsers = dbAction(async () => {
	return await db.query.user.findMany({
		where: and(eq(schema.user.type, "end_user"), isNull(schema.user.deletedAt)),
		columns: {
			id: true,
			fullName: true,
			email: true,
			createdAt: true,
			isActive: true,
		},
		with: {
			roles: {
				columns: {
					id: true,
					isActive: true,
					createdAt: true,
					roleId: true,
					managedEntityId: true,
				},
			},
		},
	});
});

export const getUserOrganizations = dbAction(async (id: number, permission?: PermissionCode) => {
	const conditions: SQL[] = [
		eq(schema.userRole.userId, id),
		eq(schema.managedEntity.managedEntityType, "organization"),
		isNull(schema.userRole.deletedAt),
	];

	if (permission) {
		conditions.push(eq(schema.permission.code, permission));
	}

	const rows = await db
		.selectDistinct({ id: schema.organization.id, name: schema.organization.name })
		.from(schema.userRole)
		.innerJoin(schema.managedEntity, eq(schema.userRole.managedEntityId, schema.managedEntity.id))
		.innerJoin(schema.role, eq(schema.userRole.roleId, schema.role.id))
		.innerJoin(schema.rolePermission, eq(schema.role.id, schema.rolePermission.roleId))
		.innerJoin(schema.permission, eq(schema.rolePermission.permissionId, schema.permission.id))
		.innerJoin(schema.organization, eq(schema.managedEntity.refId, schema.organization.id))
		.where(and(...conditions));
	return rows;
});

export const findUserById = dbAction(async (id: number) => {
	return await db.query.user.findFirst({
		where: and(eq(schema.user.id, id), isNull(schema.user.deletedAt)),
	});
});

export const findUserByEmail = dbAction(async (email: string) => {
	return await db.query.user.findFirst({
		where: and(eq(schema.user.email, email), isNull(schema.user.deletedAt)),
	});
});

// todo: deconstruct into multiple parts when get time
export const getFullUser = dbAction(async (userId: number) => {
	const [user] = await db
		.select({
			id: schema.user.id,
			fullName: schema.user.fullName,
			email: schema.user.email,
			isActive: schema.user.isActive,
			type: schema.user.type,
			memberships: sql<
				{
					userRoleId: number;
					roleId: number;
					managedEntityId: number;
				}[]
			>`json_agg(json_build_object('userRoleId', ${schema.userRole.id}, 'roleId', ${schema.userRole.roleId}, 'managedEntityId', ${schema.userRole.managedEntityId}))`.as(
				"memberships",
			),
		})
		.from(schema.user)
		.leftJoin(
			schema.userRole,
			and(eq(schema.userRole.userId, schema.user.id), isNull(schema.userRole.deletedAt)),
		)
		.where(eq(schema.user.id, userId))
		.groupBy(schema.user.id);

	if (user == null) return null;

	const allRoleIds = new Set(user.memberships.flatMap((m) => m.roleId));
	const allManagedEntityIds = new Set(user.memberships.flatMap((m) => m.managedEntityId));

	const roles = await db
		.select({
			id: schema.role.id,
			name: schema.role.name,
			permissions: sql<
				string[]
			>`coalesce(array_agg(distinct ${schema.permission.code}) filter (where ${schema.permission.code} is not null), '{}'::text[])`.as(
				"permissions",
			),
		})
		.from(schema.role)
		.leftJoin(schema.rolePermission, eq(schema.rolePermission.roleId, schema.role.id))
		.leftJoin(schema.permission, eq(schema.permission.id, schema.rolePermission.permissionId))
		.where(and(isNull(schema.role.deletedAt), inArray(schema.role.id, [...allRoleIds])))
		.groupBy(schema.role.id);

	console.log(roles);

	const managedEntities = await db
		.select({
			id: schema.managedEntity.id,
			scope: sql<{
				type: "organization" | "venue";
				id: number;
				name: string;
				kind: {
					id: number;
					name: string;
				};
			}>`case
				when ${schema.managedEntity.managedEntityType} = 'organization'
				then (
					select
						json_build_object(
							'type', ${schema.managedEntity.managedEntityType},
							'id', o.id,
							'name', o.name,
							'kind', json_build_object(
								'id', ot.id,
								'name', ot.name
							)
						)
					from organization o
					inner join organization_type ot on o.organization_type_id = ot.id
					where o.id = ${schema.managedEntity.refId}
					limit 1
				)
				when ${schema.managedEntity.managedEntityType} = 'venue'
				then (
					select
						json_build_object(
							'type', ${schema.managedEntity.managedEntityType},
							'id', v.id,
							'name', v.name,
							'kind', json_build_object(
								'id', vt.id,
								'name', vt.name
							)
						)
					from venue v
					inner join venue_type vt on v.venue_type_id = vt.id
					where v.id = ${schema.managedEntity.refId}
					limit 1
				)
				else null
			end`.as("scope"),
		})
		.from(schema.managedEntity)
		.where(
			and(
				inArray(schema.managedEntity.id, [...allManagedEntityIds]),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.groupBy(schema.managedEntity.id);

	return {
		id: user.id,
		email: user.email,
		type: user.type,
		fullName: user.fullName,
		memberships: managedEntities.map((entity) => {
			return {
				id: entity.scope.id,
				type: entity.scope.type,
				name: entity.scope.name,
				kind: {
					id: entity.scope.kind.id,
					name: entity.scope.kind.name,
				},
				roles: user.memberships
					.filter((m) => m.managedEntityId === entity.id)
					.map((m) => roles.find((role) => role.id === m.roleId))
					.filter((role) => role != null),
			};
		}),
	};
});

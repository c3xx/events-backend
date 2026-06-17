import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "./src/db";
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
		.innerJoin(schema.userRole, eq(schema.userRole.userId, schema.user.id))
		.where(and(eq(schema.user.id, 7), isNull(schema.userRole.deletedAt)))
		.groupBy(schema.user.id);


	const allRoleIds = new Set(user.memberships.flatMap((m) => m.roleId));
	const allManagedEntityIds = new Set(user.memberships.flatMap((m) => m.managedEntityId));

	const roleData = await db
		.select({
			id: schema.role.id,
			name: schema.role.name,
			permissions: sql<string[]>`array_agg(distinct ${schema.permission.code})`,
		})
		.from(schema.role)
		.innerJoin(schema.rolePermission, eq(schema.rolePermission.roleId, schema.role.id))
		.innerJoin(schema.permission, eq(schema.permission.id, schema.rolePermission.permissionId))
		.where(and(and(isNull(schema.role.deletedAt), inArray(schema.role.id, [...allRoleIds]))))
		.groupBy(schema.role.id);

	const managedEntities = await db
		.select({
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

// const result = await query;
console.dir(managedEntities, { depth: 33 })


console.log(roleData)

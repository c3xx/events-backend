import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";

export const getPermissions = dbAction(async () => {
	return await db
		.select({
			id: schema.permission.id,
			code: schema.permission.code,
			description: schema.permission.description,
		})
		.from(schema.permission);
});

export const findPermission = dbAction(async (permissionId: number) => {
	const [permission] = await db
		.select({
			id: schema.permission.id,
			code: schema.permission.code,
			description: schema.permission.description,
		})
		.from(schema.permission)
		.where(eq(schema.permission.id, permissionId))
		.limit(1);
	return permission;
});

export const hasPermissionInManagedEntity = dbAction(
	async (
		user: {
			id: number;
			type: UserType;
		},
		managedEntity: ManagedEntityType,
		refId: number[],
		permission: PermissionCode,
	) => {
		if (user.type === "admin") return true;
		const [found] = await db
			.select({ val: sql`1` })
			.from(schema.userRole)
			.innerJoin(schema.managedEntity, eq(schema.managedEntity.id, schema.userRole.managedEntityId))
			.innerJoin(schema.rolePermission, eq(schema.rolePermission.roleId, schema.userRole.roleId))
			.innerJoin(schema.permission, eq(schema.permission.id, schema.rolePermission.permissionId))
			.where(
				and(
					eq(schema.userRole.userId, user.id),
					inArray(schema.managedEntity.refId, refId),
					eq(schema.managedEntity.managedEntityType, managedEntity),
					eq(schema.permission.code, permission),
					isNull(schema.userRole.deletedAt),
				),
			)
			.limit(1);

		return found != null;
	},
);

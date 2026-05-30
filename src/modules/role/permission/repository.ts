import { and, eq, notInArray } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";

export const getRolePermissions = dbAction(async (rolePermissionId: number) => {
	return await db
		.select({
			id: schema.permission.id,
			code: schema.permission.code,
			description: schema.permission.description,
		})
		.from(schema.rolePermission)
		.innerJoin(schema.permission, eq(schema.rolePermission.permissionId, schema.permission.id))
		.where(eq(schema.rolePermission.roleId, rolePermissionId));
	// note: no deletedAt
});

export const deleteAll = dbAction(async (roleId: number) => {
	await db.delete(schema.rolePermission).where(eq(schema.rolePermission.roleId, roleId));
});

export const setRolePermissions = dbAction(
	async (roleId: number, data: { permissionIds: number[] }) => {
		const upsertCte = db.$with("upsert").as(
			db
				.insert(schema.rolePermission)
				.values(
					data.permissionIds.map(
						(permissionId) =>
							({
								roleId: roleId,
								permissionId: permissionId,
							}) satisfies typeof schema.rolePermission.$inferInsert,
					),
				)
				.onConflictDoNothing({
					target: [schema.rolePermission.roleId, schema.rolePermission.permissionId],
				})
				.returning({
					roleId: schema.rolePermission.roleId,
					permissionId: schema.rolePermission.permissionId,
				}),
		);

		const deleteCte = db
			.$with("delete")
			.as(
				db
					.delete(schema.rolePermission)
					.where(
						and(
							eq(schema.rolePermission.roleId, roleId),
							notInArray(schema.rolePermission.permissionId, data.permissionIds),
						),
					),
			);

		return await db
			.with(upsertCte, deleteCte)
			.select({ permissionId: schema.rolePermission.permissionId })
			.from(schema.rolePermission)
			.where(eq(schema.rolePermission.roleId, roleId));
	},
);

import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { InternalError } from "@/lib/errors.js";
import { dbAction } from "@/lib/helpers.js";

export const assign = dbAction(
	async (authorityId: IdLike, permissionCode: AuthorityPermissionCode) => {
		const inserted = await db
			.insert(schema.managedEntityAuthorityPermission)
			.values({
				authorityId,
				permissionId: sql<number>`(${db
					.select({ id: schema.permission.id })
					.from(schema.permission)
					.where(eq(schema.permission.code, permissionCode))})`,
			})
			.returning({ id: schema.managedEntityAuthorityPermission.id });

		if (inserted.length === 0)
			throw new InternalError(`Could not find the expected permission: ${permissionCode}`);
	},
);

export const revoke = dbAction(
	async (authorityId: IdLike, permissionCode: AuthorityPermissionCode) => {
		const deleted = await db
			.delete(schema.managedEntityAuthorityPermission)
			.where(
				and(
					eq(schema.managedEntityAuthorityPermission.authorityId, authorityId),
					inArray(
						schema.managedEntityAuthorityPermission.permissionId,
						db
							.select({ id: schema.permission.id })
							.from(schema.permission)
							.where(eq(schema.permission.code, permissionCode)),
					),
				),
			)
			.returning({ id: schema.managedEntityAuthorityPermission.id });

		return deleted.length > 0;
	},
);

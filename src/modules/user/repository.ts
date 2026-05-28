import { and, eq, isNull, type SQL } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const insertUser = dbAction(
	async (data: { email: string; passwordHash: string; fullName: string }) => {
		const [inserted] = await db
			.insert(schema.user)
			.values({
				type: "end_user",
				email: data.email,
				passwordHash: data.passwordHash,
				fullName: data.fullName,
			})
			.returning({
				id: schema.user.id,
			});

		if (inserted == null) unreachable();

		return inserted;
	},
);

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

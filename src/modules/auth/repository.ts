import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { DAY } from "@/lib/constants.js";
import { dbAction } from "@/lib/helpers.js";

export const findUserByEmail = dbAction(async (email: string) => {
	return await db.query.user.findFirst({
		where: and(eq(schema.user.email, email), isNull(schema.user.deletedAt)),
	});
});

export const getUserWithPermissions = dbAction(async (id: number) => {
	const user = await db.query.user.findFirst({
		where: and(eq(schema.user.id, id), isNull(schema.user.deletedAt)),
		columns: {
			id: true,
			email: true,
			fullName: true,
			type: true,
		},
		with: {
			roles: {
				columns: {},
				with: {
					role: {
						columns: {
							id: true,
						},
					},
				},
			},
		},
	});

	if (user == null) {
		return null;
	}

	const permissions = await db
		.selectDistinct({ code: schema.permission.code })
		.from(schema.rolePermission)
		.innerJoin(schema.permission, eq(schema.rolePermission.permissionId, schema.permission.id))
		.where(
			inArray(
				schema.rolePermission.roleId,
				user.roles.map(({ role }) => role.id),
			),
		);

	return {
		...user,
		permissions: permissions.map((permission) => permission.code),
	};
});

export const findActivePasswordToken = dbAction(async (tokenHash: string) => {
	const PASSWORD_TOKEN_EXPIRY = 1 * DAY; //todo: change as needed
	return await db.query.userPasswordToken.findFirst({
		where: and(
			eq(schema.userPasswordToken.tokenHash, tokenHash),
			isNull(schema.userPasswordToken.usedAt),
			lt(
				sql`now()`,
				sql`${schema.userPasswordToken.createdAt} + (${PASSWORD_TOKEN_EXPIRY} * interval '1 millisecond')`,
			),
		),
		with: {
			user: true,
		},
	});
});

export const applyPasswordChange = dbAction(
	async (params: { userId: number; tokenId: number; newPasswordHash: string }) => {
		await db.transaction(async (tx) => {
			await tx
				.update(schema.user)
				.set({
					passwordHash: params.newPasswordHash,
					isActive: true,
				})
				.where(eq(schema.user.id, params.userId));

			await tx
				.update(schema.userPasswordToken)
				.set({
					usedAt: sql`now()`,
				})
				.where(eq(schema.userPasswordToken.id, params.tokenId));
		});
	},
);

import { and, eq, exists, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { PASSWORD_TOKEN_EXPIRY } from "@/lib/constants.js";
import { dbAction } from "@/lib/helpers.js";

export const findActivePasswordToken = dbAction(async (tokenHash: string) => {
	return await db.query.userPasswordToken.findFirst({
		where: and(
			eq(schema.userPasswordToken.tokenHash, tokenHash),
			isNull(schema.userPasswordToken.usedAt),
			lt(
				sql`now()`,
				sql`${schema.userPasswordToken.createdAt} + (${PASSWORD_TOKEN_EXPIRY} * interval '1 millisecond')`,
			),
			exists(
				db
					.select({ _: sql`1` })
					.from(schema.user)
					.where(
						and(eq(schema.user.id, schema.userPasswordToken.userId), isNull(schema.user.deletedAt)),
					),
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

export const invalidateActiveTokensForUser = dbAction(async (userId: number) => {
	await db
		.update(schema.userPasswordToken)
		.set({ usedAt: sql`now()` })
		.where(
			and(eq(schema.userPasswordToken.userId, userId), isNull(schema.userPasswordToken.usedAt)),
		);
});

export const insertPasswordToken = dbAction(
	async (params: {
		userId: number;
		tokenHash: string;
		type: "SET_PASSWORD" | "RESET_PASSWORD";
	}) => {
		await db.insert(schema.userPasswordToken).values({
			userId: params.userId,
			tokenHash: params.tokenHash,
			type: params.type,
		});
	},
);

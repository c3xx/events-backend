import { and, eq, exists, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { PASSWORD_TOKEN_EXPIRY } from "@/lib/constants.js";
import { dbAction } from "@/lib/helpers.js";

export const findActivePasswordToken = dbAction(async (tokenHash: string) => {
	const result = await db.query.userPasswordToken.findFirst({
		where: and(
			eq(schema.userPasswordToken.tokenHash, tokenHash),
			isNull(schema.userPasswordToken.usedAt),
			gt(schema.userPasswordToken.expiresAt, sql`now()`),
		),
		with: {
			user: true,
		},
	});

	if (result == null || result.user.deletedAt != null) {
		return null;
	}

	return result;
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
		type: "set_password" | "reset_password";
	}) => {
		const expiresAt = new Date(Date.now() + PASSWORD_TOKEN_EXPIRY).toISOString();
		await db.insert(schema.userPasswordToken).values({
			userId: params.userId,
			tokenHash: params.tokenHash,
			type: params.type,
			expiresAt,
		});
	},
);

import { and, eq, isNull } from "drizzle-orm";
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

export const getUserOrganizations = dbAction(async (userId: number) => {
    const rows = await db
        .select({ orgId: schema.managedEntity.refId })
        .from(schema.userRole)
        .innerJoin(schema.managedEntity, eq(schema.userRole.managedEntityId, schema.managedEntity.id))
        .where(
            and(
                eq(schema.userRole.userId, userId),
                eq(schema.managedEntity.managedEntityType, "organization"),
                isNull(schema.userRole.deletedAt),
                isNull(schema.managedEntity.deletedAt),
            ),
        );
    return rows.map((r) => r.orgId);
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

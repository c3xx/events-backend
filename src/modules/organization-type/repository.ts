import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getOrganizationTypes = dbAction(async () => {
	return await db
		.select({
			id: schema.organizationType.id,
			name: schema.organizationType.name,
		})
		.from(schema.organizationType)
		.where(isNull(schema.organizationType.deletedAt))
		.orderBy(schema.organizationType.createdAt);
});

export const createOrganizationType = dbAction(async (data: { name: string }) => {
	const [inserted] = await db
		.insert(schema.organizationType)
		.values({ name: data.name })
		.returning({ id: schema.organizationType.id });

	if (inserted == null) unreachable();

	return inserted;
});

export const getOrganizationType = dbAction(async (organizationTypeId: number) => {
	return await db.query.organizationType.findFirst({
		where: and(
			eq(schema.organizationType.id, organizationTypeId),
			isNull(schema.organizationType.deletedAt),
		),
		columns: {
			id: true,
			name: true,
		},
	});
});

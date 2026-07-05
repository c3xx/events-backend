import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const createOrganization = dbAction(
	async (data: {
		name: string;
		organizationTypeId: number;
		parentOrganizationId: number | null | undefined;
	}) => {
		const [inserted] = await db
			.insert(schema.organization)
			.values({
				name: data.name,
				organizationTypeId: data.organizationTypeId,
				parentOrganizationId: data.parentOrganizationId ?? null,
			})
			.returning({ id: schema.organization.id });

		if (inserted == null) unreachable();

		return inserted;
	},
);

export const getOrganizations = dbAction(async () => {
	return await db.query.organization.findMany({
		where: isNull(schema.organization.deletedAt),
		columns: {
			id: true,
			name: true,
			organizationTypeId: true,
			parentOrganizationId: true,
			isActive: true,
			createdAt: true,
		},
	});
});

export const getOrganization = dbAction(async (organizationId: number) => {
	return await db.query.organization.findFirst({
		where: and(eq(schema.organization.id, organizationId), isNull(schema.organization.deletedAt)),
		columns: {
			id: true,
			name: true,
			organizationTypeId: true,
			parentOrganizationId: true,
			isActive: true,
			createdAt: true,
		},
	});
});

export const findOrganizationManagedEntity = dbAction(async (organizationId: number) => {
	const [relatedManagedEntity] = await db
		.select({ id: schema.managedEntity.id })
		.from(schema.managedEntity)
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, "organization"),
				eq(schema.managedEntity.refId, organizationId),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.limit(1);

	return relatedManagedEntity;
});

export const updateOrganization = dbAction(
	async (id: number, data: { name?: string; isActive?: boolean }) => {
		const [updated] = await db
			.update(schema.organization)
			.set(data)
			.where(and(eq(schema.organization.id, id), isNull(schema.organization.deletedAt)))
			.returning({ id: schema.organization.id });
		return updated;
	},
);

export const softDeleteOrganization = dbAction(async (id: number) => {
	const result = await db
		.update(schema.organization)
		.set({ deletedAt: sql`NOW()` })
		.where(and(eq(schema.organization.id, id), isNull(schema.organization.deletedAt)));
	return result;
});

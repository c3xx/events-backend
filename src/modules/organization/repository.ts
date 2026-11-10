import { and, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { jsonBuildObject, jsonBuildObjectNullable } from "@/db/helpers.js";
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
	const parentOrganization = alias(schema.organization, "parentOrganization");
	const parentOrganizationType = alias(schema.organizationType, "parentOrganizationType");

	const [organization] = await db
		.select({
			id: schema.organization.id,
			name: schema.organization.name,
			type: jsonBuildObject({
				id: schema.organizationType.id,
				name: schema.organizationType.name,
			}),
			parentOrganization: jsonBuildObjectNullable(
				{
					id: parentOrganization.id,
					name: parentOrganization.name,
					type: jsonBuildObject({
						id: parentOrganizationType.id,
						name: parentOrganizationType.name,
					}),
				},
				parentOrganization.id,
			),
			managedEntity: jsonBuildObject({
				id: schema.managedEntity.id,
			}),

			isActive: schema.organization.isActive,
			createdAt: schema.organization.createdAt,

			// todo: legacy, get rid of these after updating frontend
			organizationTypeId: schema.organization.organizationTypeId,
			parentOrganizationId: schema.organization.parentOrganizationId,
		})
		.from(schema.organization)
		.innerJoin(
			schema.managedEntity,
			and(
				eq(schema.managedEntity.refId, schema.organization.id),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.innerJoin(
			schema.organizationType,
			and(
				eq(schema.organizationType.id, schema.organization.organizationTypeId),
				isNull(schema.organizationType.deletedAt),
			),
		)
		.leftJoin(
			parentOrganization,
			and(
				eq(parentOrganization.id, schema.organization.parentOrganizationId),
				isNull(parentOrganization.deletedAt),
			),
		)
		.leftJoin(
			parentOrganizationType,
			and(
				eq(parentOrganizationType.id, parentOrganization.organizationTypeId),
				isNull(parentOrganizationType.deletedAt),
			),
		)
		.where(and(eq(schema.organization.id, organizationId), isNull(schema.organization.deletedAt)));

	return organization;
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

export const getOrganizationsByIds = dbAction(async (organizationIds: number[]) => {
	return await db.query.organization.findMany({
		where: and(
			inArray(schema.organization.id, organizationIds),
			isNull(schema.organization.deletedAt),
		),
		columns: {
			id: true,
			isActive: true,
		},
	});
});

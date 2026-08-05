import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { jsonAggDistinct, jsonBuildObject } from "@/db/helpers.js";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getAll = dbAction(async () => {
	return await db
		.select({
			id: schema.organizationHierarchyLayer.id,
			nextLayerId: schema.organizationHierarchyLayer.nextLayerId,
			label: schema.organizationHierarchyLayer.label,
			sameLevelControlPolicy: schema.organizationHierarchyLayer.sameLevelControlPolicy,
			organizations: jsonAggDistinct(
				jsonBuildObject({
					id: schema.organization.id,
					name: schema.organization.name,
				}),
				schema.organization.id,
			),
		})
		.from(schema.organizationHierarchyLayer)
		.leftJoin(
			schema.organization,
			and(
				eq(schema.organization.layerId, schema.organizationHierarchyLayer.id),
				isNull(schema.organizationHierarchyLayer.deletedAt),
			),
		)
		.where(isNull(schema.organizationHierarchyLayer.deletedAt))
		.groupBy(schema.organizationHierarchyLayer.id);
});

export const findLayerById = dbAction(async (id: number) => {
	const [layer] = await db
		.select({
			id: schema.organizationHierarchyLayer.id,
			nextLayerId: schema.organizationHierarchyLayer.nextLayerId,
			label: schema.organizationHierarchyLayer.label,
			sameLevelControlPolicy: schema.organizationHierarchyLayer.sameLevelControlPolicy,
			organizations: jsonAggDistinct(
				jsonBuildObject({
					id: schema.organization.id,
					name: schema.organization.name,
				}),
				schema.organization.id,
			),
		})
		.from(schema.organizationHierarchyLayer)
		.leftJoin(
			schema.organization,
			and(
				eq(schema.organization.layerId, schema.organizationHierarchyLayer.id),
				isNull(schema.organizationHierarchyLayer.deletedAt),
			),
		)
		.where(
			and(
				eq(schema.organizationHierarchyLayer.id, id),
				isNull(schema.organizationHierarchyLayer.deletedAt),
			),
		)
		.groupBy(schema.organizationHierarchyLayer.id)
		.limit(1);

	return layer;
});

export const insert = dbAction(
	async (data: {
		label: string;
		sameLevelControlPolicy: OrganizationSameLayerControlPolicy;
		nextLayerId?: number | null | undefined;
	}) => {
		return await db.transaction(async (tx) => {
			let previousStepId: number | null = null;

			const [previousStep] = await tx
				.update(schema.organizationHierarchyLayer)
				.set({ nextLayerId: null })
				.where(
					and(
						data.nextLayerId == null
							? isNull(schema.organizationHierarchyLayer.nextLayerId)
							: eq(schema.organizationHierarchyLayer.nextLayerId, data.nextLayerId),
						isNull(schema.organizationHierarchyLayer.deletedAt),
					),
				)
				.returning({ id: schema.organizationHierarchyLayer.id });

			if (previousStep != null) previousStepId = previousStep.id;

			const [inserted] = await tx
				.insert(schema.organizationHierarchyLayer)
				.values({
					label: data.label,
					sameLevelControlPolicy: data.sameLevelControlPolicy,
					nextLayerId: data.nextLayerId,
				})
				.returning({ id: schema.organizationHierarchyLayer.id });

			if (inserted == null) unreachable();

			if (previousStepId != null) {
				await tx
					.update(schema.organizationHierarchyLayer)
					.set({ nextLayerId: inserted.id })
					.where(
						and(
							ne(schema.organizationHierarchyLayer.id, inserted.id),
							isNull(schema.organizationHierarchyLayer.deletedAt),

							data.nextLayerId == null
								? isNull(schema.organizationHierarchyLayer.nextLayerId)
								: eq(schema.organizationHierarchyLayer.id, previousStepId),
						),
					);
			}

			return inserted;
		});
	},
);

export const remove = dbAction(async (layerId: number) => {
	return await db.transaction(async (tx) => {
		const [deleted] = await tx
			.update(schema.organizationHierarchyLayer)
			.set({ deletedAt: sql`now()` })
			.where(
				and(
					eq(schema.organizationHierarchyLayer.id, layerId),
					isNull(schema.organizationHierarchyLayer.deletedAt),
				),
			)
			.returning({ nextLayerId: schema.organizationHierarchyLayer.nextLayerId });

		if (deleted == null) unreachable();

		await tx
			.update(schema.organizationHierarchyLayer)
			.set({ nextLayerId: deleted.nextLayerId })
			.where(
				and(
					eq(schema.organizationHierarchyLayer.nextLayerId, layerId),
					isNull(schema.organizationHierarchyLayer.deletedAt),
				),
			);
	});
});

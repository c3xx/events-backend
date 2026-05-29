import { eq } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getOrganizationTypeChildrenTypes = dbAction(async (organizationTypeId: number) => {
	return await db
		.select({
			id: schema.organizationTypeAllowedParent.childTypeId,
			name: schema.organizationType.name,
		})
		.from(schema.organizationTypeAllowedParent)
		.innerJoin(
			schema.organizationType,
			eq(schema.organizationTypeAllowedParent.childTypeId, schema.organizationType.id),
		)
		.where(
			eq(schema.organizationTypeAllowedParent.parentTypeId, organizationTypeId),
			// note: no need of soft-check
		)
		.orderBy(schema.organizationTypeAllowedParent.createdAt);
});

export const addAllowedChildType = dbAction(
	async (data: { parentTypeId: number; childTypeId: number }) => {
		const [inserted] = await db
			.insert(schema.organizationTypeAllowedParent)
			.values({
				parentTypeId: data.parentTypeId,
				childTypeId: data.childTypeId,
			})
			.returning({
				parentTypeId: schema.organizationTypeAllowedParent.parentTypeId,
				childTypeId: schema.organizationTypeAllowedParent.childTypeId,
			});

		if (inserted == null) unreachable();

		return inserted;
	},
);

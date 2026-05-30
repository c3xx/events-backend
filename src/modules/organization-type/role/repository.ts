import { and, asc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getOrganizationTypeRoles = dbAction(async (organizationTypeId: number) => {
	return await db
		.select({
			id: schema.role.id,
			name: schema.role.name,
		})
		.from(schema.role)
		.where(
			and(
				eq(schema.role.managedEntityType, "organization"),
				eq(schema.role.typeRefId, organizationTypeId),
				isNull(schema.role.deletedAt),
			),
		)
		.orderBy(asc(schema.role.createdAt));
});

export const createOrganizationTypeRole = dbAction(
	async (
		organizationTypeId: number,
		data: {
			name: string;
		},
	) => {
		const [inserted] = await db
			.insert(schema.role)
			.values({
				name: data.name,
				managedEntityType: "organization",
				typeRefId: organizationTypeId,
			})
			.returning({ id: schema.role.id });

		if (inserted == null) unreachable();

		return inserted;
	},
);

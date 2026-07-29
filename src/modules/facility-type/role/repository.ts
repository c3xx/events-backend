import { and, asc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getFacilityTypeRoles = dbAction(async (facilityTypeId: number) => {
	return await db
		.select({
			id: schema.role.id,
			name: schema.role.name,
		})
		.from(schema.role)
		.where(
			and(
				eq(schema.role.managedEntityType, "facility"),
				eq(schema.role.typeRefId, facilityTypeId),
				isNull(schema.role.deletedAt),
			),
		)
		.orderBy(asc(schema.role.createdAt));
});

export const createFacilityTypeRole = dbAction(
	async (
		facilityTypeId: number,
		data: {
			name: string;
		},
	) => {
		const [inserted] = await db
			.insert(schema.role)
			.values({
				name: data.name,
				managedEntityType: "facility",
				typeRefId: facilityTypeId,
			})
			.returning({ id: schema.role.id });

		if (inserted == null) unreachable();

		return inserted;
	},
);

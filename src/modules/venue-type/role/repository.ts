import { and, asc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getVenueTypeRoles = dbAction(async (venueTypeId: number) => {
	return await db
		.select({
			id: schema.role.id,
			name: schema.role.name,
		})
		.from(schema.role)
		.where(
			and(
				eq(schema.role.managedEntityType, "venue"),
				eq(schema.role.typeRefId, venueTypeId),
				isNull(schema.role.deletedAt),
			),
		)
		.orderBy(asc(schema.role.createdAt));
});

export const createVenueTypeRole = dbAction(
	async (
		venueTypeId: number,
		data: {
			name: string;
		},
	) => {
		const [inserted] = await db
			.insert(schema.role)
			.values({
				name: data.name,
				managedEntityType: "venue",
				typeRefId: venueTypeId,
			})
			.returning({ id: schema.role.id });

		if (inserted == null) unreachable();

		return inserted;
	},
);

import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const addFacilityProvider = dbAction(
	async (
		facilityId: number,
		data: {
			providerEntityType: FacilityProviderEntityType;
			providerEntityId: number;
		},
	) => {
		const [provider] = await db
			.insert(schema.facilityProvider)
			.values({
				facilityId: facilityId,
				providerEntityType: data.providerEntityType,
				providerEntityRefId: data.providerEntityId,
			})
			.returning({ id: schema.facilityProvider.id });

		if (provider == null) unreachable();

		return provider;
	},
);

export const removeFacilityProvider = dbAction(async (facilityId: number, providerId: number) => {
	await db
		.update(schema.facilityProvider)
		.set({
			deletedAt: sql`now`,
		})
		.where(
			and(
				eq(schema.facilityProvider.id, providerId),
				eq(schema.facilityProvider.facilityId, facilityId),
			),
		);
});

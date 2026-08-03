import { and, eq, isNull, sql } from "drizzle-orm";
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

export const removeFacilityProvider = dbAction(
	async (
		facilityId: number,
		data: {
			providerId: number;
			markAsUnavailable: boolean;
		},
	) => {
		await db.transaction(async (tx) => {
			await tx
				.update(schema.facilityProvider)
				.set({ deletedAt: sql`now` })
				.where(
					and(
						eq(schema.facilityProvider.id, data.providerId),
						eq(schema.facilityProvider.facilityId, facilityId),
					),
				);

			const providers = await tx
				.select({ id: schema.facilityProvider.id })
				.from(schema.facilityProvider)
				.where(
					and(
						eq(schema.facilityProvider.facilityId, facilityId),
						isNull(schema.facilityProvider.deletedAt),
					),
				);

			if (providers.length === 0)
				await tx
					.update(schema.facility)
					.set({ isAvailable: false })
					.where(and(eq(schema.facility.id, facilityId), isNull(schema.facility.deletedAt)));
		});
	},
);

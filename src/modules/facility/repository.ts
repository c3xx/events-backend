import { and, eq, isNull, sql } from "drizzle-orm";
import { jsonAgg, jsonBuildObject } from "@/db/helpers.js";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const findFacilities = dbAction(async () => {
	return await db
		.select({
			id: schema.facility.id,
			name: schema.facility.name,
			type: jsonBuildObject({
				id: schema.facilityType.id,
				name: schema.facilityType.name,
			}),
			isAvailable: schema.facility.isAvailable,
			providers: jsonAgg(
				jsonBuildObject({
					id: schema.facilityProvider.id,
					scope: sql<{
						type: FacilityProviderEntityType; // todo: search for this and add "facility" where matterss
						id: number;
						name: string;
						kind: {
							id: number;
							name: string;
						};
					}>`case
					when ${schema.facilityProvider.providerEntityType} = 'organization'
					then (
						select
							json_build_object(
								'type', ${schema.facilityProvider.providerEntityType},
								'id', o.id,
								'name', o.name,
								'kind', json_build_object(
									'id', ot.id,
									'name', ot.name
								)
							)
						from organization o
						inner join organization_type ot on o.organization_type_id = ot.id
						where o.id = ${schema.facilityProvider.providerEntityRefId}
						limit 1
					)
					when ${schema.facilityProvider.providerEntityType} = 'venue'
					then (
						select
							json_build_object(
								'type', ${schema.facilityProvider.providerEntityType},
								'id', v.id,
								'name', v.name,
								'kind', json_build_object(
									'id', vt.id,
									'name', vt.name
								)
							)
						from venue v
						inner join venue_type vt on v.venue_type_id = vt.id
						where v.id = ${schema.facilityProvider.providerEntityRefId}
						limit 1
					)
					else null
				end`,
				}),
				schema.facilityProvider.id,
			),
		})
		.from(schema.facility)
		.innerJoin(
			schema.facilityType,
			and(
				eq(schema.facility.typeId, schema.facilityType.id),
				isNull(schema.facilityType.deletedAt),
			),
		)
		.leftJoin(
			schema.facilityProvider,
			and(
				eq(schema.facilityProvider.facilityId, schema.facility.id),
				isNull(schema.facilityProvider.deletedAt),
			),
		)
		.where(isNull(schema.facility.deletedAt))
		.groupBy(schema.facility.id, schema.facilityType.id);
});

export const insertFacility = dbAction(async (data: { name: string; typeId: number }) => {
	const [inserted] = await db
		.insert(schema.facility)
		.values({
			name: data.name,
			typeId: data.typeId,
			isAvailable: false,
		})
		.returning({ id: schema.facility.id });

	if (inserted == null) unreachable();

	return inserted;
});

export const findFacilityById = dbAction(async (id: number) => {
	const [facility] = await db
		.select({
			id: schema.facility.id,
			name: schema.facility.name,
			type: jsonBuildObject({
				id: schema.facilityType.id,
				name: schema.facilityType.name,
			}),
			isAvailable: schema.facility.isAvailable,
			providers: jsonAgg(
				jsonBuildObject({
					id: schema.facilityProvider.id,
					scope: sql<{
						type: FacilityProviderEntityType; // todo: search for this and add "facility" where matterss
						id: number;
						name: string;
						kind: {
							id: number;
							name: string;
						};
					}>`case
					when ${schema.facilityProvider.providerEntityType} = 'organization'
					then (
						select
							json_build_object(
								'type', ${schema.facilityProvider.providerEntityType},
								'id', o.id,
								'name', o.name,
								'kind', json_build_object(
									'id', ot.id,
									'name', ot.name
								)
							)
						from organization o
						inner join organization_type ot on o.organization_type_id = ot.id
						where o.id = ${schema.facilityProvider.providerEntityRefId}
						limit 1
					)
					when ${schema.facilityProvider.providerEntityType} = 'venue'
					then (
						select
							json_build_object(
								'type', ${schema.facilityProvider.providerEntityType},
								'id', v.id,
								'name', v.name,
								'kind', json_build_object(
									'id', vt.id,
									'name', vt.name
								)
							)
						from venue v
						inner join venue_type vt on v.venue_type_id = vt.id
						where v.id = ${schema.facilityProvider.providerEntityRefId}
						limit 1
					)
					else null
				end`,
				}),
				schema.facilityProvider.id,
			),
		})
		.from(schema.facility)
		.innerJoin(
			schema.facilityType,
			and(
				eq(schema.facility.typeId, schema.facilityType.id),
				isNull(schema.facilityType.deletedAt),
			),
		)
		.leftJoin(
			schema.facilityProvider,
			and(
				eq(schema.facilityProvider.facilityId, schema.facility.id),
				isNull(schema.facilityProvider.deletedAt),
			),
		)
		.where(and(eq(schema.facility.id, id), isNull(schema.facility.deletedAt)))
		.groupBy(schema.facility.id, schema.facilityType.id)
		.limit(1);

	return facility;
});

export const changeAvailability = dbAction(
	async (facilityId: number, data: { availability: boolean }) => {
		await db
			.update(schema.facility)
			.set({
				isAvailable: data.availability,
			})
			.where(and(eq(schema.facility.id, facilityId), isNull(schema.facility.deletedAt)));
	},
);

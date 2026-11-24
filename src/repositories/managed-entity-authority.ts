import { and, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { jsonAgg, jsonBuildObject } from "@/db/helpers.js";
import { db, schema } from "@/db/index.js";
import { InternalError } from "@/lib/errors.js";
import { dbAction } from "@/lib/helpers.js";

// todo: reuse this
function matchingScopeDetailsQuery<T extends ManagedEntityType>(
	typeCol: PgColumn,
	refIdCol: PgColumn,
	typesFilter: T[],
): SQL<{
	type: T; // = ManagedEntityType
	id: IdLike;
	name: string;
	kind: { id: IdLike; name: string };
}> {
	if (typesFilter.length === 0)
		throw new Error("filter list should either be undefined or have at least one value.");

	const cases: SQL[] = [];

	const filter: readonly ManagedEntityType[] = typesFilter;

	if (filter.includes("organization")) {
		cases.push(sql`when ${typeCol} = 'organization' then (
			select json_build_object(
				'type', 'organization',
				'id', o.id,
				'name', o.name,
				'kind', json_build_object('id', ot.id, 'name', ot.name)
			)
			from organization o
			inner join organization_type ot on o.organization_type_id = ot.id and ot.deleted_at is null
			where o.id = ${refIdCol} and o.deleted_at is null
			limit 1
		)`);
	}

	if (filter.includes("venue")) {
		cases.push(sql`when ${typeCol} = 'venue' then (
			select json_build_object(
				'type', 'venue',
				'id', v.id,
				'name', v.name,
				'kind', json_build_object('id', vt.id, 'name', vt.name)
			)
			from venue v
			inner join venue_type vt on v.venue_type_id = vt.id and vt.deleted_at is null
			where v.id = ${refIdCol} and v.deleted_at is null
			limit 1
		)`);
	}

	if (filter.includes("facility")) {
		cases.push(sql`when ${typeCol} = 'facility' then (
			select json_build_object(
				'type', 'facility',
				'id', f.id,
				'name', f.name,
				'kind', json_build_object('id', ft.id, 'name', ft.name)
			)
			from facility f
			inner join facility_type ft on f.type_id = ft.id and ft.deleted_at is null
			where f.id = ${refIdCol} and f.deleted_at is null
			limit 1
		)`);
	}

	// todo: handle this null?
	return sql`case ${sql.join(cases, sql.raw(" "))} else null end` satisfies SQL<{
		type: T; // = ManagedEntityType
		id: IdLike;
		name: string;
		kind: { id: IdLike; name: string };
	}>;
}

/** Find all authority holders of the given subject, optionally with permissions required */
export const findAllAuthorityHolders = dbAction(
	async (
		data: {
			subjectType: ManagedEntityType;
			subjectRefId: number;
		},
		filters?: {
			holderTypes?: ManagedEntityType[];
			withPermissions?: AuthorityPermissionCode[];
			holderRefIds?: IdLike[];
		},
	) => {
		// todo: @think what should happen if any of the filters are empty arrays?

		if (filters?.holderTypes?.length === 0 || filters?.holderRefIds?.length === 0) return [];

		const requiredPermissions = filters?.withPermissions?.length
			? [...new Set(filters.withPermissions)]
			: undefined;

		return await db
			.select({
				id: schema.managedEntityAuthority.id,
				scope: matchingScopeDetailsQuery(
					schema.managedEntityAuthority.holderType,
					schema.managedEntityAuthority.holderRefId,
					filters?.holderTypes != null && filters.holderTypes.length > 0
						? filters.holderTypes
						: ["organization", "venue", "facility"],
				),
			})
			.from(schema.managedEntityAuthority)
			.leftJoin(
				schema.managedEntityAuthorityPermission,
				eq(schema.managedEntityAuthorityPermission.authorityId, schema.managedEntityAuthority.id),
			)
			.leftJoin(
				schema.permission,
				eq(schema.managedEntityAuthorityPermission.permissionId, schema.permission.id),
			)
			.where(
				and(
					eq(schema.managedEntityAuthority.subjectType, data.subjectType),
					filters?.holderTypes != null
						? inArray(schema.managedEntityAuthority.holderType, filters.holderTypes)
						: undefined,
					filters?.holderRefIds != null
						? inArray(schema.managedEntityAuthority.holderRefId, filters.holderRefIds)
						: undefined,
					eq(schema.managedEntityAuthority.subjectRefId, data.subjectRefId),
					isNull(schema.managedEntityAuthority.deletedAt),
				),
			)
			.groupBy(schema.managedEntityAuthority.id)
			.having(
				requiredPermissions != null && requiredPermissions.length > 0
					? sql`count(distinct ${schema.permission.code}) filter (where ${inArray(schema.permission.code, requiredPermissions)}) = ${requiredPermissions.length}`
					: undefined,
			);
	},
);

export const hasAuthorityHolder = dbAction(
	async (
		data: {
			subjectType: ManagedEntityType;
			subjectRefId: number;
		},
		filters?: {
			holderTypes?: ManagedEntityType[];
			withPermissions?: AuthorityPermissionCode[];
			holderRefIds?: IdLike[];
		},
	) => {
		if (filters?.holderTypes?.length === 0 || filters?.holderRefIds?.length === 0) return false;

		const requiredPermissions = filters?.withPermissions?.length
			? [...new Set(filters.withPermissions)]
			: undefined;

		const [result] = await db
			.select({
				id: schema.managedEntityAuthority.id,
			})
			.from(schema.managedEntityAuthority)
			.leftJoin(
				schema.managedEntityAuthorityPermission,
				eq(schema.managedEntityAuthorityPermission.authorityId, schema.managedEntityAuthority.id),
			)
			.leftJoin(
				schema.permission,
				eq(schema.managedEntityAuthorityPermission.permissionId, schema.permission.id),
			)
			.where(
				and(
					eq(schema.managedEntityAuthority.subjectType, data.subjectType),
					eq(schema.managedEntityAuthority.subjectRefId, data.subjectRefId),
					isNull(schema.managedEntityAuthority.deletedAt),
					filters?.holderTypes != null
						? inArray(schema.managedEntityAuthority.holderType, filters.holderTypes)
						: undefined,
					filters?.holderRefIds != null
						? inArray(schema.managedEntityAuthority.holderRefId, filters.holderRefIds)
						: undefined,
				),
			)
			.groupBy(schema.managedEntityAuthority.id)
			.having(
				requiredPermissions
					? sql`count(distinct ${schema.permission.code}) filter (
							where ${inArray(schema.permission.code, requiredPermissions)}
						) = ${requiredPermissions.length}`
					: undefined,
			)
			.limit(1);

		return result != null;
	},
);

export const insertAuthorityRelation = dbAction(
	async (data: {
		subjectType: ManagedEntityType;
		subjectRefId: IdLike;
		holderType: ManagedEntityType;
		holderRefId: IdLike;
	}) => {
		await db.insert(schema.managedEntityAuthority).values({
			holderType: data.holderType,
			holderRefId: data.holderRefId,
			subjectType: data.subjectType,
			subjectRefId: data.subjectRefId,
		});
	},
);

export const findAuthorityRelation = dbAction(
	async (data: { subjectType: ManagedEntityType; subjectRefId: IdLike; authorityId: IdLike }) => {
		const [authority, ...rest] = await db
			.select({
				id: schema.managedEntityAuthority.id,
				scope: matchingScopeDetailsQuery(
					schema.managedEntityAuthority.holderType,
					schema.managedEntityAuthority.holderRefId,
					["organization", "venue", "facility"],
				),
				permissions: jsonAgg(
					jsonBuildObject({
						code: sql<AuthorityPermissionCode>`${schema.permission.code}`,
						description: schema.permission.description,
					}),
					schema.permission.id,
				),
			})
			.from(schema.managedEntityAuthority)
			.leftJoin(
				schema.managedEntityAuthorityPermission,
				eq(schema.managedEntityAuthorityPermission.authorityId, schema.managedEntityAuthority.id),
			)
			.leftJoin(
				schema.permission,
				eq(schema.managedEntityAuthorityPermission.permissionId, schema.permission.id),
			)
			.groupBy(schema.managedEntityAuthority.id)
			.where(
				and(
					eq(schema.managedEntityAuthority.id, data.authorityId),
					eq(schema.managedEntityAuthority.subjectType, data.subjectType),
					eq(schema.managedEntityAuthority.subjectRefId, data.subjectRefId),
					isNull(schema.managedEntityAuthority.deletedAt),
				),
			)
			.limit(2);

		if (rest.length > 0)
			throw new Error("Found duplicate authority relations that should not have happened");

		return authority;
	},
);

export const removeAuthorityRelation = dbAction(
	async (data: { subjectType: ManagedEntityType; subjectRefId: IdLike; authorityId: IdLike }) => {
		await db
			.update(schema.managedEntityAuthority)
			.set({ deletedAt: sql`now()` })
			.where(
				and(
					eq(schema.managedEntityAuthority.id, data.authorityId),
					eq(schema.managedEntityAuthority.subjectType, data.subjectType),
					eq(schema.managedEntityAuthority.subjectRefId, data.subjectRefId),
					isNull(schema.managedEntityAuthority.deletedAt),
				),
			);

		// todo: thinking about it now, shouldn't i return whether this was
		// successful or not? by simply comparing the affected row count to 1 or
		// something?
	},
);

export const assignPermissionToAuthority = dbAction(
	async (data: { authorityId: IdLike; permissionCode: AuthorityPermissionCode }) => {
		const inserted = await db
			.insert(schema.managedEntityAuthorityPermission)
			.values({
				authorityId: data.authorityId,
				permissionId: sql<number>`(${db
					.select({ id: schema.permission.id })
					.from(schema.permission)
					.where(eq(schema.permission.code, data.permissionCode))})`,
			})
			.returning({ id: schema.managedEntityAuthorityPermission.id });

		if (inserted.length === 0)
			throw new InternalError(`Could not find the expected permission: ${data.permissionCode}`);
	},
);

export const revokePermissionToAuthority = dbAction(
	async (data: { authorityId: IdLike; permissionCode: AuthorityPermissionCode }) => {
		const deleted = await db
			.delete(schema.managedEntityAuthorityPermission)
			.where(
				and(
					eq(schema.managedEntityAuthorityPermission.authorityId, data.authorityId),
					inArray(
						schema.managedEntityAuthorityPermission.permissionId,
						db
							.select({ id: schema.permission.id })
							.from(schema.permission)
							.where(eq(schema.permission.code, data.permissionCode)),
					),
				),
			)
			.returning({ id: schema.managedEntityAuthorityPermission.id });

		return deleted.length > 0;
	},
);

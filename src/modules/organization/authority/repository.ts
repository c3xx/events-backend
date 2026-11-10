import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { jsonAgg, jsonBuildObject } from "@/db/helpers.js";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";

export const findAll = dbAction(
	async (subjectOrganizationId: number, withPermissions?: AuthorityPermissionCode[]) => {
		return await db
			.select({
				id: schema.managedEntityAuthority.id,
				organization: jsonBuildObject({
					id: schema.organization.id,
					name: schema.organization.name,
					type: jsonBuildObject({
						id: schema.organizationType.id,
						name: schema.organizationType.name,
					}),
				}),
			})
			.from(schema.managedEntityAuthority)
			.innerJoin(
				schema.organization,
				and(
					eq(schema.organization.id, schema.managedEntityAuthority.holderRefId),
					isNull(schema.organization.deletedAt),
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
				schema.managedEntityAuthorityPermission,
				eq(schema.managedEntityAuthorityPermission.authorityId, schema.managedEntityAuthority.id),
			)
			.leftJoin(
				schema.permission,
				eq(schema.managedEntityAuthorityPermission.permissionId, schema.permission.id),
			)
			.groupBy(schema.organization.id, schema.organizationType.id, schema.managedEntityAuthority.id)
			.having(
				withPermissions?.length
					? sql`count(distinct ${schema.permission.code}) filter (where ${inArray(schema.permission.code, withPermissions)}) = ${withPermissions.length}`
					: undefined,
			)
			.where(
				and(
					// note: only organization-to-organization power is implemented right now.
					// if this is no longer the case, then please remove these type comparisons
					eq(schema.managedEntityAuthority.holderType, "organization"),
					eq(schema.managedEntityAuthority.subjectType, "organization"),
					eq(schema.managedEntityAuthority.subjectRefId, subjectOrganizationId),
					isNull(schema.managedEntityAuthority.deletedAt),
				),
			);
	},
);

export const insert = dbAction(
	async (subjectOrganizationId: IdLike, holderOrganizationId: IdLike) => {
		await db.insert(schema.managedEntityAuthority).values({
			holderType: "organization",
			holderRefId: holderOrganizationId,
			subjectType: "organization",
			subjectRefId: subjectOrganizationId,
		});
	},
);

export const find = dbAction(async (subjectOrganizationId: IdLike, authorityId: IdLike) => {
	const [authority] = await db
		.select({
			id: schema.managedEntityAuthority.id,
			organization: jsonBuildObject({
				id: schema.organization.id,
				name: schema.organization.name,
				type: jsonBuildObject({
					id: schema.organizationType.id,
					name: schema.organizationType.name,
				}),
			}),
			permissions: jsonAgg(
				jsonBuildObject({
					code: schema.permission.code,
					description: schema.permission.description,
				}),
				schema.permission.id,
			),
		})
		.from(schema.managedEntityAuthority)
		.innerJoin(
			schema.organization,
			and(
				eq(schema.organization.id, schema.managedEntityAuthority.holderRefId),
				isNull(schema.organization.deletedAt),
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
			schema.managedEntityAuthorityPermission,
			eq(schema.managedEntityAuthorityPermission.authorityId, schema.managedEntityAuthority.id),
		)
		.leftJoin(
			schema.permission,
			eq(schema.managedEntityAuthorityPermission.permissionId, schema.permission.id),
		)
		.groupBy(schema.organization.id, schema.organizationType.id, schema.managedEntityAuthority.id)
		.where(
			and(
				eq(schema.managedEntityAuthority.id, authorityId),
				eq(schema.managedEntityAuthority.holderType, "organization"),
				eq(schema.managedEntityAuthority.subjectType, "organization"),
				eq(schema.managedEntityAuthority.subjectRefId, subjectOrganizationId),
				isNull(schema.managedEntityAuthority.deletedAt),
			),
		);

	return authority;
});

export const remove = dbAction(async (authorityId: IdLike) => {
	await db
		.update(schema.managedEntityAuthority)
		.set({ deletedAt: sql`now()` })
		.where(
			and(
				eq(schema.managedEntityAuthority.id, authorityId),
				eq(schema.managedEntityAuthority.holderType, "organization"), // simply just locking in to organizations
				eq(schema.managedEntityAuthority.subjectType, "organization"),
				isNull(schema.managedEntityAuthority.deletedAt),
			),
		);

	// todo: thinking about it now, shouldn't i return whether this was
	// successful or not? by simply comparing the affected row count to 1 or
	// something?
});

import { schema } from "@/db/index.js";
import { isPermission } from "@/lib/helpers.js";
import type { ExistingData } from "../seed-yaml.js";
import type { PlanUpdatesResult } from "./diff.js";
import { getOrCreateManagedEntity, ok, section } from "./helpers.js";
import type { PlannedUpdate, ResolvedIds, SeedConfig, TxClient } from "./schema.js";

export async function runSeedingSteps(
	tx: TxClient,
	config: SeedConfig,
	approvedUpdates: PlannedUpdate[],
	existing: ExistingData,
	diffResult: PlanUpdatesResult,
) {
	const {
		orgTypeByName,
		orgByName,
		orgTypeNameById,
		venueTypeByName,
		venueTypeNameById,
		facilityByName,
		venueByName,
		userByEmail,
		permissionIdByCode,
		roleByKey,
	} = diffResult;

	// Organization Types
	section("Organization types");
	const orgTypeIdByName = new Map<string, number>();
	for (const [name, row] of orgTypeByName.entries()) {
		orgTypeIdByName.set(name, row.id);
	}

	const orgTypesToInsert = config.organization_types.filter((ot) => !orgTypeIdByName.has(ot.name));
	if (orgTypesToInsert.length > 0) {
		const inserted = await tx
			.insert(schema.organizationType)
			.values(orgTypesToInsert.map((ot) => ({ name: ot.name })))
			.returning();
		for (const row of inserted) {
			orgTypeIdByName.set(row.name, row.id);
			orgTypeNameById.set(row.id, row.name);
		}
		ok(`inserted ${inserted.length} new organization type(s)`);
	}

	const existingPairs = await tx.select().from(schema.organizationTypeAllowedParent);
	const existingPairKeys = new Set(existingPairs.map((p) => `${p.childTypeId}:${p.parentTypeId}`));

	const pairsToInsert: Array<{ childTypeId: number; parentTypeId: number }> = [];
	for (const ot of config.organization_types) {
		const childTypeId = orgTypeIdByName.get(ot.name);
		if (childTypeId == null) continue;

		for (const parentName of ot.allowed_parents ?? []) {
			const parentTypeId = orgTypeIdByName.get(parentName);
			if (parentTypeId == null) {
				throw new Error(
					`organization_types: "${ot.name}" declares allowed_parent "${parentName}" which is not defined anywhere in organization_types`,
				);
			}
			const key = `${childTypeId}:${parentTypeId}`;
			if (!existingPairKeys.has(key)) {
				pairsToInsert.push({ childTypeId, parentTypeId });
				existingPairKeys.add(key);
			}
		}
	}
	if (pairsToInsert.length > 0) {
		await tx.insert(schema.organizationTypeAllowedParent).values(pairsToInsert);
		ok(`inserted ${pairsToInsert.length} new allowed-parent relationship(s)`);
	}

	// Organizations
	section("Organizations");
	const orgIdByName = new Map<string, number>();
	for (const [name, row] of orgByName.entries()) {
		orgIdByName.set(name, row.id);
	}

	const orgTypeIdByOrgName = new Map<string, number>();
	for (const row of existing.orgs) {
		orgTypeIdByOrgName.set(row.name, row.organizationTypeId);
	}

	let insertedOrgsCount = 0;
	for (const org of config.organizations) {
		if (!orgIdByName.has(org.name)) {
			const typeId = orgTypeIdByName.get(org.type);
			if (typeId == null) {
				throw new Error(
					`organizations: "${org.name}" has type "${org.type}" which is not defined in organization_types`,
				);
			}
			let parentId: number | null = null;
			if (org.parent) {
				const resolvedParentId = orgIdByName.get(org.parent);
				if (resolvedParentId == null) {
					throw new Error(
						`organizations: parent organization "${org.parent}" for "${org.name}" was not found`,
					);
				}
				parentId = resolvedParentId;
			}
			const [inserted] = await tx
				.insert(schema.organization)
				.values({
					name: org.name,
					organizationTypeId: typeId,
					parentOrganizationId: parentId,
				})
				.returning();
			if (inserted == null) {
				throw new Error(`Failed to insert organization "${org.name}"`);
			}
			orgIdByName.set(org.name, inserted.id);
			orgTypeIdByOrgName.set(org.name, typeId);
			insertedOrgsCount++;
		}
	}
	if (insertedOrgsCount > 0) {
		ok(`inserted ${insertedOrgsCount} new organization(s)`);
	}

	// Venue Types
	section("Venue types");
	const venueTypeIdByName = new Map<string, number>();
	for (const [name, row] of venueTypeByName.entries()) {
		venueTypeIdByName.set(name, row.id);
	}

	const venueTypesToInsert = config.venue_types.filter((name) => !venueTypeIdByName.has(name));
	if (venueTypesToInsert.length > 0) {
		const inserted = await tx
			.insert(schema.venueType)
			.values(venueTypesToInsert.map((name) => ({ name })))
			.returning();
		for (const row of inserted) {
			venueTypeIdByName.set(row.name, row.id);
			venueTypeNameById.set(row.id, row.name);
		}
		ok(`inserted ${inserted.length} new venue type(s)`);
	}

	// Facilities
	section("Facilities");
	const facilityIdByName = new Map<string, number>();
	for (const [name, row] of facilityByName.entries()) {
		facilityIdByName.set(name, row.id);
	}

	const facilitiesToInsert = config.facilities.filter((name) => !facilityIdByName.has(name));
	if (facilitiesToInsert.length > 0) {
		const inserted = await tx
			.insert(schema.facility)
			.values(facilitiesToInsert.map((name) => ({ name })))
			.returning();
		for (const row of inserted) {
			facilityIdByName.set(row.name, row.id);
		}
		ok(`inserted ${facilitiesToInsert.length} new facility/facilities`);
	}

	// Venues
	section("Venues");
	const venueIdByName = new Map<string, number>();
	for (const [name, row] of venueByName.entries()) {
		venueIdByName.set(name, row.id);
	}

	const venueTypeIdByVenueName = new Map<string, number>();
	for (const row of existing.venues) {
		venueTypeIdByVenueName.set(row.name, row.venueTypeId);
	}

	const venuesToInsert: Array<typeof schema.venue.$inferInsert> = [];
	for (const venue of config.venues) {
		if (!venueIdByName.has(venue.name)) {
			const venueTypeId = venueTypeIdByName.get(venue.type);
			if (venueTypeId == null) {
				throw new Error(
					`venues: "${venue.name}" has type "${venue.type}" which is not defined in venue_types`,
				);
			}
			const orgId = venue.organization ? orgIdByName.get(venue.organization) : null;
			venuesToInsert.push({
				name: venue.name,
				venueTypeId,
				organizationId: orgId,
				accessLevel: venue.access_level ?? "public",
				isAvailable: venue.is_available,
				unavailabilityReason: venue.unavailability_reason ?? null,
				maxCapacity: venue.max_capacity,
			});
		}
	}

	if (venuesToInsert.length > 0) {
		const inserted = await tx.insert(schema.venue).values(venuesToInsert).returning();
		for (const row of inserted) {
			venueIdByName.set(row.name, row.id);
			venueTypeIdByVenueName.set(row.name, row.venueTypeId);
		}
		ok(`inserted ${inserted.length} new venue(s)`);
	}

	const existingLinks = await tx.select().from(schema.venueFacility);
	const existingLinkKeys = new Set(existingLinks.map((l) => `${l.venueId}:${l.facilityId}`));

	const linksToInsert: Array<{ venueId: number; facilityId: number }> = [];
	for (const venue of config.venues) {
		const venueId = venueIdByName.get(venue.name);
		if (venueId == null) continue;

		for (const facilityName of venue.facilities ?? []) {
			const facilityId = facilityIdByName.get(facilityName);
			if (facilityId == null) {
				throw new Error(
					`venues: "${venue.name}" references facility "${facilityName}", which is not defined in facilities`,
				);
			}
			const key = `${venueId}:${facilityId}`;
			if (!existingLinkKeys.has(key)) {
				linksToInsert.push({ venueId, facilityId });
				existingLinkKeys.add(key);
			}
		}
	}
	if (linksToInsert.length > 0) {
		await tx.insert(schema.venueFacility).values(linksToInsert);
		ok(`linked ${linksToInsert.length} new venue-facility association(s)`);
	}

	// Roles & Permissions
	section("Roles & permissions");
	const roleIdByKey = new Map<string, number>();
	for (const [key, row] of roleByKey.entries()) {
		roleIdByKey.set(key, row.id);
	}

	let insertedRolesCount = 0;
	const permissionLinksToInsert: Array<{
		roleId: number;
		permissionId: number;
	}> = [];

	for (const role of config.roles) {
		const typeRefId =
			role.managed_entity_type === "organization"
				? orgTypeIdByName.get(role.type_ref)
				: venueTypeIdByName.get(role.type_ref);

		if (typeRefId == null) {
			throw new Error(
				`roles: "${role.name}" has type_ref "${role.type_ref}" which is not defined in ` +
					(role.managed_entity_type === "organization" ? "organization_types" : "venue_types"),
			);
		}

		const key = `${role.managed_entity_type}:${role.type_ref}:${role.name}`;
		let roleId: number;

		if (!roleIdByKey.has(key)) {
			const [inserted] = await tx
				.insert(schema.role)
				.values({
					name: role.name,
					managedEntityType: role.managed_entity_type,
					typeRefId,
				})
				.returning();
			if (inserted == null) {
				throw new Error(`Failed to insert role "${role.name}"`);
			}
			roleId = inserted.id;
			roleIdByKey.set(key, roleId);
			insertedRolesCount++;
		} else {
			const id = roleIdByKey.get(key);
			if (id == null) {
				throw new Error(`Role ID not found for key "${key}"`);
			}
			roleId = id;
		}

		const existingRolePermissions = await tx.select().from(schema.rolePermission);
		const existingRolePermissionKeys = new Set(
			existingRolePermissions.map((rp) => `${rp.roleId}:${rp.permissionId}`),
		);

		for (const permissionCode of role.permissions ?? []) {
			if (!isPermission(permissionCode)) {
				throw new Error(
					`roles: "${role.name}" references unknown permission "${permissionCode}". ` +
						`Check for typos, or add it to PERMISSION in src/lib/constants.ts.`,
				);
			}
			const permissionId = permissionIdByCode.get(permissionCode);
			if (permissionId == null) {
				throw new Error(
					`roles: "${role.name}" references permission "${permissionCode}", which does not exist in the ` +
						`database yet. Run "pnpm db:populate" first to sync permissions.`,
				);
			}
			const linkKey = `${roleId}:${permissionId}`;
			if (!existingRolePermissionKeys.has(linkKey)) {
				permissionLinksToInsert.push({ roleId, permissionId });
				existingRolePermissionKeys.add(linkKey);
			}
		}
	}

	if (insertedRolesCount > 0) {
		ok(`inserted ${insertedRolesCount} new role(s)`);
	}
	if (permissionLinksToInsert.length > 0) {
		await tx.insert(schema.rolePermission).values(permissionLinksToInsert);
		ok(`linked ${permissionLinksToInsert.length} new role-permission association(s)`);
	}

	// Users
	section("Users");
	const userIdByEmail = new Map<string, number>();
	for (const [email, row] of userByEmail.entries()) {
		userIdByEmail.set(email, row.id);
	}

	const usersToInsert: Array<typeof schema.user.$inferInsert> = [];
	for (const user of config.users) {
		if (!userIdByEmail.has(user.email)) {
			usersToInsert.push({
				fullName: user.full_name,
				email: user.email,
				type: user.type,
			});
		}
	}

	if (usersToInsert.length > 0) {
		const inserted = await tx.insert(schema.user).values(usersToInsert).returning();
		for (const row of inserted) {
			userIdByEmail.set(row.email, row.id);
		}
		ok(`inserted ${inserted.length} new user(s)`);
	}

	// Apply Updates & Restores
	const resolvedIds: ResolvedIds = {
		orgTypes: orgTypeIdByName,
		orgs: orgIdByName,
		venueTypes: venueTypeIdByName,
		facilities: facilityIdByName,
		venues: venueIdByName,
		roles: roleIdByKey,
		users: userIdByEmail,
	};

	for (const update of approvedUpdates) {
		await update.apply(tx, resolvedIds);
	}
	if (approvedUpdates.length > 0) {
		ok(`applied ${approvedUpdates.length} update/restore operation(s)`);
	}

	// User Role Assignments
	const existingUserRoles = await tx.select().from(schema.userRole);
	const existingUserRoleKeys = new Set(
		existingUserRoles.map((ur) => `${ur.userId}:${ur.roleId}:${ur.managedEntityId}`),
	);

	const managedEntityIdCache = new Map<string, number>();
	async function resolveManagedEntityId(
		type: "organization" | "venue",
		refId: number,
	): Promise<number> {
		const cacheKey = `${type}:${refId}`;
		const cached = managedEntityIdCache.get(cacheKey);
		if (cached != null) return cached;

		const id = await getOrCreateManagedEntity(tx, type, refId);
		managedEntityIdCache.set(cacheKey, id);
		return id;
	}

	const assignmentsToInsert: Array<{
		userId: number;
		roleId: number;
		managedEntityId: number;
	}> = [];

	for (const user of config.users) {
		const userId = userIdByEmail.get(user.email);
		if (userId == null) continue;

		for (const assignment of user.roles ?? []) {
			let entityId: number | undefined;
			let entityTypeRefId: number | undefined;

			if (assignment.managed_entity_type === "organization") {
				entityId = orgIdByName.get(assignment.entity_name);
				entityTypeRefId =
					entityId != null ? orgTypeIdByOrgName.get(assignment.entity_name) : undefined;
			} else {
				entityId = venueIdByName.get(assignment.entity_name);
				entityTypeRefId =
					entityId != null ? venueTypeIdByVenueName.get(assignment.entity_name) : undefined;
			}

			if (entityId == null || entityTypeRefId == null) {
				throw new Error(
					`users: "${user.email}" has a role assignment referencing ${assignment.managed_entity_type} ` +
						`"${assignment.entity_name}", which was not found`,
				);
			}

			const typeRefName =
				assignment.managed_entity_type === "organization"
					? orgTypeNameById.get(entityTypeRefId)
					: venueTypeNameById.get(entityTypeRefId);

			if (typeRefName == null) {
				throw new Error(`Type name not found for type ID ${entityTypeRefId}`);
			}

			const roleKey = `${assignment.managed_entity_type}:${typeRefName}:${assignment.role}`;
			const roleId = roleIdByKey.get(roleKey);
			if (roleId == null) {
				throw new Error(
					`users: "${user.email}" has a role assignment referencing role "${assignment.role}" for ` +
						`${assignment.managed_entity_type} type of "${assignment.entity_name}", which is not defined in roles`,
				);
			}

			const managedEntityId = await resolveManagedEntityId(
				assignment.managed_entity_type,
				entityId,
			);
			const key = `${userId}:${roleId}:${managedEntityId}`;
			if (!existingUserRoleKeys.has(key)) {
				assignmentsToInsert.push({ userId, roleId, managedEntityId });
				existingUserRoleKeys.add(key);
			}
		}
	}
	if (assignmentsToInsert.length > 0) {
		await tx.insert(schema.userRole).values(assignmentsToInsert);
		ok(`assigned ${assignmentsToInsert.length} new user-role association(s)`);
	}
}

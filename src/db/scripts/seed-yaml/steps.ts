import { and, eq, isNull } from "drizzle-orm";
import { type db, schema } from "@/db/index.js";
import { FLATTENED_PERMISSIONS } from "@/lib/constants.js";
import { assert, getOrCreateManagedEntity } from "./helpers.js";
import type { SeedConfig } from "./schemas.js";

type TxClient = typeof db | DbTransaction;

export async function syncOrganizationTypes(
	tx: TxClient,
	orgTypes: NonNullable<SeedConfig["organization_types"]>,
	confirmAction: (msg: string) => Promise<boolean>,
): Promise<Map<string, number>> {
	console.log("Syncing organization types...");
	const orgTypeMap = new Map<string, number>();

	const existing = await tx.select().from(schema.organizationType);
	const existingMap = new Map(existing.map((ot) => [ot.name, ot]));

	const toInsert: { name: string }[] = [];
	const toRestore: typeof existing = [];

	for (const ot of orgTypes) {
		const match = existingMap.get(ot.name);
		if (!match) {
			toInsert.push({ name: ot.name });
		} else if (match.deletedAt) {
			toRestore.push(match);
		} else {
			orgTypeMap.set(ot.name, match.id);
		}
	}

	if (toInsert.length > 0) {
		console.log(`  * Creating organization types: ${toInsert.map((x) => x.name).join(", ")}`);
		const inserted = await tx
			.insert(schema.organizationType)
			.values(toInsert)
			.returning({ id: schema.organizationType.id, name: schema.organizationType.name });
		for (const item of inserted) {
			orgTypeMap.set(item.name, item.id);
		}
	}

	for (const ot of toRestore) {
		if (await confirmAction(`Restore soft-deleted organization type '${ot.name}'?`)) {
			console.log(`  * Restoring organization type: ${ot.name}`);
			await tx
				.update(schema.organizationType)
				.set({ deletedAt: null })
				.where(eq(schema.organizationType.id, ot.id));
			orgTypeMap.set(ot.name, ot.id);
		} else {
			orgTypeMap.set(ot.name, ot.id);
		}
	}

	return orgTypeMap;
}

export async function syncAllowedParents(
	tx: TxClient,
	orgTypes: NonNullable<SeedConfig["organization_types"]>,
	orgTypeMap: Map<string, number>,
): Promise<void> {
	console.log("Syncing organization type allowed parents...");
	const relationsToInsert: { childTypeId: number; parentTypeId: number }[] = [];

	for (const ot of orgTypes) {
		if (!ot.allowed_parents || ot.allowed_parents.length === 0) continue;
		const childId = orgTypeMap.get(ot.name);
		assert(childId, `Missing child organization type id for: ${ot.name}`);

		for (const parentName of ot.allowed_parents) {
			const parentId = orgTypeMap.get(parentName);
			assert(parentId, `Unknown parent organization type: ${parentName}`);
			relationsToInsert.push({ childTypeId: childId, parentTypeId: parentId });
		}
	}

	if (relationsToInsert.length > 0) {
		await tx
			.insert(schema.organizationTypeAllowedParent)
			.values(relationsToInsert)
			.onConflictDoNothing();
	}
}

export async function syncOrganizations(
	tx: TxClient,
	orgs: NonNullable<SeedConfig["organizations"]>,
	orgTypeMap: Map<string, number>,
	confirmAction: (msg: string) => Promise<boolean>,
): Promise<Map<string, number>> {
	console.log("Syncing organizations...");
	const orgMap = new Map<string, number>();

	const existing = await tx.select().from(schema.organization);
	const existingMap = new Map(existing.map((o) => [`${o.name}:${o.organizationTypeId}`, o]));

	for (const org of orgs) {
		const typeId = orgTypeMap.get(org.type);
		assert(typeId, `Unknown organization type "${org.type}" for organization "${org.name}"`);

		const parentId = org.parent ? orgMap.get(org.parent) : null;
		assert(
			!org.parent || parentId,
			`Parent organization "${org.parent}" must be defined before "${org.name}"`,
		);

		const match = existingMap.get(`${org.name}:${typeId}`);

		let id: number;
		if (match) {
			id = match.id;
			const needsUpdate =
				match.parentOrganizationId !== parentId || match.deletedAt != null || !match.isActive;
			if (needsUpdate) {
				let changeMsg = `Update organization '${org.name}'`;
				if (match.parentOrganizationId !== parentId) {
					changeMsg += ` parent to '${org.parent || "none"}'`;
				}
				if (match.deletedAt != null || !match.isActive) {
					changeMsg += " (restore and activate)";
				}

				if (await confirmAction(`${changeMsg}?`)) {
					console.log(`  * Updating organization: ${org.name}`);
					await tx
						.update(schema.organization)
						.set({
							parentOrganizationId: parentId,
							isActive: true,
							deletedAt: null,
						})
						.where(eq(schema.organization.id, id));
				}
			}
		} else {
			console.log(`  * Creating organization: ${org.name}`);
			const [inserted] = await tx
				.insert(schema.organization)
				.values({
					name: org.name,
					organizationTypeId: typeId,
					parentOrganizationId: parentId,
					isActive: true,
				})
				.returning({ id: schema.organization.id });
			assert(inserted, "Failed to insert organization");
			id = inserted.id;
		}
		orgMap.set(org.name, id);
		await getOrCreateManagedEntity(tx, "organization", id);
	}
	return orgMap;
}

export async function syncVenueTypes(
	tx: TxClient,
	venueTypes: NonNullable<SeedConfig["venue_types"]>,
	confirmAction: (msg: string) => Promise<boolean>,
): Promise<Map<string, number>> {
	console.log("Syncing venue types...");
	const venueTypeMap = new Map<string, number>();

	const existing = await tx.select().from(schema.venueType);
	const existingMap = new Map(existing.map((vt) => [vt.name, vt]));

	const toInsert: { name: string }[] = [];
	const toRestore: typeof existing = [];

	for (const vtName of venueTypes) {
		const match = existingMap.get(vtName);
		if (!match) {
			toInsert.push({ name: vtName });
		} else if (match.deletedAt) {
			toRestore.push(match);
		} else {
			venueTypeMap.set(vtName, match.id);
		}
	}

	if (toInsert.length > 0) {
		console.log(`  * Creating venue types: ${toInsert.map((x) => x.name).join(", ")}`);
		const inserted = await tx
			.insert(schema.venueType)
			.values(toInsert)
			.returning({ id: schema.venueType.id, name: schema.venueType.name });
		for (const item of inserted) {
			venueTypeMap.set(item.name, item.id);
		}
	}

	for (const vt of toRestore) {
		if (await confirmAction(`Restore soft-deleted venue type '${vt.name}'?`)) {
			console.log(`  * Restoring venue type: ${vt.name}`);
			await tx
				.update(schema.venueType)
				.set({ deletedAt: null })
				.where(eq(schema.venueType.id, vt.id));
			venueTypeMap.set(vt.name, vt.id);
		} else {
			venueTypeMap.set(vt.name, vt.id);
		}
	}

	return venueTypeMap;
}

export async function syncFacilities(
	tx: TxClient,
	facilities: NonNullable<SeedConfig["facilities"]>,
	confirmAction: (msg: string) => Promise<boolean>,
): Promise<Map<string, number>> {
	console.log("Syncing facilities...");
	const facilityMap = new Map<string, number>();

	const existing = await tx.select().from(schema.facility);
	const existingMap = new Map(existing.map((f) => [f.name, f]));

	const toInsert: { name: string }[] = [];
	const toRestore: typeof existing = [];

	for (const facName of facilities) {
		const match = existingMap.get(facName);
		if (!match) {
			toInsert.push({ name: facName });
		} else if (match.deletedAt) {
			toRestore.push(match);
		} else {
			facilityMap.set(facName, match.id);
		}
	}

	if (toInsert.length > 0) {
		console.log(`  * Creating facilities: ${toInsert.map((x) => x.name).join(", ")}`);
		const inserted = await tx
			.insert(schema.facility)
			.values(toInsert)
			.returning({ id: schema.facility.id, name: schema.facility.name });
		for (const item of inserted) {
			facilityMap.set(item.name, item.id);
		}
	}

	for (const f of toRestore) {
		if (await confirmAction(`Restore soft-deleted facility '${f.name}'?`)) {
			console.log(`  * Restoring facility: ${f.name}`);
			await tx.update(schema.facility).set({ deletedAt: null }).where(eq(schema.facility.id, f.id));
			facilityMap.set(f.name, f.id);
		} else {
			facilityMap.set(f.name, f.id);
		}
	}

	return facilityMap;
}

export async function syncVenues(
	tx: TxClient,
	venues: NonNullable<SeedConfig["venues"]>,
	venueTypeMap: Map<string, number>,
	orgMap: Map<string, number>,
	facilityMap: Map<string, number>,
	confirmAction: (msg: string) => Promise<boolean>,
): Promise<Map<string, number>> {
	console.log("Syncing venues...");
	const venueMap = new Map<string, number>();

	const existing = await tx.select().from(schema.venue);
	const existingMap = new Map(existing.map((v) => [`${v.name}:${v.venueTypeId}`, v]));

	const existingRels = await tx.select().from(schema.venueFacility);
	const existingRelsMap = new Map(existingRels.map((r) => [`${r.venueId}:${r.facilityId}`, r]));

	const relsToInsert: { venueId: number; facilityId: number; isActive: boolean }[] = [];

	for (const v of venues) {
		const vtId = venueTypeMap.get(v.type);
		assert(vtId, `Unknown venue type "${v.type}" for venue "${v.name}"`);

		const orgId = v.organization ? orgMap.get(v.organization) : null;
		assert(
			!v.organization || orgId,
			`Unknown organization "${v.organization}" for venue "${v.name}"`,
		);

		const match = existingMap.get(`${v.name}:${vtId}`);

		let id: number;
		const targetValues = {
			organizationId: orgId,
			accessLevel: v.access_level,
			isAvailable: v.is_available,
			unavailabilityReason: v.is_available ? null : (v.unavailability_reason ?? ""),
			maxCapacity: v.max_capacity,
			isActive: true,
			deletedAt: null,
		};

		if (match) {
			id = match.id;
			const needsUpdate =
				match.organizationId !== orgId ||
				match.accessLevel !== v.access_level ||
				match.isAvailable !== v.is_available ||
				match.unavailabilityReason !== targetValues.unavailabilityReason ||
				match.maxCapacity !== v.max_capacity ||
				match.deletedAt != null ||
				!match.isActive;

			if (needsUpdate) {
				if (await confirmAction(`Update venue config for '${v.name}'?`)) {
					console.log(`  * Updating venue: ${v.name}`);
					await tx.update(schema.venue).set(targetValues).where(eq(schema.venue.id, id));
				}
			}
		} else {
			console.log(`  * Creating venue: ${v.name}`);
			const [inserted] = await tx
				.insert(schema.venue)
				.values({
					name: v.name,
					venueTypeId: vtId,
					organizationId: orgId,
					accessLevel: v.access_level,
					isAvailable: v.is_available,
					unavailabilityReason: targetValues.unavailabilityReason,
					maxCapacity: v.max_capacity,
					isActive: true,
				})
				.returning({ id: schema.venue.id });
			assert(inserted, "Failed to insert venue");
			id = inserted.id;
		}
		venueMap.set(v.name, id);
		await getOrCreateManagedEntity(tx, "venue", id);

		// Sync venue facilities (in-memory mapping checks)
		for (const facName of v.facilities ?? []) {
			const facId = facilityMap.get(facName);
			assert(facId, `Unknown facility "${facName}" for venue "${v.name}"`);

			const matchRel = existingRelsMap.get(`${id}:${facId}`);

			if (matchRel) {
				if (!matchRel.isActive) {
					if (await confirmAction(`Re-activate facility '${facName}' on venue '${v.name}'?`)) {
						console.log(`  * Re-activating facility '${facName}' on venue '${v.name}'`);
						await tx
							.update(schema.venueFacility)
							.set({ isActive: true })
							.where(eq(schema.venueFacility.id, matchRel.id));
					}
				}
			} else {
				relsToInsert.push({
					venueId: id,
					facilityId: facId,
					isActive: true,
				});
			}
		}
	}

	if (relsToInsert.length > 0) {
		await tx.insert(schema.venueFacility).values(relsToInsert).onConflictDoNothing();
	}

	return venueMap;
}

export async function syncPermissions(tx: TxClient): Promise<Map<string, number>> {
	console.log("Syncing hardcoded system permissions...");
	const permissionMap = new Map<string, number>();

	const existingPerms = await tx.select().from(schema.permission);
	const existingCodes = new Map<string, (typeof existingPerms)[number]>();
	for (const p of existingPerms) {
		existingCodes.set(p.code, p);
	}

	for (const [code, description] of Object.entries(FLATTENED_PERMISSIONS)) {
		const existing = existingCodes.get(code);

		if (existing) {
			permissionMap.set(code, existing.id);
			if (existing.description !== description) {
				console.log(`  * Updating description for permission: ${code}`);
				await tx
					.update(schema.permission)
					.set({ description })
					.where(eq(schema.permission.id, existing.id));
			}
		} else {
			console.log(`  * Registering hardcoded system permission: ${code}`);
			const [inserted] = await tx
				.insert(schema.permission)
				.values({
					code: code as PermissionCode,
					description,
				})
				.returning({ id: schema.permission.id });
			assert(inserted, "Failed to register permission");
			permissionMap.set(code, inserted.id);
		}
	}
	return permissionMap;
}

export async function syncRoles(
	tx: TxClient,
	roles: NonNullable<SeedConfig["roles"]>,
	orgTypeMap: Map<string, number>,
	venueTypeMap: Map<string, number>,
	permissionMap: Map<string, number>,
	confirmAction: (msg: string) => Promise<boolean>,
): Promise<Map<string, number>> {
	console.log("Syncing roles...");
	const roleMap = new Map<string, number>();

	const existing = await tx.select().from(schema.role);
	const existingMap = new Map(
		existing.map((r) => [`${r.name}:${r.managedEntityType}:${r.typeRefId}`, r]),
	);

	const existingRels = await tx.select().from(schema.rolePermission);
	const existingRelsMap = new Set(existingRels.map((r) => `${r.roleId}:${r.permissionId}`));

	const relsToInsert: { roleId: number; permissionId: number }[] = [];

	for (const r of roles) {
		let typeRefId: number;
		if (r.managed_entity_type === "organization") {
			const id = orgTypeMap.get(r.type_ref);
			assert(id, `Unknown organization type "${r.type_ref}" for role "${r.name}"`);
			typeRefId = id;
		} else if (r.managed_entity_type === "venue") {
			const id = venueTypeMap.get(r.type_ref);
			assert(id, `Unknown venue type "${r.type_ref}" for role "${r.name}"`);
			typeRefId = id;
		} else {
			throw new Error(
				`Invalid managed_entity_type "${r.managed_entity_type}" for role "${r.name}"`,
			);
		}

		const match = existingMap.get(`${r.name}:${r.managed_entity_type}:${typeRefId}`);

		let id: number;
		if (match) {
			id = match.id;
			if (match.deletedAt) {
				if (await confirmAction(`Restore soft-deleted role '${r.name}'?`)) {
					console.log(`  * Restoring role: ${r.name}`);
					await tx.update(schema.role).set({ deletedAt: null }).where(eq(schema.role.id, id));
				}
			}
		} else {
			console.log(`  * Creating role: ${r.name}`);
			const [inserted] = await tx
				.insert(schema.role)
				.values({
					name: r.name,
					managedEntityType: r.managed_entity_type,
					typeRefId,
				})
				.returning({ id: schema.role.id });
			assert(inserted, "Failed to insert role");
			id = inserted.id;
		}

		const key = `${r.name}:${r.managed_entity_type}:${r.type_ref}`;
		roleMap.set(key, id);

		// Sync role permissions (using bulk buffer)
		for (const permCode of r.permissions ?? []) {
			const permId = permissionMap.get(permCode);
			assert(
				permId,
				`Permission "${permCode}" used by role "${r.name}" is not a valid system permission. Must be one of the hardcoded permissions in constants.ts.`,
			);

			if (!existingRelsMap.has(`${id}:${permId}`)) {
				relsToInsert.push({
					roleId: id,
					permissionId: permId,
				});
			}
		}
	}

	if (relsToInsert.length > 0) {
		await tx.insert(schema.rolePermission).values(relsToInsert).onConflictDoNothing();
	}

	return roleMap;
}

export async function syncUsers(
	tx: TxClient,
	users: NonNullable<SeedConfig["users"]>,
	_orgMap: Map<string, number>,
	roleMap: Map<string, number>,
	confirmAction: (msg: string) => Promise<boolean>,
): Promise<void> {
	console.log("Syncing users...");

	const existing = await tx.select().from(schema.user);
	const existingMap = new Map(existing.map((u) => [u.email, u]));

	const existingUserRoles = await tx.select().from(schema.userRole);
	const existingUserRolesMap = new Map(
		existingUserRoles.map((ur) => [`${ur.userId}:${ur.roleId}:${ur.managedEntityId}`, ur]),
	);

	const relsToInsert: {
		userId: number;
		roleId: number;
		managedEntityId: number;
		isActive: boolean;
	}[] = [];

	for (const u of users) {
		const match = existingMap.get(u.email);

		let userId: number;
		if (match) {
			userId = match.id;
			const needsUpdate =
				match.fullName !== u.full_name ||
				match.type !== u.type ||
				match.deletedAt != null ||
				!match.isActive;
			if (needsUpdate) {
				if (await confirmAction(`Update user account: '${u.email}'?`)) {
					console.log(`  * Updating user: ${u.email}`);
					await tx
						.update(schema.user)
						.set({
							fullName: u.full_name,
							type: u.type,
							isActive: true,
							deletedAt: null,
						})
						.where(eq(schema.user.id, userId));
				}
			}
		} else {
			console.log(`  * Creating user: ${u.email}`);
			const [inserted] = await tx
				.insert(schema.user)
				.values({
					fullName: u.full_name,
					email: u.email,
					type: u.type,
					isActive: true,
				})
				.returning({ id: schema.user.id });
			assert(inserted, "Failed to insert user");
			userId = inserted.id;
		}

		// Sync user roles
		for (const ur of u.roles ?? []) {
			let typeRef: string;
			let entityRefId: number;

			if (ur.managed_entity_type === "organization") {
				const org = await tx
					.select({
						id: schema.organization.id,
						typeId: schema.organization.organizationTypeId,
					})
					.from(schema.organization)
					.where(
						and(
							eq(schema.organization.name, ur.entity_name),
							isNull(schema.organization.deletedAt),
						),
					)
					.limit(1);

				assert(
					org[0],
					`Organization "${ur.entity_name}" for user role assignment not found or is deleted`,
				);
				entityRefId = org[0].id;

				const orgType = await tx
					.select({ name: schema.organizationType.name })
					.from(schema.organizationType)
					.where(eq(schema.organizationType.id, org[0].typeId))
					.limit(1);

				assert(orgType[0], `Organization type for organization "${ur.entity_name}" not found`);
				typeRef = orgType[0].name;
			} else if (ur.managed_entity_type === "venue") {
				const v = await tx
					.select({
						id: schema.venue.id,
						typeId: schema.venue.venueTypeId,
					})
					.from(schema.venue)
					.where(and(eq(schema.venue.name, ur.entity_name), isNull(schema.venue.deletedAt)))
					.limit(1);

				assert(v[0], `Venue "${ur.entity_name}" for user role assignment not found or is deleted`);
				entityRefId = v[0].id;

				const venueType = await tx
					.select({ name: schema.venueType.name })
					.from(schema.venueType)
					.where(eq(schema.venueType.id, v[0].typeId))
					.limit(1);

				assert(venueType[0], `Venue type for venue "${ur.entity_name}" not found`);
				typeRef = venueType[0].name;
			} else {
				throw new Error(`Invalid managed_entity_type "${ur.managed_entity_type}"`);
			}

			const roleKey = `${ur.role}:${ur.managed_entity_type}:${typeRef}`;
			const roleId = roleMap.get(roleKey);
			assert(roleId, `Role "${ur.role}" with entity type "${typeRef}" not found in seeded roles`);

			const managedEntityId = await getOrCreateManagedEntity(
				tx,
				ur.managed_entity_type,
				entityRefId,
			);

			const matchUserRole = existingUserRolesMap.get(`${userId}:${roleId}:${managedEntityId}`);

			if (matchUserRole) {
				if (!matchUserRole.isActive || matchUserRole.deletedAt != null) {
					if (
						await confirmAction(
							`Re-activate role '${ur.role}' for '${u.email}' on '${ur.entity_name}'?`,
						)
					) {
						console.log(
							`  * Restoring/Activating user role relation for user: ${u.email}, role: ${ur.role}, entity: ${ur.entity_name}`,
						);
						await tx
							.update(schema.userRole)
							.set({ isActive: true, deletedAt: null })
							.where(eq(schema.userRole.id, matchUserRole.id));
					}
				}
			} else {
				relsToInsert.push({
					userId,
					roleId,
					managedEntityId,
					isActive: true,
				});
			}
		}
	}

	if (relsToInsert.length > 0) {
		console.log(`  * Creating user role mappings...`);
		await tx.insert(schema.userRole).values(relsToInsert).onConflictDoNothing();
	}
}

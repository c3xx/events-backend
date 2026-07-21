import { eq } from "drizzle-orm";
import { schema } from "@/db/index.js";
import type { ExistingData } from "../seed-yaml.js";
import type { PlannedUpdate, SeedConfig } from "./schema.js";

export const getRoleKey = (
	name: string,
	managedEntityType: ManagedEntityType,
	typeRefName: string,
) => {
	return `${managedEntityType}:${typeRefName}:${name}`;
};

export interface PlanUpdatesResult {
	plannedUpdates: PlannedUpdate[];
	orgTypeByName: Map<string, typeof schema.organizationType.$inferSelect>;
	orgByName: Map<string, typeof schema.organization.$inferSelect>;
	orgNameById: Map<number, string>;
	orgTypeNameById: Map<number, string>;
	venueTypeByName: Map<string, typeof schema.venueType.$inferSelect>;
	venueTypeNameById: Map<number, string>;
	facilityByName: Map<string, typeof schema.facility.$inferSelect>;
	venueByName: Map<string, typeof schema.venue.$inferSelect>;
	userByEmail: Map<string, typeof schema.user.$inferSelect>;
	permissionIdByCode: Map<string, number>;
	roleByKey: Map<string, typeof schema.role.$inferSelect>;
}

export function planUpdates(config: SeedConfig, existing: ExistingData): PlanUpdatesResult {
	const orgTypeByName = new Map(existing.orgTypes.map((r) => [r.name, r]));
	const orgByName = new Map(existing.orgs.map((r) => [r.name, r]));
	const orgNameById = new Map(existing.orgs.map((r) => [r.id, r.name]));
	const orgTypeNameById = new Map(existing.orgTypes.map((r) => [r.id, r.name]));
	const venueTypeByName = new Map(existing.venueTypes.map((r) => [r.name, r]));
	const venueTypeNameById = new Map(existing.venueTypes.map((r) => [r.id, r.name]));
	const facilityByName = new Map(existing.facilities.map((r) => [r.name, r]));
	const venueByName = new Map(existing.venues.map((r) => [r.name, r]));
	const userByEmail = new Map(existing.users.map((r) => [r.email, r]));
	const permissionIdByCode = new Map(existing.permissions.map((p) => [p.code, p.id]));

	const roleByKey = new Map<string, typeof schema.role.$inferSelect>();
	for (const r of existing.roles) {
		const typeRefName =
			r.managedEntityType === "organization"
				? orgTypeNameById.get(r.typeRefId)
				: venueTypeNameById.get(r.typeRefId);
		if (typeRefName) {
			roleByKey.set(getRoleKey(r.name, r.managedEntityType, typeRefName), r);
		}
	}

	const plannedUpdates: PlannedUpdate[] = [];

	//Organization Types
	for (const ot of config.organization_types) {
		const existingRec = orgTypeByName.get(ot.name);
		if (existingRec && existingRec.deletedAt != null) {
			plannedUpdates.push({
				section: "organization type",
				label: ot.name,
				restore: true,
				changes: [{ field: "status", from: "deleted", to: "active" }],
				apply: async (tx) => {
					await tx
						.update(schema.organizationType)
						.set({ deletedAt: null })
						.where(eq(schema.organizationType.id, existingRec.id));
				},
			});
		}
	}

	//Organizations
	for (const org of config.organizations) {
		const existingRec = orgByName.get(org.name);
		if (existingRec) {
			const existingParentName = existingRec.parentOrganizationId
				? (orgNameById.get(existingRec.parentOrganizationId) ?? null)
				: null;
			const desiredParentName = org.parent ?? null;
			const parentChanged = existingParentName !== desiredParentName;
			const changes = [];

			if (parentChanged) {
				changes.push({
					field: "parent",
					from: existingParentName,
					to: desiredParentName,
				});
			}
			if (existingRec.deletedAt != null) {
				changes.push({ field: "status", from: "deleted", to: "active" });
			}
			if (!existingRec.isActive) {
				changes.push({ field: "isActive", from: false, to: true });
			}

			if (changes.length > 0) {
				plannedUpdates.push({
					section: "organization",
					label: org.name,
					restore: existingRec.deletedAt != null,
					changes,
					apply: async (tx, resolvedIds) => {
						const parentId = desiredParentName ? resolvedIds.orgs.get(desiredParentName) : null;
						await tx
							.update(schema.organization)
							.set({
								parentOrganizationId: parentId,
								deletedAt: null,
								isActive: true,
							})
							.where(eq(schema.organization.id, existingRec.id));
					},
				});
			}
		}
	}

	//Venue Types
	for (const name of config.venue_types) {
		const existingRec = venueTypeByName.get(name);
		if (existingRec && existingRec.deletedAt != null) {
			plannedUpdates.push({
				section: "venue type",
				label: name,
				restore: true,
				changes: [{ field: "status", from: "deleted", to: "active" }],
				apply: async (tx) => {
					await tx
						.update(schema.venueType)
						.set({ deletedAt: null })
						.where(eq(schema.venueType.id, existingRec.id));
				},
			});
		}
	}

	//Facilities
	for (const name of config.facilities) {
		const existingRec = facilityByName.get(name);
		if (existingRec && existingRec.deletedAt != null) {
			plannedUpdates.push({
				section: "facility",
				label: name,
				restore: true,
				changes: [{ field: "status", from: "deleted", to: "active" }],
				apply: async (tx) => {
					await tx
						.update(schema.facility)
						.set({ deletedAt: null })
						.where(eq(schema.facility.id, existingRec.id));
				},
			});
		}
	}

	//Venues
	for (const venue of config.venues) {
		const existingRec = venueByName.get(venue.name);
		if (existingRec) {
			const existingOrgName = existingRec.organizationId
				? (orgNameById.get(existingRec.organizationId) ?? null)
				: null;
			const desiredOrgName = venue.organization ?? null;
			const orgChanged = existingOrgName !== desiredOrgName;

			const desiredAccess = venue.access_level ?? "public";
			const accessChanged = existingRec.accessLevel !== desiredAccess;

			const availabilityChanged = existingRec.isAvailable !== venue.is_available;
			const desiredReason = venue.is_available ? null : (venue.unavailability_reason ?? null);
			const reasonChanged = existingRec.unavailabilityReason !== desiredReason;

			const capacityChanged = existingRec.maxCapacity !== venue.max_capacity;

			const changes = [];
			if (orgChanged) {
				changes.push({
					field: "organization",
					from: existingOrgName,
					to: desiredOrgName,
				});
			}
			if (accessChanged) {
				changes.push({
					field: "access_level",
					from: existingRec.accessLevel,
					to: desiredAccess,
				});
			}
			if (availabilityChanged) {
				changes.push({
					field: "is_available",
					from: existingRec.isAvailable,
					to: venue.is_available,
				});
			}
			if (reasonChanged) {
				changes.push({
					field: "unavailability_reason",
					from: existingRec.unavailabilityReason,
					to: desiredReason,
				});
			}
			if (capacityChanged) {
				changes.push({
					field: "max_capacity",
					from: existingRec.maxCapacity,
					to: venue.max_capacity,
				});
			}
			if (existingRec.deletedAt != null) {
				changes.push({ field: "status", from: "deleted", to: "active" });
			}
			if (!existingRec.isActive) {
				changes.push({ field: "isActive", from: false, to: true });
			}

			if (changes.length > 0) {
				plannedUpdates.push({
					section: "venue",
					label: venue.name,
					restore: existingRec.deletedAt != null,
					changes,
					apply: async (tx, resolvedIds) => {
						const orgId = desiredOrgName ? resolvedIds.orgs.get(desiredOrgName) : null;
						await tx
							.update(schema.venue)
							.set({
								organizationId: orgId,
								accessLevel: desiredAccess,
								isAvailable: venue.is_available,
								unavailabilityReason: desiredReason,
								maxCapacity: venue.max_capacity,
								deletedAt: null,
								isActive: true,
							})
							.where(eq(schema.venue.id, existingRec.id));
					},
				});
			}
		}
	}

	//Roles
	for (const role of config.roles) {
		const key = getRoleKey(role.name, role.managed_entity_type, role.type_ref);
		const existingRec = roleByKey.get(key);
		if (existingRec && existingRec.deletedAt != null) {
			plannedUpdates.push({
				section: "role",
				label: `${role.name} (${role.managed_entity_type}:${role.type_ref})`,
				restore: true,
				changes: [{ field: "status", from: "deleted", to: "active" }],
				apply: async (tx) => {
					await tx
						.update(schema.role)
						.set({ deletedAt: null })
						.where(eq(schema.role.id, existingRec.id));
				},
			});
		}
	}

	//Users
	for (const user of config.users) {
		const existingRec = userByEmail.get(user.email);
		if (existingRec) {
			const nameChanged = existingRec.fullName !== user.full_name;
			const typeChanged = existingRec.type !== user.type;
			const changes = [];

			if (nameChanged) {
				changes.push({
					field: "fullName",
					from: existingRec.fullName,
					to: user.full_name,
				});
			}
			if (typeChanged) {
				changes.push({ field: "type", from: existingRec.type, to: user.type });
			}
			if (existingRec.deletedAt != null) {
				changes.push({ field: "status", from: "deleted", to: "active" });
			}
			if (!existingRec.isActive) {
				changes.push({ field: "isActive", from: false, to: true });
			}

			if (changes.length > 0) {
				plannedUpdates.push({
					section: "user",
					label: user.email,
					restore: existingRec.deletedAt != null,
					changes,
					apply: async (tx) => {
						await tx
							.update(schema.user)
							.set({
								fullName: user.full_name,
								type: user.type,
								deletedAt: null,
								isActive: true,
							})
							.where(eq(schema.user.id, existingRec.id));
					},
				});
			}
		}
	}

	return {
		plannedUpdates,
		orgTypeByName,
		orgByName,
		orgNameById,
		orgTypeNameById,
		venueTypeByName,
		venueTypeNameById,
		facilityByName,
		venueByName,
		userByEmail,
		permissionIdByCode,
		roleByKey,
	};
}

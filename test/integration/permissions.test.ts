import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { assert, describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
import { findOrganizationManagedEntity } from "@/modules/organization/repository.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import {
	assignRolePermission,
	assignUserRole,
	createTestOrganization,
	createTestOrganizationType,
	createTestPermission,
	createTestRole,
	createTestUser,
} from "./integration-test-helpers.js";

describe("Permissions Integration Tests", () => {
	describe("Role CRUD", () => {
		test("creates role with valid managedEntityType and typeRefId", async () => {
			const orgType = await createTestOrganizationType();
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});
			expect(role.id).toBeDefined();
		});

		test("rejects duplicate (name, managedEntityType, typeRefId) while active", async () => {
			const orgType = await createTestOrganizationType();
			const name = `DupRole-${nanoid()}`;
			await createTestRole({ name, managedEntityType: "organization", typeRefId: orgType.id });

			await expect(
				createTestRole({ name, managedEntityType: "organization", typeRefId: orgType.id }),
			).rejects.toThrow();
		});

		test("allows name reuse under a different typeRefId", async () => {
			const typeA = await createTestOrganizationType();
			const typeB = await createTestOrganizationType();
			const name = `SharedRole-${nanoid()}`;

			await expect(
				createTestRole({ name, managedEntityType: "organization", typeRefId: typeA.id }),
			).resolves.not.toThrow();
			await expect(
				createTestRole({ name, managedEntityType: "organization", typeRefId: typeB.id }),
			).resolves.not.toThrow();
		});

		test("allows name reuse after prior role with same triplet is soft-deleted", async () => {
			const orgType = await createTestOrganizationType();
			const name = `RecycledRole-${nanoid()}`;
			const role = await createTestRole({
				name,
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});

			await db
				.update(schema.role)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.role.id, role.id));

			await expect(
				createTestRole({ name, managedEntityType: "organization", typeRefId: orgType.id }),
			).resolves.not.toThrow();
		});
	});

	describe("Permission CRUD", () => {
		test("creates permission with unique code and rejects duplicate code", async () => {
			const code = `PERM_${nanoid()}` as PermissionCode;
			await expect(createTestPermission({ code })).resolves.not.toThrow();
			await expect(createTestPermission({ code })).rejects.toThrow();
		});

		test("deleting a permission cascades and removes associated rolePermission rows", async () => {
			const perm = await createTestPermission();
			const orgType = await createTestOrganizationType();
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});

			await assignRolePermission({ roleId: role.id, permissionId: perm.id });

			// Hard delete permission
			await db.delete(schema.permission).where(eq(schema.permission.id, perm.id));

			const rp = await db.query.rolePermission.findFirst({
				where: eq(schema.rolePermission.permissionId, perm.id),
			});
			// Cascade prevents existence
			expect(rp).toBeUndefined();
		});
	});

	describe("Role-Permission Assignment", () => {
		test("assigns a permission to a role successfully and rejects duplicates", async () => {
			const perm = await createTestPermission();
			const orgType = await createTestOrganizationType();
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});

			await expect(
				assignRolePermission({ roleId: role.id, permissionId: perm.id }),
			).resolves.not.toThrow();
			await expect(
				assignRolePermission({ roleId: role.id, permissionId: perm.id }),
			).rejects.toThrow();
		});

		test("deleting a role cascades and removes its rolePermission rows", async () => {
			const perm = await createTestPermission();
			const orgType = await createTestOrganizationType();
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});
			await assignRolePermission({ roleId: role.id, permissionId: perm.id });

			await db.delete(schema.role).where(eq(schema.role.id, role.id));

			const rp = await db.query.rolePermission.findFirst({
				where: eq(schema.rolePermission.roleId, role.id),
			});
			expect(rp).toBeUndefined();
		});
	});

	describe("User-Role-ManagedEntity Assignment", () => {
		test("assigns a role to a user scoped to a specific managedEntity", async () => {
			const user = await createTestUser();
			const orgType = await createTestOrganizationType();
			const org = await createTestOrganization({ organizationTypeId: orgType.id });
			const me = await findOrganizationManagedEntity(org.id);
			assert(me != null);
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});

			await expect(
				assignUserRole({ userId: user.id, roleId: role.id, managedEntityId: me.id }),
			).resolves.not.toThrow();
		});

		test("rejects duplicate (userId, roleId, managedEntityId) while active", async () => {
			const user = await createTestUser();
			const orgType = await createTestOrganizationType();
			const org = await createTestOrganization({ organizationTypeId: orgType.id });
			const me = await findOrganizationManagedEntity(org.id);
			assert(me != null);
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});

			await assignUserRole({ userId: user.id, roleId: role.id, managedEntityId: me.id });
			await expect(
				assignUserRole({ userId: user.id, roleId: role.id, managedEntityId: me.id }),
			).rejects.toThrow();
		});

		test("allows same (userId, roleId) pair across two different managedEntityIds", async () => {
			const user = await createTestUser();
			const orgType = await createTestOrganizationType();
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});

			const org1 = await createTestOrganization({ organizationTypeId: orgType.id });
			const me1 = await findOrganizationManagedEntity(org1.id);
			assert(me1 != null);
			const org2 = await createTestOrganization({ organizationTypeId: orgType.id });
			const me2 = await findOrganizationManagedEntity(org2.id);
			assert(me2 != null);

			await expect(
				assignUserRole({ userId: user.id, roleId: role.id, managedEntityId: me1.id }),
			).resolves.not.toThrow();
			await expect(
				assignUserRole({ userId: user.id, roleId: role.id, managedEntityId: me2.id }),
			).resolves.not.toThrow();
		});

		test("BUG: userRole.isActive is ignored by the RBAC queries currently", async () => {
			const user = await createTestUser({ type: "end_user" });
			const orgType = await createTestOrganizationType();
			const org = await createTestOrganization({ organizationTypeId: orgType.id });
			const me = await findOrganizationManagedEntity(org.id);
			assert(me != null);
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});
			const perm = await createTestPermission();
			await assignRolePermission({ roleId: role.id, permissionId: perm.id });

			// Assign role with isActive: FALSE
			await assignUserRole({
				userId: user.id,
				roleId: role.id,
				managedEntityId: me.id,
				isActive: false,
			});

			// The backend repository only checks IS NULL deletedAt, it bypasses isActive entirely!!!
			const hasPerm = await hasPermissionInManagedEntity(
				user,
				"organization",
				[org.id],
				perm.code as PermissionCode,
			);

			// This assertion proves the bug exists natively
			expect(hasPerm).toBe(true);
		});
	});

	describe("Permission Check — Core Logic (hasPermissionInManagedEntity)", () => {
		test("grants action when user's active role has the required permission", async () => {
			const user = await createTestUser({ type: "end_user" });
			const orgType = await createTestOrganizationType();
			const org = await createTestOrganization({ organizationTypeId: orgType.id });
			const me = await findOrganizationManagedEntity(org.id);
			assert(me != null);
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});
			const perm = await createTestPermission();

			await assignRolePermission({ roleId: role.id, permissionId: perm.id });
			await assignUserRole({ userId: user.id, roleId: role.id, managedEntityId: me.id });

			const result = await hasPermissionInManagedEntity(
				user,
				"organization",
				[org.id],
				perm.code as PermissionCode,
			);
			expect(result).toBe(true);
		});

		test("denies action when user has a role on that managedEntity but lacks permission", async () => {
			const user = await createTestUser({ type: "end_user" });
			const orgType = await createTestOrganizationType();
			const org = await createTestOrganization({ organizationTypeId: orgType.id });
			const me = await findOrganizationManagedEntity(org.id);
			assert(me != null);
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});
			const unusedPerm = await createTestPermission(); // explicitly NOT assigned to the role

			await assignUserRole({ userId: user.id, roleId: role.id, managedEntityId: me.id });

			const result = await hasPermissionInManagedEntity(
				user,
				"organization",
				[org.id],
				unusedPerm.code as PermissionCode,
			);
			expect(result).toBe(false);
		});

		test("denies action when user's userRole is soft-deleted", async () => {
			const user = await createTestUser({ type: "end_user" });
			const orgType = await createTestOrganizationType();
			const org = await createTestOrganization({ organizationTypeId: orgType.id });
			const me = await findOrganizationManagedEntity(org.id);
			assert(me != null);
			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});
			const perm = await createTestPermission();

			await assignRolePermission({ roleId: role.id, permissionId: perm.id });
			const userRole = await assignUserRole({
				userId: user.id,
				roleId: role.id,
				managedEntityId: me.id,
			});

			await db
				.update(schema.userRole)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.userRole.id, userRole.id));

			const result = await hasPermissionInManagedEntity(
				user,
				"organization",
				[org.id],
				perm.code as PermissionCode,
			);
			expect(result).toBe(false);
		});
	});

	describe("ManagedEntity Scoping & Hierarchy Assertions", () => {
		test("Parent-level DB queries do NOT automatically cascade downward natively in RBAC without explicitly passing the child refId array", async () => {
			const user = await createTestUser({ type: "end_user" });
			const parentType = await createTestOrganizationType();
			const childType = await createTestOrganizationType();
			await db
				.insert(schema.organizationTypeAllowedParent)
				.values({ childTypeId: childType.id, parentTypeId: parentType.id });

			const parentOrg = await createTestOrganization({ organizationTypeId: parentType.id });
			const meParent = await findOrganizationManagedEntity(parentOrg.id);
			assert(meParent != null);

			const childOrg = await createTestOrganization({
				organizationTypeId: childType.id,
				parentOrganizationId: parentOrg.id,
			});

			const role = await createTestRole({
				managedEntityType: "organization",
				typeRefId: parentType.id,
			});
			const perm = await createTestPermission();
			await assignRolePermission({ roleId: role.id, permissionId: perm.id });

			// Assign user to PARENT
			await assignUserRole({ userId: user.id, roleId: role.id, managedEntityId: meParent.id });

			// The caller MUST pass childOrg.id if they want to check child access.
			// If they pass childOrg.id with the current RBAC, it literally fails because the assignment is for meParent
			const resultOnChildOnly = await hasPermissionInManagedEntity(
				user,
				"organization",
				[childOrg.id],
				perm.code as PermissionCode,
			);
			expect(resultOnChildOnly).toBe(false); // Proves NO implicit DB cascade down trees natively

			// If we pass parent array explicitly in JS code, it evaluates successfully
			const resultExplicitArray = await hasPermissionInManagedEntity(
				user,
				"organization",
				[childOrg.id, parentOrg.id],
				perm.code as PermissionCode,
			);
			expect(resultExplicitArray).toBe(true);
		});
	});
});

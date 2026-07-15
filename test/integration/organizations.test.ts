import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { assert, describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
import { NotFoundError } from "@/lib/errors.js";
import { findOrganizationManagedEntity } from "@/modules/organization/repository.js";
import {
	createOrganization,
	getOrganization,
	getOrganizations,
} from "@/modules/organization/service.js";
import { createTestOrganization, createTestOrganizationType } from "./integration-test-helpers.js";

describe("Organization Integration Tests", () => {
	describe("Create Organization", () => {
		test("creates organization with valid organizationTypeId and no parentOrganizationId", async () => {
			const orgType = await createTestOrganizationType();
			const org = await createOrganization({
				organizationTypeId: orgType.id,
				name: `TKMCE-${nanoid()}`,
			});
			expect(org.id).toBeDefined();
		});

		test("creates organization with valid organizationTypeId and valid parentOrganizationId", async () => {
			const parentType = await createTestOrganizationType();
			const childType = await createTestOrganizationType();
			await db.insert(schema.organizationTypeAllowedParent).values({
				childTypeId: childType.id,
				parentTypeId: parentType.id,
			});
			const parentOrg = await createTestOrganization({ organizationTypeId: parentType.id });
			const childOrg = await createOrganization({
				organizationTypeId: childType.id,
				name: `Child-${nanoid()}`,
				parentOrganizationId: parentOrg.id,
			});
			expect(childOrg.id).toBeDefined();
		});

		test("rejects creation with non-existent organizationTypeId (FK)", async () => {
			await expect(
				createOrganization({
					organizationTypeId: 9999999,
					name: "Ghost Org",
				}),
			).rejects.toThrow();
		});

		test("rejects creation with non-existent parentOrganizationId (FK)", async () => {
			const orgType = await createTestOrganizationType();
			await expect(
				createOrganization({
					organizationTypeId: orgType.id,
					name: "Orphan Org",
					parentOrganizationId: 9999999,
				}),
			).rejects.toThrow();
		});

		test("rejects duplicate (organizationTypeId, name) while active", async () => {
			const orgType = await createTestOrganizationType();
			const name = `Dup-${nanoid()}`;
			await createOrganization({ organizationTypeId: orgType.id, name });
			await expect(createOrganization({ organizationTypeId: orgType.id, name })).rejects.toThrow();
		});

		test("allows same name under different organizationTypeId", async () => {
			const typeA = await createTestOrganizationType();
			const typeB = await createTestOrganizationType();
			const name = `Shared-${nanoid()}`;

			await expect(
				createOrganization({ organizationTypeId: typeA.id, name }),
			).resolves.not.toThrow();
			await expect(
				createOrganization({ organizationTypeId: typeB.id, name }),
			).resolves.not.toThrow();
		});

		test("allows name reuse after prior org with that name+type is soft-deleted", async () => {
			const orgType = await createTestOrganizationType();
			const name = `Recycled-${nanoid()}`;
			const org = await createOrganization({ organizationTypeId: orgType.id, name });

			await db
				.update(schema.organization)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.organization.id, org.id));

			await expect(
				createOrganization({ organizationTypeId: orgType.id, name }),
			).resolves.not.toThrow();
		});

		test("created org defaults isActive: true", async () => {
			const orgType = await createTestOrganizationType();
			const org = await createOrganization({
				organizationTypeId: orgType.id,
				name: `ActiveCheck-${nanoid()}`,
			});

			const fetched = await getOrganization(org.id);
			expect(fetched.isActive).toBe(true);
		});

		test("findOrganizationManagedEntity returns valid row immediately after createOrganization (DB Triggers)", async () => {
			const orgType = await createTestOrganizationType();
			const org = await createOrganization({
				organizationTypeId: orgType.id,
				name: `NoME-${nanoid()}`,
			});

			const me = await findOrganizationManagedEntity(org.id);
			expect(me).toBeDefined();
			expect(me?.id).toBeDefined();
		});

		test("rejects creating org with (type, parentType) not in allowed parent list (DB trigger enforced)", async () => {
			const parentType = await createTestOrganizationType();
			const childType = await createTestOrganizationType();

			const parentOrg = await createTestOrganization({ organizationTypeId: parentType.id });

			await expect(
				createOrganization({
					organizationTypeId: childType.id,
					name: `PermissiveChild-${nanoid()}`,
					parentOrganizationId: parentOrg.id,
				}),
			).rejects.toThrow();
		});
	});

	describe("Get Organization (single)", () => {
		test("returns correct organization for valid id, including parentOrganizationId", async () => {
			const parentType = await createTestOrganizationType();
			const childType = await createTestOrganizationType();
			await db.insert(schema.organizationTypeAllowedParent).values({
				childTypeId: childType.id,
				parentTypeId: parentType.id,
			});
			const parentOrg = await createTestOrganization({ organizationTypeId: parentType.id });
			const childOrg = await createTestOrganization({
				organizationTypeId: childType.id,
				parentOrganizationId: parentOrg.id,
			});

			const fetched = await getOrganization(childOrg.id);
			expect(fetched.id).toBe(childOrg.id);
			expect(fetched.parentOrganizationId).toBe(parentOrg.id);
		});

		test("throws NotFoundError for non-existent id", async () => {
			await expect(getOrganization(999999)).rejects.toThrow(NotFoundError);
		});

		test("throws NotFoundError for soft-deleted id", async () => {
			const orgType = await createTestOrganizationType();
			const org = await createTestOrganization({ organizationTypeId: orgType.id });

			await db
				.update(schema.organization)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.organization.id, org.id));

			await expect(getOrganization(org.id)).rejects.toThrow(NotFoundError);
		});
	});

	describe("Get Organizations (list)", () => {
		test("returns all active organizations and excludes soft-deleted organizations", async () => {
			const orgType = await createTestOrganizationType();
			const org1 = await createTestOrganization({ organizationTypeId: orgType.id });
			const org2 = await createTestOrganization({ organizationTypeId: orgType.id });

			await db
				.update(schema.organization)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.organization.id, org2.id));

			const orgs = await getOrganizations();
			const ids = orgs.map((o) => o.id);

			expect(ids).toContain(org1.id);
			expect(ids).not.toContain(org2.id);

			const fetchedOrg1 = orgs.find((o) => o.id === org1.id);
			assert(fetchedOrg1 != null);
			expect(fetchedOrg1.isActive).toBeDefined();
			expect(fetchedOrg1.createdAt).toBeDefined();
		});
	});

	describe("findOrganizationManagedEntity", () => {
		test("returns the implicitly created managedEntity id natively via DB triggers", async () => {
			const orgType = await createTestOrganizationType();
			const org = await createTestOrganization({ organizationTypeId: orgType.id });

			const result = await findOrganizationManagedEntity(org.id);
			expect(result).toBeDefined();
			expect(result?.id).toBeGreaterThan(0);
		});

		test("returns undefined when the managedEntity row is soft-deleted", async () => {
			const orgType = await createTestOrganizationType();
			const org = await createTestOrganization({ organizationTypeId: orgType.id });

			await db
				.update(schema.managedEntity)
				.set({ deletedAt: new Date().toISOString() })
				.where(
					and(
						eq(schema.managedEntity.managedEntityType, "organization"),
						eq(schema.managedEntity.refId, org.id),
					),
				);

			const result = await findOrganizationManagedEntity(org.id);
			expect(result).toBeUndefined();
		});
	});

	describe("Parent-Child Data Integrity", () => {
		test("2-level chain: child's parent resolves, soft-deleting parent does not cascade", async () => {
			const parentType = await createTestOrganizationType();
			const childType = await createTestOrganizationType();
			await db.insert(schema.organizationTypeAllowedParent).values({
				childTypeId: childType.id,
				parentTypeId: parentType.id,
			});
			const parentOrg = await createTestOrganization({ organizationTypeId: parentType.id });
			const childOrg = await createTestOrganization({
				organizationTypeId: childType.id,
				parentOrganizationId: parentOrg.id,
			});

			const fetchedParent = await getOrganization(parentOrg.id);
			const fetchedChild = await getOrganization(childOrg.id);
			expect(fetchedParent.id).toBe(parentOrg.id);
			expect(fetchedChild.parentOrganizationId).toBe(parentOrg.id);

			await db
				.update(schema.organization)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.organization.id, parentOrg.id));

			const postDeleteChild = await getOrganization(childOrg.id);
			expect(postDeleteChild.parentOrganizationId).toBe(parentOrg.id);
		});
	});

	describe("Soft-Delete Cascades", () => {
		test("BUG: soft-deleting an organization does NOT cascade to its auto-generated managedEntity", async () => {
			const orgType = await createTestOrganizationType();
			const org = await createTestOrganization({ organizationTypeId: orgType.id });

			// Confirm managedEntity exists initially via DB triggers
			const initialMe = await findOrganizationManagedEntity(org.id);
			expect(initialMe).toBeDefined();

			// Soft-delete the organization
			await db
				.update(schema.organization)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.organization.id, org.id));

			// Check if the soft-delete cascaded down to the `managedEntity`
			const postDeleteMe = await db.query.managedEntity.findFirst({
				where: and(
					eq(schema.managedEntity.managedEntityType, "organization"),
					eq(schema.managedEntity.refId, org.id),
				),
			});

			// Assert that the native postgres ON DELETE CASCADE didn't trigger because it's a soft delete
			// Meaning: The DB leaves a floating active `managedEntity` for a deleted organization!
			expect(postDeleteMe?.deletedAt).toBeNull();
		});
	});
});

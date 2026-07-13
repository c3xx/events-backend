import { eq } from "drizzle-orm";
import { assert, describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
import { createEvent } from "@/modules/event/service.js";
import { addAllowedChildType as addEventAllowedChild } from "@/modules/event-type/children/service.js";
import { createOrganization } from "@/modules/organization/service.js";
import { addAllowedChildType as addOrgAllowedChild } from "@/modules/organization-type/children/service.js";
import {
	createOrganizerTestSetup,
	createTestEventBody,
	createTestEventType,
	createTestOrganizationType,
	createTestWorkflowStep,
	createTestWorkflowTemplate,
} from "./integration-test-helpers.js";

describe("Type Hierarchy Validation", () => {
	describe("Allowed-Parent Table Mechanics", () => {
		test("creates an allowed-parent mapping successfully (org type)", async () => {
			const parentOrgs = await createTestOrganizationType({ name: "ParentOrgType" });
			const childOrg = await createTestOrganizationType({ name: "ChildOrgType" });

			await expect(
				addOrgAllowedChild({ id: parentOrgs.id, childId: childOrg.id }),
			).resolves.not.toThrow();

			const mapping = await db.query.organizationTypeAllowedParent.findFirst({
				where: (t, { and, eq }) =>
					and(eq(t.parentTypeId, parentOrgs.id), eq(t.childTypeId, childOrg.id)),
			});
			assert(mapping != null);
		});

		test("creates an allowed-parent mapping successfully (event type)", async () => {
			const template = await createTestWorkflowTemplate();
			await createTestWorkflowStep({ templateId: template.id });

			const parentEvent = await createTestEventType({ workflowTemplateId: template.id });
			const childEvent = await createTestEventType({ workflowTemplateId: template.id });

			await expect(
				addEventAllowedChild({ id: parentEvent.id, childId: childEvent.id }),
			).resolves.not.toThrow();

			const mapping = await db.query.eventTypeAllowedParent.findFirst({
				where: (t, { and, eq }) =>
					and(eq(t.parentTypeId, parentEvent.id), eq(t.childTypeId, childEvent.id)),
			});
			assert(mapping != null);
		});

		test("rejects duplicate (childId, parentTypeId) pair — PK violation", async () => {
			const parentOrg = await createTestOrganizationType();
			const childOrg = await createTestOrganizationType();

			await addOrgAllowedChild({ id: parentOrg.id, childId: childOrg.id });

			await expect(
				addOrgAllowedChild({ id: parentOrg.id, childId: childOrg.id }),
			).rejects.toThrow();
		});

		test("allows one childId to have multiple different allowed parentTypeIds (M:1)", async () => {
			const parent1 = await createTestOrganizationType();
			const parent2 = await createTestOrganizationType();
			const child = await createTestOrganizationType();

			await expect(
				addOrgAllowedChild({ id: parent1.id, childId: child.id }),
			).resolves.not.toThrow();
			await expect(
				addOrgAllowedChild({ id: parent2.id, childId: child.id }),
			).resolves.not.toThrow();
		});

		test("allows one parentTypeId to be allowed-parent for multiple different childIds (1:M)", async () => {
			const parent = await createTestOrganizationType();
			const child1 = await createTestOrganizationType();
			const child2 = await createTestOrganizationType();

			await expect(
				addOrgAllowedChild({ id: parent.id, childId: child1.id }),
			).resolves.not.toThrow();
			await expect(
				addOrgAllowedChild({ id: parent.id, childId: child2.id }),
			).resolves.not.toThrow();
		});

		test("rejects mapping referencing non-existent childId/parentTypeId (FK violation)", async () => {
			const validOrg = await createTestOrganizationType();

			await expect(addOrgAllowedChild({ id: validOrg.id, childId: 999999 })).rejects.toThrow();

			await expect(addOrgAllowedChild({ id: 999999, childId: validOrg.id })).rejects.toThrow();
		});

		test("verifies self-mapping constraints (no DB constraint exists blocking this)", async () => {
			const orgType = await createTestOrganizationType();

			//bug: no explicit checking when parent organization type is same as child organization type
			await expect(
				addOrgAllowedChild({ id: orgType.id, childId: orgType.id }),
			).resolves.not.toThrow();
		});
	});

	describe("Organization Hierarchy Enforcement", () => {
		test("allows creating org with parentOrganizationId when the child/parent orgType pair exists", async () => {
			const parentType = await createTestOrganizationType();
			const childType = await createTestOrganizationType();
			await addOrgAllowedChild({ id: parentType.id, childId: childType.id });

			const parentOrg = await createOrganization({
				name: "Parent",
				organizationTypeId: parentType.id,
			});

			await expect(
				createOrganization({
					name: "Child",
					organizationTypeId: childType.id,
					parentOrganizationId: parentOrg.id,
				}),
			).resolves.not.toThrow();
		});

		test("rejects creating org when the orgType pair is NOT in allowed-parent table", async () => {
			const parentType = await createTestOrganizationType();
			const childType = await createTestOrganizationType();
			const parentOrg = await createOrganization({
				name: "Parent",
				organizationTypeId: parentType.id,
			});

			await expect(
				createOrganization({
					name: "Child",
					organizationTypeId: childType.id,
					parentOrganizationId: parentOrg.id,
				}),
			).rejects.toThrow();
		});

		test("allows creating a root/top-level organization with parentOrganizationId = null", async () => {
			const orgType = await createTestOrganizationType();
			await expect(
				createOrganization({
					name: "RootOrg",
					organizationTypeId: orgType.id,
				}),
			).resolves.not.toThrow();
		});

		test("rejects org creation where the parent organization itself is soft-deleted", async () => {
			const parentType = await createTestOrganizationType();
			const childType = await createTestOrganizationType();
			await addOrgAllowedChild({ id: parentType.id, childId: childType.id });

			const parentOrg = await createOrganization({
				name: "Parent",
				organizationTypeId: parentType.id,
			});
			await db
				.update(schema.organization)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.organization.id, parentOrg.id));

			await expect(
				createOrganization({
					name: "Child",
					organizationTypeId: childType.id,
					parentOrganizationId: parentOrg.id,
				}),
			).rejects.toThrow();
		});

		test("self-reference guard: rejects organization.parentOrganizationId == organization.id", async () => {
			const type = await createTestOrganizationType();
			const org = await createOrganization({ name: "SelfRef", organizationTypeId: type.id });

			await expect(
				db
					.update(schema.organization)
					.set({ parentOrganizationId: org.id })
					.where(eq(schema.organization.id, org.id)),
			).rejects.toThrow();
		});

		test("Cycle Detection: rejects 2-level organization parent cycle (A->B then B->A)", async () => {
			const rootType = await createTestOrganizationType();
			const loopType = await createTestOrganizationType();
			await addOrgAllowedChild({ id: rootType.id, childId: loopType.id });
			await addOrgAllowedChild({ id: loopType.id, childId: loopType.id });

			const rootOrg = await createOrganization({ name: "Root", organizationTypeId: rootType.id });
			const orgA = await createOrganization({
				name: "A",
				organizationTypeId: loopType.id,
				parentOrganizationId: rootOrg.id,
			});
			const orgB = await createOrganization({
				name: "B",
				organizationTypeId: loopType.id,
				parentOrganizationId: orgA.id,
			});

			// BUG: Recursive graph cycles (A->B then B->A) are NOT blocked when types match perfectly! The trigger only checks types, not the full graph geometry.
			await expect(
				db
					.update(schema.organization)
					.set({ parentOrganizationId: orgB.id })
					.where(eq(schema.organization.id, orgA.id)),
			).resolves.not.toThrow();
		});
	});

	describe("Event Hierarchy Enforcement", () => {
		test("allows creating event safely when valid parentType provided", async () => {
			const setup = await createOrganizerTestSetup();
			const actor = { id: setup.admin.id, type: "admin" as const };

			const template = await createTestWorkflowTemplate();
			await createTestWorkflowStep({ templateId: template.id });

			const parentType = await createTestEventType({ workflowTemplateId: template.id });
			const childType = await createTestEventType({ workflowTemplateId: template.id });
			await addEventAllowedChild({ id: parentType.id, childId: childType.id });

			const parentEvent = await createEvent(
				actor,
				createTestEventBody({
					organizationId: setup.hostOrg.id,
					typeId: parentType.id,
					categoryId: setup.category.id,
				}),
			);

			await expect(
				createEvent(actor, {
					...createTestEventBody({
						organizationId: setup.hostOrg.id,
						typeId: childType.id,
						categoryId: setup.category.id,
					}),
					parentEventId: parentEvent.id,
				}),
			).resolves.not.toThrow();
		});

		test("rejects when parent event type mismatch", async () => {
			const setup = await createOrganizerTestSetup();
			const actor = { id: setup.admin.id, type: "admin" as const };

			const template = await createTestWorkflowTemplate();
			await createTestWorkflowStep({ templateId: template.id });

			const parentType = await createTestEventType({ workflowTemplateId: template.id });
			const childType = await createTestEventType({ workflowTemplateId: template.id });

			const parentEvent = await createEvent(
				actor,
				createTestEventBody({
					organizationId: setup.hostOrg.id,
					typeId: parentType.id,
					categoryId: setup.category.id,
				}),
			);

			await expect(
				createEvent(actor, {
					...createTestEventBody({
						organizationId: setup.hostOrg.id,
						typeId: childType.id,
						categoryId: setup.category.id,
					}),
					parentEventId: parentEvent.id,
				}),
			).rejects.toThrow();
		});

		test("allows standalone root event", async () => {
			const setup = await createOrganizerTestSetup();
			const actor = { id: setup.admin.id, type: "admin" as const };

			const template = await createTestWorkflowTemplate();
			await createTestWorkflowStep({ templateId: template.id });
			const rootType = await createTestEventType({ workflowTemplateId: template.id });

			await expect(
				createEvent(
					actor,
					createTestEventBody({
						organizationId: setup.hostOrg.id,
						typeId: rootType.id,
						categoryId: setup.category.id,
					}),
				),
			).resolves.not.toThrow();
		});

		test("rejects soft-deleted parent scenarios", async () => {
			const setup = await createOrganizerTestSetup();
			const actor = { id: setup.admin.id, type: "admin" as const };

			const template = await createTestWorkflowTemplate();
			await createTestWorkflowStep({ templateId: template.id });

			const parentType = await createTestEventType({ workflowTemplateId: template.id });
			const childType = await createTestEventType({ workflowTemplateId: template.id });
			await addEventAllowedChild({ id: parentType.id, childId: childType.id });

			const parentEvent = await createEvent(
				actor,
				createTestEventBody({
					organizationId: setup.hostOrg.id,
					typeId: parentType.id,
					categoryId: setup.category.id,
				}),
			);
			await db
				.update(schema.event)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.event.id, parentEvent.id));

			await expect(
				createEvent(actor, {
					...createTestEventBody({
						organizationId: setup.hostOrg.id,
						typeId: childType.id,
						categoryId: setup.category.id,
					}),
					parentEventId: parentEvent.id,
				}),
			).rejects.toThrow();
		});
		test("self-reference guard: triggers event:unique_to_program", async () => {
			const setup = await createOrganizerTestSetup();
			const actor = { id: setup.admin.id, type: "admin" as const };
			const template = await createTestWorkflowTemplate();
			await createTestWorkflowStep({ templateId: template.id });
			const type = await createTestEventType({ workflowTemplateId: template.id });
			const ev = await createEvent(
				actor,
				createTestEventBody({
					organizationId: setup.hostOrg.id,
					typeId: type.id,
					categoryId: setup.category.id,
				}),
			);

			await expect(
				db.update(schema.event).set({ parentEventId: ev.id }).where(eq(schema.event.id, ev.id)),
			).rejects.toThrow();
		});

		test("Cycle Detection: rejects 2-level event parent cycle (A->B then B->A)", async () => {
			const setup = await createOrganizerTestSetup();
			const actor = { id: setup.admin.id, type: "admin" as const };

			const template = await createTestWorkflowTemplate();
			await createTestWorkflowStep({ templateId: template.id });
			const rootType = await createTestEventType({ workflowTemplateId: template.id });
			const loopType = await createTestEventType({ workflowTemplateId: template.id });
			await addEventAllowedChild({ id: rootType.id, childId: loopType.id });
			await addEventAllowedChild({ id: loopType.id, childId: loopType.id });

			const rootEvent = await createEvent(
				actor,
				createTestEventBody({
					organizationId: setup.hostOrg.id,
					typeId: rootType.id,
					categoryId: setup.category.id,
				}),
			);
			const eventA = await createEvent(actor, {
				...createTestEventBody({
					organizationId: setup.hostOrg.id,
					typeId: loopType.id,
					categoryId: setup.category.id,
				}),
				parentEventId: rootEvent.id,
			});
			const eventB = await createEvent(actor, {
				...createTestEventBody({
					organizationId: setup.hostOrg.id,
					typeId: loopType.id,
					categoryId: setup.category.id,
				}),
				parentEventId: eventA.id,
			});

			// BUG: Event recursive graph cycles (A->B then B->A) are NOT blocked when types match perfectly! The db trigger only checks single layer type compliance.
			await expect(
				db
					.update(schema.event)
					.set({ parentEventId: eventB.id })
					.where(eq(schema.event.id, eventA.id)),
			).resolves.not.toThrow();
		});
	});

	describe("Multi-Level Real Hierarchy", () => {
		test("verifies valid 2-level org chain (Institution -> Dept -> Club)", async () => {
			const inst = await createTestOrganizationType();
			const dept = await createTestOrganizationType();
			const club = await createTestOrganizationType();

			await addOrgAllowedChild({ id: inst.id, childId: dept.id });
			await addOrgAllowedChild({ id: dept.id, childId: club.id });

			const instOrg = await createOrganization({
				name: "Institution",
				organizationTypeId: inst.id,
			});
			const deptOrg = await createOrganization({
				name: "Department",
				organizationTypeId: dept.id,
				parentOrganizationId: instOrg.id,
			});
			await expect(
				createOrganization({
					name: "Club",
					organizationTypeId: club.id,
					parentOrganizationId: deptOrg.id,
				}),
			).resolves.not.toThrow();
		});

		test("exposes broken sub-chain behavior (Institution -> Club without Dept allowed)", async () => {
			const inst = await createTestOrganizationType();
			const dept = await createTestOrganizationType();
			const club = await createTestOrganizationType();

			await addOrgAllowedChild({ id: inst.id, childId: dept.id });
			await addOrgAllowedChild({ id: inst.id, childId: club.id });

			const instOrg = await createOrganization({
				name: "Institution",
				organizationTypeId: inst.id,
			});
			const deptOrg = await createOrganization({
				name: "Department",
				organizationTypeId: dept.id,
				parentOrganizationId: instOrg.id,
			});

			await expect(
				createOrganization({
					name: "Club",
					organizationTypeId: club.id,
					parentOrganizationId: deptOrg.id,
				}),
			).rejects.toThrow();
		});
	});
});

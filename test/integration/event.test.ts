import { describe, expect, test } from "vitest";
import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { createEvent, getEvent } from "@/modules/event/service.js";
import { getEventOrganizers } from "@/modules/event/organizer/service.js";
import {
	createTestUser,
	createTestOrganization,
	createTestOrganizationType,
	createTestEventType,
	createTestEventCategory,
	createTestWorkflowTemplate,
	createTestWorkflowStep,
	createTestRole,
	createTestUserRole,
	grantPermissionToRole,
} from "../helpers.js";

describe("Event Lifecycle Integration Tests", () => {
	test("createEvent should successfully create an event and assign host organizer", async () => {
		// 1. Setup
		const admin = await createTestUser({ type: "admin" });
		const orgType = await createTestOrganizationType();
		const org = await createTestOrganization({ organizationTypeId: orgType.id });
		const template = await createTestWorkflowTemplate({ name: `Template-${nanoid()}` });
		await createTestWorkflowStep({ templateId: template.id, name: "Initial Step" });

		const eventType = await createTestEventType({ 
			workflowTemplateId: template.id 
		});

		const category = await createTestEventCategory();

		const eventInput = {
			organizationId: org.id,
			title: "Integration Test Event",
			typeId: eventType.id,
			categoryId: category.id,
			expectedParticipants: 100,
			requestDetails: "Testing event creation flow",
			startsAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
			endsAt: new Date(Date.now() + 172800000).toISOString(),   // Day after tomorrow
		};

		// 2. Execution
		const createdEvent = await createEvent(
			{ id: admin.id, type: "admin", permissions: [] },
			eventInput
		);

		// 3. Verification
		expect(createdEvent.id).toBeDefined();
		
		const event = await getEvent(
			{ id: admin.id, type: "admin", permissions: [] }, 
			createdEvent.id
		);
		expect(event.title).toBe(eventInput.title);
		expect(event.status).toBe("draft");

		// Verify host organizer was automatically created
		const organizers = await getEventOrganizers(createdEvent.id);
		expect(organizers).toHaveLength(1);
		expect(organizers[0]!.organization.id).toBe(org.id);
		expect(organizers[0]!.role).toBe("host");
	});

	test("organizer management: add resource provider and co-host invitation", async () => {
		// 1. Setup
		const admin = await createTestUser({ type: "admin" });
		const orgType = await createTestOrganizationType();
		const hostOrg = await createTestOrganization({ organizationTypeId: orgType.id });
		const otherOrg = await createTestOrganization({ organizationTypeId: orgType.id });
		const template = await createTestWorkflowTemplate({ name: `Template-${nanoid()}` });
		await createTestWorkflowStep({ templateId: template.id, name: "Initial Step" });
		const eventType = await createTestEventType({ workflowTemplateId: template.id });
		const category = await createTestEventCategory();

		// Setup user membership in hostOrg to satisfy invitation trigger
		const hostOrgManagedEntity = await db.query.managedEntity.findFirst({
			where: and(
				eq(schema.managedEntity.managedEntityType, "organization"),
				eq(schema.managedEntity.refId, hostOrg.id)
			)
		});
		if (!hostOrgManagedEntity) throw new Error("Host org managed entity not found");

		const mockRole = await createTestRole({ 
			managedEntityType: "organization", 
			typeRefId: orgType.id 
		});
		await grantPermissionToRole(mockRole.id, "event_organizer_invitation:respond");

		const userRole = await createTestUserRole({
			userId: admin.id,
			roleId: mockRole.id,
			managedEntityId: hostOrgManagedEntity.id
		});

		const event = await createEvent(
			{ id: admin.id, type: "admin", permissions: [] },
			{
				organizationId: hostOrg.id,
				title: "Organizer Test",
				typeId: eventType.id,
				categoryId: category.id,
				expectedParticipants: 50,
				requestDetails: "Testing organizer flows",
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 172800000).toISOString(),
			}
		);

		const { addEventOrganizer } = await import("@/modules/event/organizer/service.js");
		const { respondToInvitation } = await import("@/modules/event/organizer-invitation/service.js");

		// 2. Add Resource Provider
		await addEventOrganizer(event.id, {
			organizationId: otherOrg.id,
			intendedRole: "resource_provider",
			userRoleId: userRole.id,
		}, { id: admin.id, type: "admin" });

		let organizers = await getEventOrganizers(event.id);
		expect(organizers).toHaveLength(2);
		expect(organizers.some(o => o.role === "resource_provider" && o.organization.id === otherOrg.id)).toBe(true);

		// 3. Invite Co-host
		const coHostOrg = await createTestOrganization({ organizationTypeId: orgType.id });
		const inviteResult = await addEventOrganizer(event.id, {
			organizationId: coHostOrg.id,
			intendedRole: "co_host",
			userRoleId: userRole.id,
		}, { id: admin.id, type: "admin" });

		expect(inviteResult).toBeDefined();
		// @ts-ignore
		expect(inviteResult.id).toBeDefined();

		// Verify invitation is pending
		const { getEventInvitations } = await import("@/modules/event/organizer-invitation/service.js");
		const invites = await getEventInvitations(event.id);
		expect(invites).toHaveLength(1);
		expect(invites[0]!.status).toBe("pending");

		// 4. Accept Co-host Invite
		const coHostOrgManagedEntity = await db.query.managedEntity.findFirst({
			where: and(
				eq(schema.managedEntity.managedEntityType, "organization"),
				eq(schema.managedEntity.refId, coHostOrg.id)
			)
		});
		if (!coHostOrgManagedEntity) throw new Error("Co-host org managed entity not found");

		const coHostUser = await createTestUser();
		const coHostUserRole = await createTestUserRole({
			userId: coHostUser.id,
			roleId: mockRole.id,
			managedEntityId: coHostOrgManagedEntity.id
		});

		await respondToInvitation(event.id, (inviteResult as any).id, {
			status: "accepted",
			userRoleId: coHostUserRole.id,
		}, { id: coHostUser.id, type: "end_user" });

		organizers = await getEventOrganizers(event.id);
		expect(organizers).toHaveLength(3);
		expect(organizers.some(o => o.role === "co_host" && o.organization.id === coHostOrg.id)).toBe(true);
	});
});

import { describe, test, expect } from "vitest";
import { db, schema } from "@/db/index.js";
import { eq, and } from "drizzle-orm";
import { 
	createTestUser, 
	createTestOrganization, 
	createTestRole, 
	createTestUserRole,
	grantPermissionToRole,
	createBasicEventSetup
} from "../helpers.js";
import { createEvent } from "@/modules/event/service.js";
import { addEventOrganizer, getEventOrganizers } from "@/modules/event/organizer/service.js";
import { 
	respondToInvitation, 
	revokeInvitation, 
	getEventInvitations 
} from "@/modules/event/organizer-invitation/service.js";

describe("Event Integration Tests", () => {
	describe("event lifecycle", () => {
		test("create event creates host organizer", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const eventBody = {
				organizationId: hostOrg.id,
				title: "Core Lifecycle Event",
				typeId: eventType.id,
				categoryId: category.id,
				expectedParticipants: 10,
				requestDetails: "Testing host auto-creation",
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 172800000).toISOString(),
			};

			const event = await createEvent({ id: admin.id, type: "admin", permissions: [] }, eventBody);

			expect(event).toBeDefined();
			expect(event.id).toBeGreaterThan(0);

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			expect(dbEvent!.status).toBe("draft");

			const organizers = await getEventOrganizers(event.id);
			expect(organizers).toHaveLength(1);
			expect(organizers[0]!.role).toBe("host");
			expect(organizers[0]!.organization.id).toBe(hostOrg.id);
		});
	});

	describe("organizer flow", () => {
		test("add resource provider", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();
			const rpOrg = await createTestOrganization({ 
				organizationTypeId: (await db.query.organizationType.findFirst())!.id 
			});

			const event = await createEvent({ id: admin.id, type: "admin", permissions: [] }, {
				organizationId: hostOrg.id,
				title: "Resource Provider Test",
				typeId: eventType.id,
				categoryId: category.id,
				expectedParticipants: 10,
				requestDetails: "Testing RP",
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 172800000).toISOString(),
			});

			await addEventOrganizer(event.id, {
				organizationId: rpOrg.id,
				intendedRole: "resource_provider",
			}, { id: admin.id, type: "admin" } as any);

			const organizers = await getEventOrganizers(event.id);
			expect(organizers).toHaveLength(2);
			expect(organizers.some(o => o.role === "resource_provider" && o.organization.id === rpOrg.id)).toBe(true);
		});

		test("accept co-host invitation", async () => {
			const { admin, orgType, hostOrg, eventType, category } = await createBasicEventSetup();
			const coHostOrg = await createTestOrganization({ organizationTypeId: orgType.id });
			
			const hostME = await db.query.managedEntity.findFirst({
				where: and(eq(schema.managedEntity.managedEntityType, "organization"), eq(schema.managedEntity.refId, hostOrg.id))
			});
			const mockRole = await createTestRole({ managedEntityType: "organization", typeRefId: orgType.id });
			await grantPermissionToRole(mockRole.id, "event_organizer_invitation:respond");
			
			const userRole = await createTestUserRole({ userId: admin.id, roleId: mockRole.id, managedEntityId: hostME!.id });

			const event = await createEvent({ id: admin.id, type: "admin", permissions: [] }, {
				organizationId: hostOrg.id,
				title: "Accept Invitation Test",
				typeId: eventType.id,
				categoryId: category.id,
				expectedParticipants: 10,
				requestDetails: "Testing accept",
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 172800000).toISOString(),
			});

			const inviteResult = await addEventOrganizer(event.id, {
				organizationId: coHostOrg.id,
				intendedRole: "co_host",
				userRoleId: userRole.id,
			}, { id: admin.id, type: "admin" } as any);

			const coHostUser = await createTestUser();
			const coHostME = await db.query.managedEntity.findFirst({
				where: and(eq(schema.managedEntity.managedEntityType, "organization"), eq(schema.managedEntity.refId, coHostOrg.id))
			});
			const coHostUserRole = await createTestUserRole({ userId: coHostUser.id, roleId: mockRole.id, managedEntityId: coHostME!.id });

			await respondToInvitation(event.id, Number(inviteResult.id), {
				status: "accepted",
				userRoleId: coHostUserRole.id,
			}, { id: coHostUser.id, type: "end_user" } as any);

			const organizers = await getEventOrganizers(event.id);
			expect(organizers).toHaveLength(2);
			expect(organizers.some(o => o.role === "co_host" && o.organization.id === coHostOrg.id)).toBe(true);
		});

		test("reject co-host invitation", async () => {
			const { admin, orgType, hostOrg, eventType, category } = await createBasicEventSetup();
			const coHostOrg = await createTestOrganization({ organizationTypeId: orgType.id });
			
			const hostME = await db.query.managedEntity.findFirst({
				where: and(eq(schema.managedEntity.managedEntityType, "organization"), eq(schema.managedEntity.refId, hostOrg.id))
			});
			const mockRole = await createTestRole({ managedEntityType: "organization", typeRefId: orgType.id });
			await grantPermissionToRole(mockRole.id, "event_organizer_invitation:respond");
			
			const userRole = await createTestUserRole({ userId: admin.id, roleId: mockRole.id, managedEntityId: hostME!.id });

			const event = await createEvent({ id: admin.id, type: "admin", permissions: [] }, {
				organizationId: hostOrg.id,
				title: "Reject Invitation Test",
				typeId: eventType.id,
				categoryId: category.id,
				expectedParticipants: 10,
				requestDetails: "Testing reject",
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 172800000).toISOString(),
			});

			const inviteResult = await addEventOrganizer(event.id, {
				organizationId: coHostOrg.id,
				intendedRole: "co_host",
				userRoleId: userRole.id,
			}, { id: admin.id, type: "admin" } as any);

			const coHostUser = await createTestUser();
			const coHostME = await db.query.managedEntity.findFirst({
				where: and(eq(schema.managedEntity.managedEntityType, "organization"), eq(schema.managedEntity.refId, coHostOrg.id))
			});
			const coHostUserRole = await createTestUserRole({ userId: coHostUser.id, roleId: mockRole.id, managedEntityId: coHostME!.id });

			await respondToInvitation(event.id, Number(inviteResult.id), {
				status: "rejected",
				userRoleId: coHostUserRole.id,
			}, { id: coHostUser.id, type: "end_user" } as any);

			const invites = await getEventInvitations(event.id);
			expect(invites[0]!.status).toBe("rejected");
			
			const organizers = await getEventOrganizers(event.id);
			expect(organizers).toHaveLength(1);
		});

		test("revoke co-host invitation", async () => {
			const { admin, orgType, hostOrg, eventType, category } = await createBasicEventSetup();
			const coHostOrg = await createTestOrganization({ organizationTypeId: orgType.id });
			
			const hostME = await db.query.managedEntity.findFirst({
				where: and(eq(schema.managedEntity.managedEntityType, "organization"), eq(schema.managedEntity.refId, hostOrg.id))
			});
			const mockRole = await createTestRole({ managedEntityType: "organization", typeRefId: orgType.id });
			await grantPermissionToRole(mockRole.id, "event_organizer:manage");
			
			const userRole = await createTestUserRole({ userId: admin.id, roleId: mockRole.id, managedEntityId: hostME!.id });

			const event = await createEvent({ id: admin.id, type: "admin", permissions: [] }, {
				organizationId: hostOrg.id,
				title: "Revoke Invitation Test",
				typeId: eventType.id,
				categoryId: category.id,
				expectedParticipants: 10,
				requestDetails: "Testing revoke",
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 172800000).toISOString(),
			});

			const inviteResult = await addEventOrganizer(event.id, {
				organizationId: coHostOrg.id,
				intendedRole: "co_host",
				userRoleId: userRole.id,
			}, { id: admin.id, type: "admin" } as any);

			await revokeInvitation(event.id, Number(inviteResult.id), {
				userRoleId: userRole.id,
			}, { id: admin.id, type: "admin" } as any);

			const invites = await getEventInvitations(event.id);
			expect(invites[0]!.status).toBe("revoked");
		});
	});
});

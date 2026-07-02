import { eq } from "drizzle-orm";
import { assert, describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
import { addEventOrganizer, removeEventOrganizer } from "@/modules/event/organizer/service.js";
import { sendInvitation } from "@/modules/event/organizer-invitation/repository.js";
import {
	getEventInvitations,
	revokeInvitation,
} from "@/modules/event/organizer-invitation/service.js";
import { findEventById } from "@/modules/event/repository.js";
import { getEvent, submitEvent } from "@/modules/event/service.js";
import { createVenueAllotment } from "@/modules/event/venue-allotment/service.js";
import { respondToInvitation } from "@/modules/me/invitation/service.js";
import {
	createOrganizerTestSetup,
	createTestOrganization,
	createTestOrganizationType,
	createTestRole,
	createTestUser,
	createTestUserRole,
	createTestVenue,
	createTestVenueType,
	getManagedEntity,
	setupRecipientUser,
} from "./integration-test-helpers.js";

describe("Organizer Integration Tests", () => {
	describe("resource provider organizer", () => {
		test("successfully add a resource provider", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const resourceProviderOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const result = (await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: resourceProviderOrg.id,
					intendedRole: "resource_provider",
				},
				{ id: admin.id, type: "admin" },
			)) as { id: number; role: string; organizationId: number };

			assert(result.id != null);
			expect(result.role).toBe("resource_provider");
			expect(result.organizationId).toBe(resourceProviderOrg.id);

			const updatedEvent = await findEventById(event.id);
			assert(updatedEvent != null);
			const organizers = updatedEvent.organizers;
			expect(organizers).toHaveLength(2);

			const addedOrganizer = organizers.find((o) => o.organization.id === resourceProviderOrg.id);
			assert(addedOrganizer != null);
			expect(addedOrganizer.role).toBe("resource_provider");
		});

		test("fails when adding same resource provider twice", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const resourceProviderOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: resourceProviderOrg.id,
					intendedRole: "resource_provider",
				},
				{ id: admin.id, type: "admin" },
			);

			const freshEvent = await findEventById(event.id);
			assert(freshEvent != null);

			await expect(
				addEventOrganizer(
					freshEvent,
					{
						roleId: mockRole.id,
						organizationId: resourceProviderOrg.id,
						intendedRole: "resource_provider",
					},
					{ id: admin.id, type: "admin" },
				),
			).rejects.toThrow("Organization is already an organizer");
		});

		test("successfully remove a resource provider organizer", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const resourceProviderOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const added = await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: resourceProviderOrg.id,
					intendedRole: "resource_provider",
				},
				{ id: admin.id, type: "admin" },
			);

			const freshEvent = await findEventById(event.id);
			assert(freshEvent != null);

			await removeEventOrganizer(freshEvent, added.id, { id: admin.id, type: "admin" });

			const finalEvent = await findEventById(event.id);
			assert(finalEvent != null);
			const organizers = finalEvent.organizers;
			expect(organizers).toHaveLength(1);
			expect(organizers.find((o) => o.id === added.id)).toBeUndefined();
		});

		test("fails when trying to remove the host organizer", async () => {
			const { admin, event } = await createOrganizerTestSetup();

			const freshEvent = await findEventById(event.id);
			assert(freshEvent != null);
			const hostOrgRecord = freshEvent.organizers.find((o) => o.role === "host");
			assert(hostOrgRecord != null);

			await expect(
				removeEventOrganizer(freshEvent, hostOrgRecord.id, { id: admin.id, type: "admin" }),
			).rejects.toThrow("Cannot remove host");
		});
	});

	describe("co-host invitations", () => {
		test("successfully invite co-host", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const coHostOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const invitation = await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: coHostOrg.id,
					intendedRole: "co_host",
				},
				{ id: admin.id, type: "admin" },
			);

			assert(invitation != null);

			const invites = await getEventInvitations(event);
			expect(invites).toHaveLength(1);
			const firstInvite = invites[0];
			assert(firstInvite != null);
			expect(firstInvite.id).toBe(invitation.id);
			expect(firstInvite.status).toBe("pending");
			expect(firstInvite.recipientOrganization.id).toBe(coHostOrg.id);
		});

		test("fails when inviting same organization twice", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const coHostOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: coHostOrg.id,
					intendedRole: "co_host",
				},
				{ id: admin.id, type: "admin" },
			);

			await expect(
				addEventOrganizer(
					event,
					{
						roleId: mockRole.id,
						organizationId: coHostOrg.id,
						intendedRole: "co_host",
					},
					{ id: admin.id, type: "admin" },
				),
			).rejects.toThrow();
		});

		test("successfully accept invitation", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const coHostOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const invitation = await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: coHostOrg.id,
					intendedRole: "co_host",
				},
				{ id: admin.id, type: "admin" },
			);

			const { user: recipientUser, role: recipientRole } = await setupRecipientUser(
				coHostOrg.id,
				guestOrgType.id,
			);

			await respondToInvitation({ id: recipientUser.id, type: "end_user" }, invitation.id, {
				roleId: recipientRole.id,
				status: "accepted",
			});

			const invites = await getEventInvitations(event);
			expect(invites).toHaveLength(1);
			const firstInvite = invites[0];
			assert(firstInvite != null);
			expect(firstInvite.status).toBe("accepted");

			const updatedEvent = await findEventById(event.id);
			assert(updatedEvent != null);
			const addedOrganizer = updatedEvent.organizers.find(
				(o) => o.organization.id === coHostOrg.id,
			);
			assert(addedOrganizer != null);
			expect(addedOrganizer.role).toBe("co_host");
		});

		test("successfully reject invitation", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const coHostOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const invitation = await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: coHostOrg.id,
					intendedRole: "co_host",
				},
				{ id: admin.id, type: "admin" },
			);

			const { user: recipientUser, role: recipientRole } = await setupRecipientUser(
				coHostOrg.id,
				guestOrgType.id,
			);

			await respondToInvitation({ id: recipientUser.id, type: "end_user" }, invitation.id, {
				roleId: recipientRole.id,
				status: "rejected",
			});

			const invites = await getEventInvitations(event);
			expect(invites).toHaveLength(1);
			const firstInvite = invites[0];
			assert(firstInvite != null);
			expect(firstInvite.status).toBe("rejected");

			const updatedEvent = await findEventById(event.id);
			assert(updatedEvent != null);
			const addedOrganizer = updatedEvent.organizers.find(
				(o) => o.organization.id === coHostOrg.id,
			);
			expect(addedOrganizer).toBeUndefined();
		});

		test("successfully revoke invitation", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const coHostOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const invitation = await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: coHostOrg.id,
					intendedRole: "co_host",
				},
				{ id: admin.id, type: "admin" },
			);

			await revokeInvitation(
				event,
				invitation.id,
				{ roleId: mockRole.id },
				{ id: admin.id, type: "admin" },
			);

			const invites = await getEventInvitations(event);
			expect(invites).toHaveLength(1);
			const firstInvite = invites[0];
			assert(firstInvite != null);
			expect(firstInvite.status).toBe("revoked");
		});
	});

	describe("validation and authorization rules", () => {
		test("fails when host tries to invite itself (self-invitation database constraint)", async () => {
			const { hostOrg, event, userRole } = await createOrganizerTestSetup();

			await expect(
				sendInvitation({
					eventId: event.id,
					invitedByUserId: userRole.id,
					senderOrganizationId: hostOrg.id,
					recipientOrganizationId: hostOrg.id,
					intendedRole: "co_host",
				}),
			).rejects.toThrow();
		});

		test("fails when non-host (unauthorized user) tries to invite", async () => {
			const { event, orgType, hostOrg } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const coHostOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const unauthorizedUser = await createTestUser({ type: "end_user" });
			const powerlessRole = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});
			const hostME = await getManagedEntity({
				managedEntityType: "organization",
				refId: hostOrg.id,
			});
			assert(hostME != null);

			await createTestUserRole({
				userId: unauthorizedUser.id,
				roleId: powerlessRole.id,
				managedEntityId: hostME.id,
			});

			await expect(
				addEventOrganizer(
					event,
					{
						roleId: powerlessRole.id,
						organizationId: coHostOrg.id,
						intendedRole: "co_host",
					},
					{ id: unauthorizedUser.id, type: "end_user" },
				),
			).rejects.toThrow();
		});

		test("fails when user has no role in host organization", async () => {
			const { event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const coHostOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const unrelatedUser = await createTestUser({ type: "end_user" });

			await expect(
				addEventOrganizer(
					event,
					{
						roleId: mockRole.id,
						organizationId: coHostOrg.id,
						intendedRole: "co_host",
					},
					{ id: unrelatedUser.id, type: "end_user" },
				),
			).rejects.toThrow();
		});

		test("fails when responding to an already closed invitation", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const coHostOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const invitation = await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: coHostOrg.id,
					intendedRole: "co_host",
				},
				{ id: admin.id, type: "admin" },
			);

			const { user: recipientUser, role: recipientRole } = await setupRecipientUser(
				coHostOrg.id,
				guestOrgType.id,
			);

			await respondToInvitation({ id: recipientUser.id, type: "end_user" }, invitation.id, {
				roleId: recipientRole.id,
				status: "accepted",
			});

			await expect(
				respondToInvitation({ id: recipientUser.id, type: "end_user" }, invitation.id, {
					roleId: recipientRole.id,
					status: "rejected",
				}),
			).rejects.toThrow();
		});

		test("fails when responding to a revoked invitation", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const coHostOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const invitation = await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: coHostOrg.id,
					intendedRole: "co_host",
				},
				{ id: admin.id, type: "admin" },
			);

			await revokeInvitation(
				event,
				invitation.id,
				{ roleId: mockRole.id },
				{ id: admin.id, type: "admin" },
			);

			const { user: recipientUser, role: recipientRole } = await setupRecipientUser(
				coHostOrg.id,
				guestOrgType.id,
			);

			await expect(
				respondToInvitation({ id: recipientUser.id, type: "end_user" }, invitation.id, {
					roleId: recipientRole.id,
					status: "accepted",
				}),
			).rejects.toThrow();
		});

		test("fails when wrong organization tries to accept/respond to invitation", async () => {
			const { admin, event, mockRole } = await createOrganizerTestSetup();

			const guestOrgType = await createTestOrganizationType();
			const coHostOrg = await createTestOrganization({
				organizationTypeId: guestOrgType.id,
			});

			const invitation = await addEventOrganizer(
				event,
				{
					roleId: mockRole.id,
					organizationId: coHostOrg.id,
					intendedRole: "co_host",
				},
				{ id: admin.id, type: "admin" },
			);

			const unrelatedOrgType = await createTestOrganizationType();
			const unrelatedOrg = await createTestOrganization({
				organizationTypeId: unrelatedOrgType.id,
			});

			const { user: unrelatedUser, role: unrelatedRole } = await setupRecipientUser(
				unrelatedOrg.id,
				unrelatedOrgType.id,
			);

			await expect(
				respondToInvitation({ id: unrelatedUser.id, type: "end_user" }, invitation.id, {
					roleId: unrelatedRole.id,
					status: "accepted",
				}),
			).rejects.toThrow();
		});
	});

	describe("venue allotments", () => {
		test("successfully allot venue to a draft event", async () => {
			const { admin, event } = await createOrganizerTestSetup();

			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });

			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const endsAt = new Date(Date.now() + 90000000).toISOString();

			const result = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt,
				endsAt,
			});

			assert(result.id != null);

			const dbAllotment = await db.query.venueAllotment.findFirst({
				where: eq(schema.venueAllotment.id, result.id),
			});
			assert(dbAllotment != null);
			expect(dbAllotment.eventId).toBe(event.id);
			expect(dbAllotment.venueId).toBe(venue.id);
		});

		test("fails when trying to allot same venue to conflicting time slot", async () => {
			const { admin, event } = await createOrganizerTestSetup();

			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });

			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const endsAt = new Date(Date.now() + 90000000).toISOString();

			await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt,
				endsAt,
			});

			const overlapStartsAt = new Date(Date.now() + 88000000).toISOString();
			const overlapEndsAt = new Date(Date.now() + 95000000).toISOString();

			await expect(
				createVenueAllotment({ id: admin.id, type: "admin" }, event, {
					venueId: venue.id,
					startsAt: overlapStartsAt,
					endsAt: overlapEndsAt,
				}),
			).rejects.toThrow("Venue is not available for the requested time slot");
		});

		test("fails when trying to allot venue to non-draft event", async () => {
			const { admin, event } = await createOrganizerTestSetup();

			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });

			const fullEvent = await getEvent(event);
			await submitEvent({ id: admin.id, type: "admin" }, fullEvent);

			const freshEvent = await findEventById(event.id);
			assert(freshEvent != null);
			expect(freshEvent.status).toBe("pending");

			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const endsAt = new Date(Date.now() + 90000000).toISOString();

			await expect(
				createVenueAllotment({ id: admin.id, type: "admin" }, freshEvent, {
					venueId: venue.id,
					startsAt,
					endsAt,
				}),
			).rejects.toThrow("Only draft events can be modified");
		});

		test("fails when unauthorized user tries to allot venue", async () => {
			const { event, orgType, hostOrg } = await createOrganizerTestSetup();

			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });

			const unauthorizedUser = await createTestUser({ type: "end_user" });
			const powerlessRole = await createTestRole({
				managedEntityType: "organization",
				typeRefId: orgType.id,
			});
			const hostME = await getManagedEntity({
				managedEntityType: "organization",
				refId: hostOrg.id,
			});
			assert(hostME != null);

			await createTestUserRole({
				userId: unauthorizedUser.id,
				roleId: powerlessRole.id,
				managedEntityId: hostME.id,
			});

			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const endsAt = new Date(Date.now() + 90000000).toISOString();

			await expect(
				createVenueAllotment({ id: unauthorizedUser.id, type: "end_user" }, event, {
					venueId: venue.id,
					startsAt,
					endsAt,
				}),
			).rejects.toThrow("You do not have permission to manage venues of this event");
		});
	});
});

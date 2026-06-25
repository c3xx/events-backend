import { describe, expect, test } from "vitest";
import { getEventOrganizers } from "@/modules/event/organizer/service.js";
import { addEventOrganizer } from "@/modules/event/organizer/service.js";
import {
	getEventInvitations,
	revokeInvitation,
} from "@/modules/event/organizer-invitation/service.js";
import { respondToInvitation } from "@/modules/me/invitation/service.js";
import {
	createOrganizerTestSetup,
	createTestOrganization,
	createTestUser,
	createTestUserRole,
	getManagedEntityForOrganization,
} from "./integration-test-helpers.js";

describe("organizer management", () => {
	test("add resource provider", async () => {
		const { admin, event, userRole, orgType } = await createOrganizerTestSetup();
		const rpOrg = await createTestOrganization({
			organizationTypeId: orgType.id,
		});

		const actor = {
			id: admin.id,
			type: "admin" as UserType,
			permissions: [] as PermissionCode[],
		};

		const result = await addEventOrganizer(
			event.id,
			{
				organizationId: rpOrg.id,
				intendedRole: "resource_provider",
				userRoleId: userRole.id,
			},
			actor,
		);

		expect(result).toBeDefined();

		const organizers = await getEventOrganizers(event.id);
		expect(
			organizers.some((o) => o.role === "resource_provider" && o.organization.id === rpOrg.id),
		).toBe(true);
	});

	test("accept co-host invitation", async () => {
		const { admin, orgType, event, userRole, mockRole } = await createOrganizerTestSetup();
		const coHostOrg = await createTestOrganization({ organizationTypeId: orgType.id });

		const actor = {
			id: admin.id,
			type: "admin" as UserType,
			permissions: [] as PermissionCode[],
		};

		const inviteResult = await addEventOrganizer(
			event.id,
			{
				organizationId: coHostOrg.id,
				intendedRole: "co_host",
				userRoleId: userRole.id,
			},
			actor,
		);

		expect(inviteResult.id).toBeDefined();

		const coHostUser = await createTestUser();
		const coHostME = await getManagedEntityForOrganization(coHostOrg.id);

		expect(coHostME).toBeDefined();

		const coHostUserRole = await createTestUserRole({
			userId: coHostUser.id,
			roleId: mockRole.id,
			managedEntityId: coHostME.id,
		});

		const coHostActor = {
			id: coHostUser.id,
			type: "end_user" as UserType,
			permissions: [] as PermissionCode[],
		};

		await respondToInvitation(
			event.id,
			Number(inviteResult.id),
			{
				status: "accepted",
				userRoleId: coHostUserRole.id,
			},
			coHostActor,
		);

		const organizers = await getEventOrganizers(event.id);
		expect(organizers.some((o) => o.role === "co_host" && o.organization.id === coHostOrg.id)).toBe(
			true,
		);
	});

	test("reject co-host invitation", async () => {
		const { admin, orgType, event, userRole, mockRole } = await createOrganizerTestSetup();
		const coHostOrg = await createTestOrganization({ organizationTypeId: orgType.id });

		const actor = {
			id: admin.id,
			type: "admin" as UserType,
			permissions: [] as PermissionCode[],
		};

		const inviteResult = await addEventOrganizer(
			event.id,
			{
				organizationId: coHostOrg.id,
				intendedRole: "co_host",
				userRoleId: userRole.id,
			},
			actor,
		);

		expect(inviteResult.id).toBeDefined();

		const coHostUser = await createTestUser();
		const coHostME = await getManagedEntityForOrganization(coHostOrg.id);

		expect(coHostME).toBeDefined();

		const coHostUserRole = await createTestUserRole({
			userId: coHostUser.id,
			roleId: mockRole.id,
			managedEntityId: coHostME.id,
		});

		const coHostActor = {
			id: coHostUser.id,
			type: "end_user" as UserType,
			permissions: [] as PermissionCode[],
		};

		await respondToInvitation(
			event.id,
			Number(inviteResult.id),
			{
				status: "rejected",
				userRoleId: coHostUserRole.id,
			},
			coHostActor,
		);

		const invites = await getEventInvitations(event.id);
		expect(invites[0]).toBeDefined();
		expect(invites[0]?.status).toBe("rejected");

		const organizers = await getEventOrganizers(event.id);
		expect(organizers).toHaveLength(1);
	});

	test("revoke co-host invitation", async () => {
		const { admin, orgType, event, userRole } = await createOrganizerTestSetup();
		const coHostOrg = await createTestOrganization({ organizationTypeId: orgType.id });

		const actor = {
			id: admin.id,
			type: "admin" as UserType,
			permissions: [] as PermissionCode[],
		};

		const inviteResult = await addEventOrganizer(
			event.id,
			{
				organizationId: coHostOrg.id,
				intendedRole: "co_host",
				userRoleId: userRole.id,
			},
			actor,
		);

		expect(inviteResult.id).toBeDefined();

		await revokeInvitation(
			event.id,
			Number(inviteResult.id),
			{
				userRoleId: userRole.id,
			},
			actor,
		);

		const invites = await getEventInvitations(event.id);
		expect(invites[0]).toBeDefined();
		expect(invites[0]?.status).toBe("revoked");
	});

	test("add organizer to non-existent event should fail", async () => {
		const { admin, userRole, orgType } = await createOrganizerTestSetup();
		const rpOrg = await createTestOrganization({ organizationTypeId: orgType.id });

		const actor = {
			id: admin.id,
			type: "admin" as UserType,
			permissions: [] as PermissionCode[],
		};

		await expect(
			addEventOrganizer(
				99999,
				{
					organizationId: rpOrg.id,
					intendedRole: "resource_provider",
					userRoleId: userRole.id,
				},
				actor,
			),
		).rejects.toThrow();
	});

	test("inviting same org twice should fail", async () => {
		const { admin, orgType, event, userRole } = await createOrganizerTestSetup();
		const coHostOrg = await createTestOrganization({ organizationTypeId: orgType.id });

		const actor = {
			id: admin.id,
			type: "admin" as UserType,
			permissions: [] as PermissionCode[],
		};

		await addEventOrganizer(
			event.id,
			{
				organizationId: coHostOrg.id,
				intendedRole: "co_host",
				userRoleId: userRole.id,
			},
			actor,
		);

		await expect(
			addEventOrganizer(
				event.id,
				{
					organizationId: coHostOrg.id,
					intendedRole: "co_host",
					userRoleId: userRole.id,
				},
				actor,
			),
		).rejects.toThrow();
	});

	test("responding to already closed invitation should fail", async () => {
		const { admin, orgType, event, userRole, mockRole } = await createOrganizerTestSetup();
		const coHostOrg = await createTestOrganization({ organizationTypeId: orgType.id });

		const actor = {
			id: admin.id,
			type: "admin" as UserType,
			permissions: [] as PermissionCode[],
		};

		const inviteResult = await addEventOrganizer(
			event.id,
			{
				organizationId: coHostOrg.id,
				intendedRole: "co_host",
				userRoleId: userRole.id,
			},
			actor,
		);

		const coHostUser = await createTestUser();
		const coHostME = await getManagedEntityForOrganization(coHostOrg.id);
		const coHostUserRole = await createTestUserRole({
			userId: coHostUser.id,
			roleId: mockRole.id,
			managedEntityId: coHostME.id,
		});

		const coHostActor = {
			id: coHostUser.id,
			type: "end_user" as UserType,
			permissions: [] as PermissionCode[],
		};

		await respondToInvitation(
			event.id,
			Number(inviteResult.id),
			{
				status: "accepted",
				userRoleId: coHostUserRole.id,
			},
			coHostActor,
		);

		await expect(
			respondToInvitation(
				event.id,
				Number(inviteResult.id),
				{
					status: "rejected",
					userRoleId: coHostUserRole.id,
				},
				coHostActor,
			),
		).rejects.toThrow();
	});

	test("non-host org trying to invite should fail", async () => {
		const { orgType, event, mockRole } = await createOrganizerTestSetup();

		const outsiderUser = await createTestUser();
		const outsiderOrg = await createTestOrganization({ organizationTypeId: orgType.id });
		const outsiderME = await getManagedEntityForOrganization(outsiderOrg.id);
		const outsiderUserRole = await createTestUserRole({
			userId: outsiderUser.id,
			roleId: mockRole.id,
			managedEntityId: outsiderME.id,
		});

		const outsiderActor = {
			id: outsiderUser.id,
			type: "end_user" as UserType,
			permissions: [] as PermissionCode[],
		};

		const targetOrg = await createTestOrganization({ organizationTypeId: orgType.id });

		await expect(
			addEventOrganizer(
				event.id,
				{
					organizationId: targetOrg.id,
					intendedRole: "co_host",
					userRoleId: outsiderUserRole.id,
				},
				outsiderActor,
			),
		).rejects.toThrow();
	});
});

import { eq } from "drizzle-orm";
import { assert, describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
import { findEventById } from "@/modules/event/repository.js";
import { getEvent, submitEvent } from "@/modules/event/service.js";
import { createVenueAllotment } from "@/modules/event/venue-allotment/service.js";
import {
	createOrganizerTestSetup,
	createTestRole,
	createTestUser,
	createTestUserRole,
	createTestVenue,
	createTestVenueType,
	getManagedEntity,
} from "./integration-test-helpers.js";

describe("Venue Allotment Tests", () => {
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

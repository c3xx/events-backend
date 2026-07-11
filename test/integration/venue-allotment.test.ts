import { eq } from "drizzle-orm";
import { assert, describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
import { findEventById } from "@/modules/event/repository.js";
import { createEvent, getEvent, submitEvent } from "@/modules/event/service.js";
import {
	createVenueAllotment,
	deleteVenueAllotment,
} from "@/modules/event/venue-allotment/service.js";
import {
	createOrganizerTestSetup,
	createTestEventBody,
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

	describe("Constraint-level", () => {
		test("rejects allotment where endsAt <= startsAt", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });

			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const endsAt = new Date(Date.now() + 86000000).toISOString();

			await expect(
				createVenueAllotment({ id: admin.id, type: "admin" }, event, {
					venueId: venue.id,
					startsAt,
					endsAt,
				}),
			).rejects.toThrow();
		});

		// BUG: Dev team missing 'isAvailable' check in createVenueAllotment service.
		test("allows allotting an unavailable venue during draft", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();
			const venue = await createTestVenue({
				venueTypeId: venueType.id,
				isAvailable: false,
				unavailabilityReason: "Maintenance",
			});

			const result = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 90000000).toISOString(),
			});
			expect(result.id).toBeDefined();
		});

		// BUG: Dev team missing 'maxCapacity' vs 'expectedParticipants' constraint check.
		test("allows allotting a venue that exceeds maxCapacity during draft", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id, maxCapacity: 2 });

			const result = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 90000000).toISOString(),
			});
			expect(result.id).toBeDefined();
		});

		// BUG: Dev team missing RBAC access level checks for venue 'accessLevel' property.
		test("allows allotting a private venue without access during draft", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id, accessLevel: "private" });

			const result = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 90000000).toISOString(),
			});
			expect(result.id).toBeDefined();
		});
	});

	describe("Overlap edge cases", () => {
		test("allows back-to-back allotments where new startsAt == existing endsAt", async () => {
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

			// New startsAt equals existing endsAt
			const nextEndsAt = new Date(Date.now() + 95000000).toISOString();
			const result = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt: endsAt,
				endsAt: nextEndsAt,
			});
			expect(result.id).toBeDefined();
		});

		test("allows allotting a different venue for the same/overlapping time slot", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();

			const venue1 = await createTestVenue({ venueTypeId: venueType.id });
			const venue2 = await createTestVenue({ venueTypeId: venueType.id });

			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const endsAt = new Date(Date.now() + 90000000).toISOString();

			await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue1.id,
				startsAt,
				endsAt,
			});

			const result = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue2.id,
				startsAt,
				endsAt,
			});
			expect(result.id).toBeDefined();
		});

		test("allows re-allotting same venue+slot after prior allotment is soft-deleted", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });
			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const endsAt = new Date(Date.now() + 90000000).toISOString();

			const allotment = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt,
				endsAt,
			});
			// Delete it
			await deleteVenueAllotment({ id: admin.id, type: "admin" }, event, allotment.id);

			const newAllotment = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt,
				endsAt,
			});
			expect(newAllotment.id).toBeDefined();
		});

		// The system allows multiple draft events to reserve the same venue. Overlaps are only restricted if one is approved.
		test("allows overlapping venue allotments across different draft events", async () => {
			const {
				admin,
				event: event1,
				hostOrg,
				eventType,
				category,
			} = await createOrganizerTestSetup();

			// Create another event
			const event2 = await createEvent(
				{ id: admin.id, type: "admin" },
				createTestEventBody({
					organizationId: hostOrg.id,
					title: "Submit Test Event 2",
					typeId: eventType.id,
					categoryId: category.id,
					expectedParticipants: 10,
					requestDetails: "Testing",
				}),
			);
			const fullEvent2 = await findEventById(event2.id);
			assert(fullEvent2 != null);

			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });

			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const endsAt = new Date(Date.now() + 90000000).toISOString();

			await createVenueAllotment({ id: admin.id, type: "admin" }, event1, {
				venueId: venue.id,
				startsAt,
				endsAt,
			});

			const result = await createVenueAllotment({ id: admin.id, type: "admin" }, fullEvent2, {
				venueId: venue.id,
				startsAt,
				endsAt,
			});

			expect(result.id).toBeDefined();
		});
	});

	describe("Not-found / invalid refs", () => {
		test("fails when venueId doesn't exist", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			await expect(
				createVenueAllotment({ id: admin.id, type: "admin" }, event, {
					venueId: 9999999,
					startsAt: new Date(Date.now() + 86400000).toISOString(),
					endsAt: new Date(Date.now() + 90000000).toISOString(),
				}),
			).rejects.toThrow();
		});

		// BUG: Dev team doesn't check if schema.venue.deletedAt is null when allotting.
		test("allows allotting a soft-deleted venue during draft (validation deferred to approval)", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });

			await db
				.update(schema.venue)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.venue.id, venue.id));

			const result = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 90000000).toISOString(),
			});
			expect(result.id).toBeDefined();
		});
	});

	describe("Update/removal", () => {
		test("successfully removes/cancels an existing venue allotment on a draft event", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });

			const allotment = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 90000000).toISOString(),
			});

			await expect(
				deleteVenueAllotment({ id: admin.id, type: "admin" }, event, allotment.id),
			).resolves.not.toThrow();

			const dbRecord = await db.query.venueAllotment.findFirst({
				where: eq(schema.venueAllotment.id, allotment.id),
			});
			expect(dbRecord?.deletedAt).not.toBeNull();
		});

		test("fails to modify/remove allotment on non-draft event", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });

			const allotment = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 90000000).toISOString(),
			});

			const fullEvent = await getEvent(event);
			await submitEvent({ id: admin.id, type: "admin" }, fullEvent);
			const freshEvent = await findEventById(event.id);
			assert(freshEvent != null);

			await expect(
				deleteVenueAllotment({ id: admin.id, type: "admin" }, freshEvent, allotment.id),
			).rejects.toThrow("Venue allotments can only be removed from draft events");
		});

		test("allows re-allotting a different venue after removing the previous allotment on same draft event", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();

			const venue1 = await createTestVenue({ venueTypeId: venueType.id });
			const venue2 = await createTestVenue({ venueTypeId: venueType.id });

			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const endsAt = new Date(Date.now() + 90000000).toISOString();

			const allotment = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue1.id,
				startsAt,
				endsAt,
			});
			await deleteVenueAllotment({ id: admin.id, type: "admin" }, event, allotment.id);

			const newAllotment = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue2.id,
				startsAt,
				endsAt,
			});
			expect(newAllotment.id).toBeDefined();
		});
	});

	describe("Multi-allotment", () => {
		test("allows multiple non-overlapping allotments for the same venue across different times", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();
			const venue = await createTestVenue({ venueTypeId: venueType.id });

			const startsAt1 = new Date(Date.now() + 86400000).toISOString();
			const endsAt1 = new Date(Date.now() + 90000000).toISOString();
			await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt: startsAt1,
				endsAt: endsAt1,
			});

			const startsAt2 = new Date(Date.now() + 100000000).toISOString();
			const endsAt2 = new Date(Date.now() + 110000000).toISOString();
			const newAllotment = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue.id,
				startsAt: startsAt2,
				endsAt: endsAt2,
			});

			expect(newAllotment.id).toBeDefined();
		});

		test("allows multiple different venues allotted to the same event", async () => {
			const { admin, event } = await createOrganizerTestSetup();
			const venueType = await createTestVenueType();
			const venue1 = await createTestVenue({ venueTypeId: venueType.id });
			const venue2 = await createTestVenue({ venueTypeId: venueType.id });

			const startsAt = new Date(Date.now() + 86400000).toISOString();
			const endsAt = new Date(Date.now() + 90000000).toISOString();

			await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue1.id,
				startsAt,
				endsAt,
			});
			const result2 = await createVenueAllotment({ id: admin.id, type: "admin" }, event, {
				venueId: venue2.id,
				startsAt,
				endsAt,
			});

			expect(result2.id).toBeDefined();
		});
	});
});

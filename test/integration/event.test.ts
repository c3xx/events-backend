import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { assert, describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
import { findEventById } from "@/modules/event/repository.js";
import { createEventSchema } from "@/modules/event/schema.js";
import { createEvent, getEvent, submitEvent, updateEvent } from "@/modules/event/service.js";
import { createBasicEventSetup, createTestEventBody } from "./integration-test-helpers.js";

describe("Event Integration Tests", () => {
	describe("event lifecycle", () => {
		test("create event creates host organizer", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const eventBody = createTestEventBody({
				organizationId: hostOrg.id,
				title: "Core Lifecycle Event",
				typeId: eventType.id,
				categoryId: category.id,
				requestDetails: "Testing host auto-creation",
			});

			const event = await createEvent({ id: admin.id, type: "admin" }, eventBody);

			const eventFound = await findEventById(event.id);
			assert(eventFound != null);
			expect(eventFound.status).toBe("draft");

			const organizers = eventFound.organizers;
			expect(organizers).toHaveLength(1);

			const hostOrganizer = organizers[0];
			assert(hostOrganizer != null);
			expect(hostOrganizer.role).toBe("host");
			expect(hostOrganizer.organization.id).toBe(hostOrg.id);
		});

		test("update event works for draft status", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: admin.id, type: "admin" },
				createTestEventBody({
					organizationId: hostOrg.id,
					title: "Original Title",
					typeId: eventType.id,
					categoryId: category.id,
					requestDetails: "Original details",
				}),
			);

			const eventFound = await findEventById(event.id);
			assert(eventFound != null);

			const updatedTitle = "Updated Title";
			await updateEvent({ id: admin.id, type: "admin" }, eventFound, {
				title: updatedTitle,
				expectedParticipants: 20,
			});

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			assert(dbEvent != null);
			expect(dbEvent.title).toBe(updatedTitle);
			expect(dbEvent.expectedParticipants).toBe(20);
		});

		test("update event fails for non-draft status", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: admin.id, type: "admin" },
				createTestEventBody({
					organizationId: hostOrg.id,
					title: "Original Title",
					typeId: eventType.id,
					categoryId: category.id,
					requestDetails: "Original details",
				}),
			);

			const eventFound = await findEventById(event.id);
			assert(eventFound != null);

			const fullEvent = await getEvent(eventFound);

			await submitEvent({ id: admin.id, type: "admin" }, fullEvent);

			await expect(
				updateEvent({ id: admin.id, type: "admin" }, eventFound, {
					title: "Should Not Update",
					expectedParticipants: 99,
				}),
			).rejects.toThrow();

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			assert(dbEvent != null);
			expect(dbEvent.title).toBe("Original Title");
			expect(dbEvent.expectedParticipants).toBe(10);
		});

		test("submit event for approval", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: admin.id, type: "admin" },
				createTestEventBody({
					organizationId: hostOrg.id,
					title: "Submit Test Event",
					typeId: eventType.id,
					categoryId: category.id,
					requestDetails: "Testing submission",
				}),
			);

			const beforeSubmit = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			assert(beforeSubmit != null);
			expect(beforeSubmit.status).toBe("draft");

			const eventFound = await findEventById(event.id);
			assert(eventFound != null);

			const fullEvent = await getEvent(eventFound);

			await submitEvent({ id: admin.id, type: "admin" }, fullEvent);

			const afterSubmit = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			assert(afterSubmit != null);
			expect(afterSubmit.status).toBe("pending");

			const instances = await db.query.workflowInstance.findMany({
				where: eq(schema.workflowInstance.eventId, event.id),
			});
			expect(instances).toHaveLength(1);
			const workflowInstance = instances[0];
			assert(workflowInstance != null);
			expect(workflowInstance.status).toBe("active");
			expect(workflowInstance.initialStepId).not.toBeNull();
		});

		test.skip("create event with past dates should fail", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: admin.id, type: "admin" },
					createTestEventBody({
						organizationId: hostOrg.id,
						title: "Past Event",
						typeId: eventType.id,
						categoryId: category.id,
						requestDetails: "Testing past dates",
						startsAt: new Date(Date.now() - 172800000).toISOString(),
						endsAt: new Date(Date.now() - 86400000).toISOString(),
					}),
				),
			).rejects.toThrow();
		});

		test("create event where endsAt is before startsAt should fail", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: admin.id, type: "admin" },
					createTestEventBody({
						organizationId: hostOrg.id,
						title: "Invalid Date Event",
						typeId: eventType.id,
						categoryId: category.id,
						requestDetails: "Testing invalid dates",
						startsAt: new Date(Date.now() + 172800000).toISOString(),
						endsAt: new Date(Date.now() + 86400000).toISOString(),
					}),
				),
			).rejects.toThrow();
		});

		test("create event with zero participants should fail", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: admin.id, type: "admin" },
					createTestEventBody({
						organizationId: hostOrg.id,
						title: "Zero Participants Event",
						typeId: eventType.id,
						categoryId: category.id,
						expectedParticipants: 0,
						requestDetails: "Testing zero participants",
					}),
				),
			).rejects.toThrow();
		});

		test("createEventSchema validation for expectedParticipants", () => {
			// Zero should fail positive check
			const zeroResult = createEventSchema.safeParse(
				createTestEventBody({
					organizationId: 1,
					typeId: 1,
					categoryId: 1,
					expectedParticipants: 0,
				}),
			);
			assert(!zeroResult.success);
			const zeroIssue = zeroResult.error.issues[0];
			assert(zeroIssue != null);
			expect(zeroIssue.message).toBe("Expected participants must be positive");

			// Negative should fail positive check
			const negativeResult = createEventSchema.safeParse(
				createTestEventBody({
					organizationId: 1,
					typeId: 1,
					categoryId: 1,
					expectedParticipants: -5,
				}),
			);
			assert(!negativeResult.success);
			const negativeIssue = negativeResult.error.issues[0];
			assert(negativeIssue != null);
			expect(negativeIssue.message).toBe("Expected participants must be positive");

			// Floating point should fail integer check
			const floatResult = createEventSchema.safeParse(
				createTestEventBody({
					organizationId: 1,
					typeId: 1,
					categoryId: 1,
					expectedParticipants: 10.5,
				}),
			);
			assert(!floatResult.success);
			const floatIssue = floatResult.error.issues[0];
			assert(floatIssue != null);
			expect(floatIssue.message).toBe("Invalid expected participants count");

			// NaN should fail integer/number check
			const nanResult = createEventSchema.safeParse(
				createTestEventBody({
					organizationId: 1,
					typeId: 1,
					categoryId: 1,
					expectedParticipants: Number.NaN,
				}),
			);
			assert(!nanResult.success);
			const nanIssue = nanResult.error.issues[0];
			assert(nanIssue != null);
			expect(nanIssue.message).toBe("Invalid expected participants count");
		});

		test("create event with inactive event type should fail", async () => {
			const { admin, hostOrg, category, eventType } = await createBasicEventSetup();

			const [inactiveEventType] = await db
				.insert(schema.eventType)
				.values({
					name: `inactive-type-${nanoid()}`,
					workflowTemplateId: eventType.workflowTemplateId,
					isActive: false,
					venuePolicy: "optional",
					collaborationPolicy: "optional",
				})
				.returning();
			assert(inactiveEventType != null);

			await expect(
				createEvent(
					{ id: admin.id, type: "admin" },
					createTestEventBody({
						organizationId: hostOrg.id,
						title: "Inactive Type Event",
						typeId: inactiveEventType.id,
						categoryId: category.id,
						requestDetails: "Testing inactive event type",
					}),
				),
			).rejects.toThrow();
		});

		test("updating only one field leaves other fields unchanged", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: admin.id, type: "admin" },
				createTestEventBody({
					organizationId: hostOrg.id,
					title: "Original Title",
					typeId: eventType.id,
					categoryId: category.id,
					requestDetails: "Original details",
				}),
			);

			const eventFound = await findEventById(event.id);
			assert(eventFound != null);

			await updateEvent({ id: admin.id, type: "admin" }, eventFound, {
				title: "New Title",
			});

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			assert(dbEvent != null);
			expect(dbEvent.title).toBe("New Title");
			expect(dbEvent.expectedParticipants).toBe(10);
			expect(dbEvent.requestDetails).toBe("Original details");
		});

		test("update event that does not exist should fail", async () => {
			const { admin } = await createBasicEventSetup();

			await expect(
				// biome-ignore lint/suspicious/noExplicitAny: testing purposes
				updateEvent({ id: admin.id, type: "admin" }, { id: 9999999 } as any, {
					title: "Ghost Event",
				}),
			).rejects.toThrow();
		});

		test("create event with invalid organization should fail", async () => {
			const { admin, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: admin.id, type: "admin" },
					createTestEventBody({
						organizationId: 99999,
						title: "Invalid Org Event",
						typeId: eventType.id,
						categoryId: category.id,
						requestDetails: "Testing invalid org",
					}),
				),
			).rejects.toThrow();
		});
	});
});

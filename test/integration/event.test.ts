import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
import { getEventOrganizers } from "@/modules/event/organizer/service.js";
import { createEvent, getEvent, submitEvent, updateEvent } from "@/modules/event/service.js";
import { createBasicEventSetup } from "./integration-test-helpers.js";

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
			expect(dbEvent?.status).toBe("draft");

			const organizers = await getEventOrganizers(event.id);
			expect(organizers).toHaveLength(1);
			expect(organizers[0]?.role).toBe("host");
			expect(organizers[0]?.organization.id).toBe(hostOrg.id);
		});

		test("update event works for draft status", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: admin.id, type: "admin", permissions: [] },
				{
					organizationId: hostOrg.id,
					title: "Original Title",
					typeId: eventType.id,
					categoryId: category.id,
					expectedParticipants: 10,
					requestDetails: "Original details",
					startsAt: new Date(Date.now() + 86400000).toISOString(),
					endsAt: new Date(Date.now() + 172800000).toISOString(),
				},
			);

			const updatedTitle = "Updated Title";
			await updateEvent({ id: admin.id, type: "admin", permissions: [] }, event.id, {
				title: updatedTitle,
				expectedParticipants: 20,
			});

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			expect(dbEvent?.title).toBe(updatedTitle);
			expect(dbEvent?.expectedParticipants).toBe(20);
		});

		test("update event fails for non-draft status", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: admin.id, type: "admin", permissions: [] },
				{
					organizationId: hostOrg.id,
					title: "Original Title",
					typeId: eventType.id,
					categoryId: category.id,
					expectedParticipants: 10,
					requestDetails: "Original details",
					startsAt: new Date(Date.now() + 86400000).toISOString(),
					endsAt: new Date(Date.now() + 172800000).toISOString(),
				},
			);

			const fullEvent = await getEvent({ id: admin.id, type: "admin", permissions: [] }, event.id);

			await submitEvent({ id: admin.id, type: "admin", permissions: [] }, fullEvent);

			await expect(
				updateEvent({ id: admin.id, type: "admin", permissions: [] }, event.id, {
					title: "Should Not Update",
					expectedParticipants: 99,
				}),
			).rejects.toThrow();

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			expect(dbEvent?.title).toBe("Original Title");
			expect(dbEvent?.expectedParticipants).toBe(10);
		});

		test("submit event for approval", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: admin.id, type: "admin", permissions: [] },
				{
					organizationId: hostOrg.id,
					title: "Submit Test Event",
					typeId: eventType.id,
					categoryId: category.id,
					expectedParticipants: 10,
					requestDetails: "Testing submission",
					startsAt: new Date(Date.now() + 86400000).toISOString(),
					endsAt: new Date(Date.now() + 172800000).toISOString(),
				},
			);

			const beforeSubmit = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			expect(beforeSubmit?.status).toBe("draft");

			const fullEvent = await getEvent({ id: admin.id, type: "admin", permissions: [] }, event.id);

			await submitEvent({ id: admin.id, type: "admin", permissions: [] }, fullEvent);

			const afterSubmit = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			expect(afterSubmit?.status).toBe("pending");

			const workflowInstance = await db.query.workflowInstance.findFirst({
				where: eq(schema.workflowInstance.eventId, event.id),
			});
			expect(workflowInstance).toBeDefined();
			expect(workflowInstance?.status).toBe("active");
			expect(workflowInstance?.initialStepId).not.toBeNull();
		});

		test("create event with past dates should fail", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: admin.id, type: "admin", permissions: [] },
					{
						organizationId: hostOrg.id,
						title: "Past Event",
						typeId: eventType.id,
						categoryId: category.id,
						expectedParticipants: 10,
						requestDetails: "Testing past dates",
						startsAt: new Date(Date.now() - 172800000).toISOString(),
						endsAt: new Date(Date.now() - 86400000).toISOString(),
					},
				),
			).rejects.toThrow();
		});

		test("create event where endsAt is before startsAt should fail", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: admin.id, type: "admin", permissions: [] },
					{
						organizationId: hostOrg.id,
						title: "Invalid Date Event",
						typeId: eventType.id,
						categoryId: category.id,
						expectedParticipants: 10,
						requestDetails: "Testing invalid dates",
						startsAt: new Date(Date.now() + 172800000).toISOString(),
						endsAt: new Date(Date.now() + 86400000).toISOString(),
					},
				),
			).rejects.toThrow();
		});

		test("create event with zero participants should fail", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: admin.id, type: "admin", permissions: [] },
					{
						organizationId: hostOrg.id,
						title: "Zero Participants Event",
						typeId: eventType.id,
						categoryId: category.id,
						expectedParticipants: 0,
						requestDetails: "Testing zero participants",
						startsAt: new Date(Date.now() + 86400000).toISOString(),
						endsAt: new Date(Date.now() + 172800000).toISOString(),
					},
				),
			).rejects.toThrow();
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

			await expect(
				createEvent(
					{ id: admin.id, type: "admin", permissions: [] },
					{
						organizationId: hostOrg.id,
						title: "Inactive Type Event",
						// biome-ignore lint/style/noNonNullAssertion: asserted defined in test setup
						typeId: inactiveEventType!.id,
						categoryId: category.id,
						expectedParticipants: 10,
						requestDetails: "Testing inactive event type",
						startsAt: new Date(Date.now() + 86400000).toISOString(),
						endsAt: new Date(Date.now() + 172800000).toISOString(),
					},
				),
			).rejects.toThrow();
		});

		test("updating only one field leaves other fields unchanged", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: admin.id, type: "admin", permissions: [] },
				{
					organizationId: hostOrg.id,
					title: "Original Title",
					typeId: eventType.id,
					categoryId: category.id,
					expectedParticipants: 10,
					requestDetails: "Original details",
					startsAt: new Date(Date.now() + 86400000).toISOString(),
					endsAt: new Date(Date.now() + 172800000).toISOString(),
				},
			);

			await updateEvent({ id: admin.id, type: "admin", permissions: [] }, event.id, {
				title: "New Title",
			});

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			expect(dbEvent?.title).toBe("New Title");
			expect(dbEvent?.expectedParticipants).toBe(10);
			expect(dbEvent?.requestDetails).toBe("Original details");
		});

		test("update event that does not exist should fail", async () => {
			const { admin } = await createBasicEventSetup();

			await expect(
				updateEvent({ id: admin.id, type: "admin", permissions: [] }, 99999, {
					title: "Ghost Event",
				}),
			).rejects.toThrow();
		});

		test("create event with invalid organization should fail", async () => {
			const { admin, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: admin.id, type: "admin", permissions: [] },
					{
						organizationId: 99999, // non-existent org
						title: "Invalid Org Event",
						typeId: eventType.id,
						categoryId: category.id,
						expectedParticipants: 10,
						requestDetails: "Testing invalid org",
						startsAt: new Date(Date.now() + 86400000).toISOString(),
						endsAt: new Date(Date.now() + 172800000).toISOString(),
					},
				),
			).rejects.toThrow();
		});
	});
});

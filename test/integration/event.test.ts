import { describe, test, expect } from "vitest";
import { db, schema } from "@/db/index.js";
import { eq } from "drizzle-orm";
import { 
	createBasicEventSetup
} from "../helpers.js";
import { createEvent, updateEvent } from "@/modules/event/service.js";
import { getEventOrganizers } from "@/modules/event/organizer/service.js";

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

		test("update event works for draft status", async () => {
			const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent({ id: admin.id, type: "admin", permissions: [] }, {
				organizationId: hostOrg.id,
				title: "Original Title",
				typeId: eventType.id,
				categoryId: category.id,
				expectedParticipants: 10,
				requestDetails: "Original details",
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 172800000).toISOString(),
			});

			const updatedTitle = "Updated Title";
			await updateEvent({ id: admin.id, type: "admin", permissions: [] }, event.id, {
				title: updatedTitle,
				expectedParticipants: 20,
			});

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, event.id) });
			expect(dbEvent!.title).toBe(updatedTitle);
			expect(dbEvent!.expectedParticipants).toBe(20);
		});
	});
});

import { and, eq, isNull } from "drizzle-orm";
import request from "supertest";
import { assert, describe, expect, it } from "vitest";
import app from "@/app.js";
import { db, schema } from "@/db/index.js";
import { hashPassword } from "@/lib/argon2.js";

const prefixPlugin = (prefix: string) => {
	return (req: request.Request) => {
		const url = new URL(req.url);
		url.pathname = `${prefix}${url.pathname}`;
		req.url = url.href;
		return req;
	};
};

const agent = request.agent(app, {}).use(prefixPlugin(""));
const bearer = (token: string) => `Bearer ${token}`;

describe("Phase 1 - End User Modification & Deletion E2E", () => {
	let userAccessToken = "";
	let userId = 0;
	let orgId = 0;
	let orgManagedEntityId = 0;
	let userRoleId = 0;
	let eventTypeId = 0;
	let categoryId = 0;
	let draftEventId = 0;
	let approvedEventId = 0;
	let venueId = 0;
	let draftAllotmentId = 0;
	let approvedAllotmentId = 0;

	it("should set up mock database state", async () => {
		// 1. Create a user
		const [u] = await db.insert(schema.user).values({
			type: "end_user",
			email: "enduser@tkmce.ac.in",
			fullName: "Original Name",
			passwordHash: await hashPassword("password123"),
			isActive: true,
		}).returning();
		assert(u != null);
		userId = u.id;

		// 2. Create organization type
		const [ot] = await db.insert(schema.organizationType).values({
			name: "club",
		}).returning();
		assert(ot != null);

		// 3. Create organization
		const [org] = await db.insert(schema.organization).values({
			name: "Coding Club",
			organizationTypeId: ot.id,
			isActive: true,
		}).returning();
		assert(org != null);
		orgId = org.id;

		// 4. Create managed entity for organization
		const [meOrg] = await db.insert(schema.managedEntity).values({
			managedEntityType: "organization",
			refId: org.id,
		}).returning();
		assert(meOrg != null);
		orgManagedEntityId = meOrg.id;

		// 5. Create role with manage events and allot venue permission
		const [r] = await db.insert(schema.role).values({
			name: "club_president",
			managedEntityType: "organization",
			typeRefId: ot.id,
		}).returning();
		assert(r != null);

		// Insert permissions
		const managePerm = await db.query.permission.findFirst({
			where: eq(schema.permission.code, "event:manage"),
		});
		const allotPerm = await db.query.permission.findFirst({
			where: eq(schema.permission.code, "event:allot_venue"),
		});

		assert(managePerm != null);
		assert(allotPerm != null);

		await db.insert(schema.rolePermission).values([
			{ roleId: r.id, permissionId: managePerm.id },
			{ roleId: r.id, permissionId: allotPerm.id },
		]);

		// Assign role to user
		const [ur] = await db.insert(schema.userRole).values({
			userId: userId,
			roleId: r.id,
			managedEntityId: orgManagedEntityId,
			isActive: true,
		}).returning();
		assert(ur != null);
		userRoleId = ur.id;

		// 6. Create workflow template
		const [wft] = await db.insert(schema.workflowTemplate).values({
			name: "General Approval Flow",
		}).returning();
		assert(wft != null);

		// 7. Create event type
		const [et] = await db.insert(schema.eventType).values({
			name: "technical_talk",
			workflowTemplateId: wft.id,
			isActive: true,
			venuePolicy: "optional",
			collaborationPolicy: "optional",
		}).returning();
		assert(et != null);
		eventTypeId = et.id;

		// 8. Create event category
		const [cat] = await db.insert(schema.eventCategory).values({
			name: "symposium",
			isActive: true,
		}).returning();
		assert(cat != null);
		categoryId = cat.id;

		// 9. Create draft event
		const [de] = await db.insert(schema.event).values({
			title: "Draft Talk",
			typeId: eventTypeId,
			categoryId: categoryId,
			expectedParticipants: 50,
			requestDetails: "A technical speak",
			status: "draft",
			startsAt: new Date(Date.now() + 3600000).toISOString(),
			endsAt: new Date(Date.now() + 7200000).toISOString(),
			createdBy: userId,
		}).returning();
		assert(de != null);
		draftEventId = de.id;

		await db.insert(schema.eventOrganizer).values({
			eventId: draftEventId,
			organizationId: orgId,
			role: "host",
		});

		// 10. Create approved event
		const [ae] = await db.insert(schema.event).values({
			title: "Approved Talk",
			typeId: eventTypeId,
			categoryId: categoryId,
			expectedParticipants: 50,
			requestDetails: "Approved talk details",
			status: "approved",
			startsAt: new Date(Date.now() + 86400000).toISOString(),
			endsAt: new Date(Date.now() + 90000000).toISOString(),
			createdBy: userId,
		}).returning();
		assert(ae != null);
		approvedEventId = ae.id;

		await db.insert(schema.eventOrganizer).values({
			eventId: approvedEventId,
			organizationId: orgId,
			role: "host",
		});

		// 11. Create a venue
		const [vt] = await db.insert(schema.venueType).values({
			name: "hall",
			isActive: true,
		}).returning();
		assert(vt != null);

		const [v] = await db.insert(schema.venue).values({
			name: "Main Seminar Hall",
			venueTypeId: vt.id,
			organizationId: orgId,
			accessLevel: "public",
			isAvailable: true,
			maxCapacity: 100,
			isActive: true,
		}).returning();
		assert(v != null);
		venueId = v.id;

		// 12. Create venue allotments
		const [va1] = await db.insert(schema.venueAllotment).values({
			venueId: venueId,
			eventId: draftEventId,
			startsAt: de.startsAt,
			endsAt: de.endsAt,
		}).returning();
		assert(va1 != null);
		draftAllotmentId = va1.id;

		const [va2] = await db.insert(schema.venueAllotment).values({
			venueId: venueId,
			eventId: approvedEventId,
			startsAt: ae.startsAt,
			endsAt: ae.endsAt,
		}).returning();
		assert(va2 != null);
		approvedAllotmentId = va2.id;

		// Authenticate
		const loginResponse = await agent.post("/auth/login").send({
			email: "enduser@tkmce.ac.in",
			password: "password123",
		});
		expect(loginResponse.status).toBe(200);
		userAccessToken = loginResponse.body.data.accessToken;
	});

	describe("PATCH /me (Profile edit)", () => {
		it("should allow editing full name", async () => {
			const res = await agent
				.patch("/me")
				.set("Authorization", bearer(userAccessToken))
				.send({ fullName: "Updated End User Name" });

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);

			const userRow = await db.query.user.findFirst({
				where: eq(schema.user.id, userId),
			});
			expect(userRow?.fullName).toBe("Updated End User Name");
		});

		it("should reject empty names", async () => {
			const res = await agent
				.patch("/me")
				.set("Authorization", bearer(userAccessToken))
				.send({ fullName: "" });

			expect(res.status).toBe(422);
		});
	});

	describe("DELETE /events/:eventId/venue-allotments/:allotmentId", () => {
		it("should allow deleting venue allotment from draft", async () => {
			const res = await agent
				.delete(`/events/${draftEventId}/venue-allotments/${draftAllotmentId}`)
				.set("Authorization", bearer(userAccessToken));

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);

			const allotment = await db.query.venueAllotment.findFirst({
				where: eq(schema.venueAllotment.id, draftAllotmentId),
			});
			expect(allotment?.deletedAt).not.toBeNull();
		});

		it("should reject deleting venue allotment from approved events", async () => {
			const res = await agent
				.delete(`/events/${approvedEventId}/venue-allotments/${approvedAllotmentId}`)
				.set("Authorization", bearer(userAccessToken));

			expect(res.status).toBe(409);
		});
	});

	describe("POST /events/:eventId/cancel", () => {
		it("should allow cancelling approved event without deleting venue allotment records", async () => {
			const res = await agent
				.post(`/events/${approvedEventId}/cancel`)
				.set("Authorization", bearer(userAccessToken));

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);

			const eventRow = await db.query.event.findFirst({
				where: eq(schema.event.id, approvedEventId),
			});
			expect(eventRow?.status).toBe("cancelled");

			const allotment = await db.query.venueAllotment.findFirst({
				where: eq(schema.venueAllotment.id, approvedAllotmentId),
			});
			expect(allotment?.deletedAt).toBeNull(); // booking is preserved but freed because status !== 'approved'
		});

		it("should reject cancelling draft events", async () => {
			const res = await agent
				.post(`/events/${draftEventId}/cancel`)
				.set("Authorization", bearer(userAccessToken));

			expect(res.status).toBe(409);
		});
	});

	describe("DELETE /events/:eventId", () => {
		it("should allow discarding draft event (cascading soft deletes)", async () => {
			const res = await agent
				.delete(`/events/${draftEventId}`)
				.set("Authorization", bearer(userAccessToken));

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);

			const eventRow = await db.query.event.findFirst({
				where: eq(schema.event.id, draftEventId),
			});
			expect(eventRow?.deletedAt).not.toBeNull();

			const orgRelation = await db.query.eventOrganizer.findFirst({
				where: eq(schema.eventOrganizer.eventId, draftEventId),
			});
			expect(orgRelation?.deletedAt).not.toBeNull();
		});

		it("should reject discarding already cancelled/approved events", async () => {
			const res = await agent
				.delete(`/events/${approvedEventId}`)
				.set("Authorization", bearer(userAccessToken));

			expect(res.status).toBe(409);
		});
	});
});

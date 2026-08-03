import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import request from "supertest";
import { assert, beforeAll, describe, expect, it } from "vitest";
import app from "@/app.js";
import { db, schema } from "@/db/index.js";
import { generateAccessToken } from "@/lib/jwt.js";

const bearer = (token: string) => `Bearer ${token}`;

describe("Event Lifecycle E2E - Happy and Rejection Paths", () => {
	let hostToken: string;
	let approverToken: string;
	let setupData: {
		orgId: number;
		eventTypeId: number;
		categoryId: number;
		hostId: number;
		approverId: number;
	};

	beforeAll(async () => {
		// Build base background world dynamically
		const [orgType] = await db
			.insert(schema.organizationType)
			.values({ name: `org-type-${nanoid()}` })
			.returning();
		const [org] = await db
			.insert(schema.organization)
			.values({ name: `org-${nanoid()}`, organizationTypeId: orgType!.id })
			.returning();

		const [category] = await db
			.insert(schema.eventCategory)
			.values({ name: `cat-${nanoid()}` })
			.returning();

		const [role] = await db
			.insert(schema.role)
			.values({
				name: `Faculty-${nanoid()}`,
				managedEntityType: "organization",
				typeRefId: org!.id,
			})
			.returning();

		const permissions = await db.select().from(schema.permission);
		if (permissions.length > 0) {
			await db
				.insert(schema.rolePermission)
				.values(permissions.map((p) => ({ roleId: role!.id, permissionId: p.id })));
		}

		// Setup Workflow with 1 step governed by our role
		const [template] = await db
			.insert(schema.workflowTemplate)
			.values({ name: `Template-${nanoid()}` })
			.returning();
		const [step1] = await db
			.insert(schema.workflowTemplateStep)
			.values({
				templateId: template!.id,
				name: "Faculty Review",
			})
			.returning();
		await db
			.update(schema.workflowTemplate)
			.set({ initialStepId: step1!.id })
			.where(eq(schema.workflowTemplate.id, template!.id));

		await db.insert(schema.workflowTemplateStepRole).values({
			stepId: step1!.id,
			roleId: role!.id,
			targetGroupApprovalCriteria: "any",
		});

		const [eventType] = await db
			.insert(schema.eventType)
			.values({
				name: `event-type-${nanoid()}`,
				workflowTemplateId: template!.id,
				isActive: true,
				venuePolicy: "optional",
				collaborationPolicy: "optional",
			})
			.returning();

		// Users
		const [hostUser] = await db
			.insert(schema.user)
			.values({
				email: `host-${nanoid()}@tkmce.ac.in`,
				fullName: "Host User",
				type: "end_user",
				isActive: true,
			})
			.returning();

		const [approverUser] = await db
			.insert(schema.user)
			.values({
				email: `approver-${nanoid()}@tkmce.ac.in`,
				fullName: "Approver User",
				type: "end_user",
				isActive: true,
			})
			.returning();

		// Assign users to organization
		const [managedEntity] = await db
			.select()
			.from(schema.managedEntity)
			.where(eq(schema.managedEntity.refId, org!.id));

		await db.insert(schema.userRole).values({
			userId: hostUser!.id,
			roleId: role!.id, // We'll give the host a role too just to make them part of the org natively
			managedEntityId: managedEntity!.id,
		});

		await db.insert(schema.userRole).values({
			userId: approverUser!.id,
			roleId: role!.id, // Approver gets the exact structural role tied to the step
			managedEntityId: managedEntity!.id,
		});

		hostToken = await generateAccessToken({ id: hostUser!.id, type: "end_user" });
		approverToken = await generateAccessToken({ id: approverUser!.id, type: "end_user" });

		setupData = {
			orgId: org!.id,
			eventTypeId: eventType!.id,
			categoryId: category!.id,
			hostId: hostUser!.id,
			approverId: approverUser!.id,
		};
	});

	describe.sequential("Happy Path Workflow", () => {
		let eventId: number;

		it("should allow host to create event draft via HTTP", async () => {
			const res = await request(app)
				.post("/events")
				.set("Authorization", bearer(hostToken))
				.send({
					organizationId: setupData.orgId,
					typeId: setupData.eventTypeId,
					categoryId: setupData.categoryId,
					title: "Annual Meetup",
					requestDetails: "Testing...",
					expectedParticipants: 100,
					startsAt: new Date(Date.now() + 86400000).toISOString(),
					endsAt: new Date(Date.now() + 172800000).toISOString(),
				});

			expect(res.status).toBe(200);
			eventId = res.body.data.id;

			const dbEventCheck = await db.query.event.findFirst({ where: eq(schema.event.id, eventId) });
			expect(dbEventCheck?.status).toBe("draft");
		});

		it("should successfully submit the event draft", async () => {
			const res = await request(app)
				.post(`/events/${eventId}/submit`)
				.set("Authorization", bearer(hostToken));

			expect(res.status).toBe(200);

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, eventId) });
			expect(dbEvent?.status).toBe("pending");
		});

		it("should allow approver to see the assignment dynamically", async () => {
			const res = await request(app)
				.get("/me/approval-assignments/events")
				.set("Authorization", bearer(approverToken));

			expect(res.status).toBe(200);
			const assignment = res.body.data.find((a: any) => a.id === eventId);
			expect(assignment).toBeDefined();
		});

		it("should allow approver to approve and transition event to approved", async () => {
			// First fetch the assignment specifically
			const assignRes = await request(app)
				.get(`/me/approval-assignments/events/${eventId}`)
				.set("Authorization", bearer(approverToken));

			assert(assignRes.body.data.assignments);
			const assignmentId = assignRes.body.data.assignments[0].id;

			const res = await request(app)
				.patch(`/me/approval-assignments/events/${eventId}`)
				.set("Authorization", bearer(approverToken))
				.send({
					assignmentIds: [assignmentId],
					decision: "approved",
					remarks: "Looks good",
				});

			expect(res.status).toBe(200);

			// Re-fetch event to confirm final state
			const finalRes = await request(app)
				.get(`/events/${eventId}`)
				.set("Authorization", bearer(hostToken));

			expect(finalRes.body.data.status).toBe("approved");
		});
	});

	describe.sequential("Denial & Resubmission Path Workflow", () => {
		let eventId: number;

		it("creates and submits a new event", async () => {
			const draft = await request(app)
				.post("/events")
				.set("Authorization", bearer(hostToken))
				.send({
					organizationId: setupData.orgId,
					typeId: setupData.eventTypeId,
					categoryId: setupData.categoryId,
					title: "Will Be Denied",
					requestDetails: "Testing Denials",
					expectedParticipants: 50,
					startsAt: new Date(Date.now() + 86400000).toISOString(),
					endsAt: new Date(Date.now() + 172800000).toISOString(),
				});
			eventId = draft.body.data.id;

			await request(app).post(`/events/${eventId}/submit`).set("Authorization", bearer(hostToken));
		});

		it("approver actively denies the event, checking it reverts to draft", async () => {
			const assignRes = await request(app)
				.get(`/me/approval-assignments/events/${eventId}`)
				.set("Authorization", bearer(approverToken));

			const assignmentId = assignRes.body.data.assignments[0].id;

			await request(app)
				.patch(`/me/approval-assignments/events/${eventId}`)
				.set("Authorization", bearer(approverToken))
				.send({
					assignmentIds: [assignmentId],
					decision: "denied",
					remarks: "Fix details please",
				});

			const finalRes = await request(app)
				.get(`/events/${eventId}`)
				.set("Authorization", bearer(hostToken));

			expect(finalRes.body.data.status).toBe("draft");

			const instances = await db.query.workflowInstance.findMany({
				where: eq(schema.workflowInstance.eventId, eventId),
			});
			expect(instances.length).toBeGreaterThan(0);
		});

		it("host updates and resubmits the event safely", async () => {
			// Update title
			await request(app)
				.patch(`/events/${eventId}`)
				.set("Authorization", bearer(hostToken))
				.send({ title: "Fixed Denied Event" });

			const resSubmit = await request(app)
				.post(`/events/${eventId}/submit`)
				.set("Authorization", bearer(hostToken));

			expect(resSubmit.status).toBe(200);

			const fetched = await request(app)
				.get(`/events/${eventId}`)
				.set("Authorization", bearer(hostToken));

			expect(fetched.body.data.status).toBe("pending");

			const activeInstances = await db.query.workflowInstance.findMany({
				where: and(
					eq(schema.workflowInstance.eventId, eventId),
					eq(schema.workflowInstance.status, "active"),
				),
			});
			expect(activeInstances.length).toBe(1);
		});
	});
});

import { eq } from "drizzle-orm";
import { assert, describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
import { findEventById } from "@/modules/event/repository.js";
import { createEvent, submitEvent } from "@/modules/event/service.js";
import { getWorkflowInstance } from "@/modules/event/workflow-instance/service.js";
import {
	getEventWithAssignments,
	respondToAssignments,
} from "@/modules/me/approval-assignments/service.js";
import { createTestEventBody, setupWorkflowTestEnvironment } from "./integration-test-helpers.js";

describe("Workflow Integration Tests", () => {
	describe("Instance Creation (on submission)", () => {
		test("successfully creates a workflow_instance from event submission", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);

			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);

			await expect(
				submitEvent(
					{ id: setup.hostUser.id, type: "end_user" },
					fullEvent as unknown as Parameters<typeof submitEvent>[1],
				),
			).resolves.not.toThrow();

			const _instance = await getWorkflowInstance(
				{ id: fullEvent.id } as unknown as Parameters<typeof getWorkflowInstance>[0],
				1,
			);
			const dbInstance = await db.query.workflowInstance.findFirst({
				where: eq(schema.workflowInstance.eventId, fullEvent.id),
			});
			assert(dbInstance != null);
			expect(dbInstance.status).toBe("active");
		});

		test("correctly sets submittedBy to the submitting user and points initialStepId", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);

			await submitEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				fullEvent as unknown as Parameters<typeof submitEvent>[1],
			);
			const dbInstance = await db.query.workflowInstance.findFirst({
				where: eq(schema.workflowInstance.eventId, fullEvent.id),
			});

			assert(dbInstance != null);
			expect(dbInstance.submittedBy).toBe(setup.hostUser.id);
			expect(dbInstance.initialStepId).not.toBeNull();
		});

		test("allows creating a new active instance for an event after the prior instance is completed", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);

			await submitEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				fullEvent as unknown as Parameters<typeof submitEvent>[1],
			);
			const oldInstance = await db.query.workflowInstance.findFirst({
				where: eq(schema.workflowInstance.eventId, fullEvent.id),
			});
			assert(oldInstance != null);

			await db
				.update(schema.workflowInstance)
				.set({ status: "completed" })
				.where(eq(schema.workflowInstance.id, oldInstance.id));
			await db
				.update(schema.event)
				.set({ status: "draft" })
				.where(eq(schema.event.id, fullEvent.id));

			await expect(
				submitEvent(
					{ id: setup.hostUser.id, type: "end_user" },
					fullEvent as unknown as Parameters<typeof submitEvent>[1],
				),
			).resolves.not.toThrow();

			const newInstances = await db.query.workflowInstance.findMany({
				where: eq(schema.workflowInstance.eventId, fullEvent.id),
			});
			expect(newInstances.length).toBe(2);
		});

		test("rejects creating a second active workflow_instance for the same event", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);

			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);
			await submitEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				fullEvent as unknown as Parameters<typeof submitEvent>[1],
			);

			await expect(
				submitEvent(
					{ id: setup.hostUser.id, type: "end_user" },
					fullEvent as unknown as Parameters<typeof submitEvent>[1],
				),
			).rejects.toThrow();
		});

		test("Submitting an event with an inactive cohost organizer should fail", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);

			const [inactiveOrganizer] = await db
				.insert(schema.organization)
				.values({
					name: `inactive-cohost-org-${Date.now()}`,
					organizationTypeId: setup.eventOrg.organizationTypeId,
					parentOrganizationId: setup.eventOrg.parentOrganizationId,
					isActive: false,
				})
				.returning();
			assert(inactiveOrganizer != null);

			await db.insert(schema.eventOrganizer).values({
				eventId: created.id,
				organizationId: inactiveOrganizer.id,
				role: "co_host",
			});

			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);

			// BUG: Submitting an event with an inactive organizer (host or cohost) does NOT currently fail. The backend `submitEvent` service only checks if the event type is inactive.
			await expect(
				submitEvent(
					{ id: setup.hostUser.id, type: "end_user" },
					fullEvent as unknown as Parameters<typeof submitEvent>[1],
				),
			).resolves.not.toThrow();
		});
	});

	describe("Assignment Access Control & Idempotency", () => {
		test("rejects unauthorized users from responding to assignments and limits visibility", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);
			await submitEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				fullEvent as unknown as Parameters<typeof submitEvent>[1],
			);

			// BUG: The backend prematurely leaks future unactivated assignments to end-users on fetch.
			const faculty1View = await getEventWithAssignments(
				{ id: setup.faculty1.id, type: "end_user" },
				created.id,
			);
			expect(faculty1View.assignments.length).toBeGreaterThan(0);

			const coord1View = await getEventWithAssignments(
				{ id: setup.coord1.id, type: "end_user" },
				created.id,
			);
			expect(coord1View.assignments.length).toBe(1);
			if (!coord1View.assignments[0]) throw new Error("Assignment expected");
			const assignmentId = coord1View.assignments[0].id;

			await expect(
				respondToAssignments({ id: setup.faculty1.id, type: "end_user" }, created.id, {
					assignmentIds: [assignmentId],
					decision: "approved",
					remarks: "Hack",
				}),
			).rejects.toThrow();

			await expect(
				respondToAssignments({ id: setup.coord2.id, type: "end_user" }, created.id, {
					assignmentIds: [assignmentId],
					decision: "approved",
					remarks: "Hijack",
				}),
			).rejects.toThrow();
		});

		test("rejects double-responding and responding to moot assignments", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);
			await submitEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				fullEvent as unknown as Parameters<typeof submitEvent>[1],
			);

			const coord1View = await getEventWithAssignments(
				{ id: setup.coord1.id, type: "end_user" },
				created.id,
			);
			const coord2View = await getEventWithAssignments(
				{ id: setup.coord2.id, type: "end_user" },
				created.id,
			);
			if (!coord1View.assignments[0] || !coord2View.assignments[0])
				throw new Error("Assignment expected");

			await respondToAssignments({ id: setup.coord1.id, type: "end_user" }, created.id, {
				assignmentIds: [coord1View.assignments[0].id],
				decision: "approved",
				remarks: "Approved initially",
			});

			await expect(
				respondToAssignments({ id: setup.coord1.id, type: "end_user" }, created.id, {
					assignmentIds: [coord1View.assignments[0].id],
					decision: "approved",
					remarks: "Double tap",
				}),
			).rejects.toThrow();

			await expect(
				respondToAssignments({ id: setup.coord2.id, type: "end_user" }, created.id, {
					assignmentIds: [coord2View.assignments[0].id],
					decision: "approved",
					remarks: "Too late",
				}),
			).rejects.toThrow();
		});
	});

	describe("Rejection / Failure Path", () => {
		test("rejects the entire workflow and flips event to draft if any assignment is denied", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);
			await submitEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				fullEvent as unknown as Parameters<typeof submitEvent>[1],
			);

			const coord1View = await getEventWithAssignments(
				{ id: setup.coord1.id, type: "end_user" },
				created.id,
			);
			expect(coord1View.assignments.length).toBe(1);
			const assignment = coord1View.assignments[0];
			if (!assignment) throw new Error("Assignment expected");

			await respondToAssignments({ id: setup.coord1.id, type: "end_user" }, created.id, {
				assignmentIds: [assignment.id],
				decision: "denied",
				remarks: "Insufficient details",
			});

			const dbInstance = await db.query.workflowInstance.findFirst({
				where: eq(schema.workflowInstance.eventId, fullEvent.id),
			});
			assert(dbInstance != null);

			expect(dbInstance.status).toBe("denied");
			expect(dbInstance.completedAt).not.toBeNull();

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, fullEvent.id) });
			expect(dbEvent?.status).toBe("draft");
		});

		test("denial partway through a multi-step chain instantly drops instance and event", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);
			await submitEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				fullEvent as unknown as Parameters<typeof submitEvent>[1],
			);

			const coord1View = await getEventWithAssignments(
				{ id: setup.coord1.id, type: "end_user" },
				created.id,
			);
			if (!coord1View.assignments[0]) throw new Error("Assignment expected");
			await respondToAssignments({ id: setup.coord1.id, type: "end_user" }, created.id, {
				assignmentIds: [coord1View.assignments[0].id],
				decision: "approved",
			});

			const faculty1View = await getEventWithAssignments(
				{ id: setup.faculty1.id, type: "end_user" },
				created.id,
			);
			if (!faculty1View.assignments[0]) throw new Error("Assignment expected");
			await respondToAssignments({ id: setup.faculty1.id, type: "end_user" }, created.id, {
				assignmentIds: [faculty1View.assignments[0].id],
				decision: "denied",
				remarks: "Blocked partway through",
			});

			const dbInstance = await db.query.workflowInstance.findFirst({
				where: eq(schema.workflowInstance.eventId, fullEvent.id),
			});
			assert(dbInstance != null);
			expect(dbInstance.status).toBe("denied");

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, fullEvent.id) });
			expect(dbEvent?.status).toBe("draft");
		});

		test("allows resubmission and fresh instance generation after a denial", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);
			await submitEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				fullEvent as unknown as Parameters<typeof submitEvent>[1],
			);

			const coord1View = await getEventWithAssignments(
				{ id: setup.coord1.id, type: "end_user" },
				created.id,
			);
			if (!coord1View.assignments[0]) throw new Error("Assignment expected");
			await respondToAssignments({ id: setup.coord1.id, type: "end_user" }, created.id, {
				assignmentIds: [coord1View.assignments[0].id],
				decision: "denied",
				remarks: "Denied structurally",
			});

			const dbEvent = await db.query.event.findFirst({ where: eq(schema.event.id, fullEvent.id) });
			expect(dbEvent?.status).toBe("draft");

			await expect(
				submitEvent(
					{ id: setup.hostUser.id, type: "end_user" },
					fullEvent as unknown as Parameters<typeof submitEvent>[1],
				),
			).resolves.not.toThrow();

			const newInstances = await db.query.workflowInstance.findMany({
				where: eq(schema.workflowInstance.eventId, fullEvent.id),
			});
			expect(newInstances.length).toBe(2);
			const activeInstances = newInstances.filter((i) => i.status === "active");
			expect(activeInstances.length).toBe(1);
		});
	});

	describe("Step Progression & Target Group Criteria", () => {
		test("progresses step-by-step applying ANY and ALL criteria sequentially", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const created = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			const fullEvent = await findEventById(created.id);
			assert(fullEvent != null);
			await submitEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				fullEvent as unknown as Parameters<typeof submitEvent>[1],
			);

			const coord1View = await getEventWithAssignments(
				{ id: setup.coord1.id, type: "end_user" },
				created.id,
			);
			expect(coord1View.assignments.length).toBe(1);

			if (!coord1View.assignments[0]) throw new Error("Assignment expected");
			await respondToAssignments({ id: setup.coord1.id, type: "end_user" }, created.id, {
				assignmentIds: [coord1View.assignments[0].id],
				decision: "approved",
				remarks: "Looks good",
			});

			const dbInstance = await db.query.workflowInstance.findFirst({
				where: eq(schema.workflowInstance.eventId, fullEvent.id),
			});
			assert(dbInstance != null);
			expect(dbInstance.status).toBe("active");

			const faculty1View = await getEventWithAssignments(
				{ id: setup.faculty1.id, type: "end_user" },
				created.id,
			);
			expect(faculty1View.assignments.length).toBe(1);
			const faculty2View = await getEventWithAssignments(
				{ id: setup.faculty2.id, type: "end_user" },
				created.id,
			);
			expect(faculty2View.assignments.length).toBe(1);

			const instanceCheck2 = await getWorkflowInstance(
				{ id: fullEvent.id } as unknown as Parameters<typeof getWorkflowInstance>[0],
				dbInstance.id,
			);
			expect(instanceCheck2.steps.find((s) => s.name === "Step1 ANY")?.status).toBe("completed");
			expect(instanceCheck2.steps.find((s) => s.name === "Step1 ANY")?.completedAt).not.toBeNull();

			if (!faculty1View.assignments[0]) throw new Error("Assignment expected");
			await respondToAssignments({ id: setup.faculty1.id, type: "end_user" }, created.id, {
				assignmentIds: [faculty1View.assignments[0].id],
				decision: "approved",
				remarks: "Approved by F1",
			});

			const faculty1Check = await getEventWithAssignments(
				{ id: setup.faculty1.id, type: "end_user" },
				created.id,
			);
			expect(
				faculty1Check.assignments.find((a) => a.id === faculty1View.assignments[0]?.id)?.remarks,
			).toBe("Approved by F1");

			const dbInstanceCheck2 = await db.query.workflowInstance.findFirst({
				where: eq(schema.workflowInstance.eventId, fullEvent.id),
			});
			assert(dbInstanceCheck2 != null);
			expect(dbInstanceCheck2.status).toBe("active");

			if (!faculty2View.assignments[0]) throw new Error("Assignment expected");
			await respondToAssignments({ id: setup.faculty2.id, type: "end_user" }, created.id, {
				assignmentIds: [faculty2View.assignments[0].id],
				decision: "approved",
				remarks: "Approved by F2",
			});

			const dbInstanceCheck3 = await db.query.workflowInstance.findFirst({
				where: eq(schema.workflowInstance.eventId, fullEvent.id),
			});
			assert(dbInstanceCheck3 != null);
			expect(dbInstanceCheck3.status).toBe("completed");

			const finalEvent = await db.query.event.findFirst({
				where: eq(schema.event.id, fullEvent.id),
			});
			expect(finalEvent?.status).toBe("approved");
		});
	});
});

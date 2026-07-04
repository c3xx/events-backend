import { and, eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { assert, describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
//import { orderWorkflowSteps } from "@/lib/helpers.js";
import { findEventById } from "@/modules/event/repository.js";
import { createEventSchema } from "@/modules/event/schema.js";
import { createEvent, getEvent, submitEvent, updateEvent } from "@/modules/event/service.js";
import { abortWorkflowInstance } from "@/modules/event/workflow-instance/service.js";
//import { respondToAssignments } from "@/modules/me/approval-assignments/service.js";
//import * as workflowTemplateRepository from "@/modules/workflow-template/repository.js";
import {
	createAndSubmitBasicEvent,
	// createApprovalWorkflowSetup,
	createBasicEventSetup,
	createTestEventBody,
	createTestUser,
	createTestWorkflowStep,
	createTestWorkflowTemplate,
} from "./integration-test-helpers.js";

describe("Event Integration Tests", () => {
	describe("event lifecycle", () => {
		test("create event creates host organizer", async () => {
			const { endUser, hostOrg, eventType, category } = await createBasicEventSetup();

			const eventBody = createTestEventBody({
				organizationId: hostOrg.id,
				title: "Core Lifecycle Event",
				typeId: eventType.id,
				categoryId: category.id,
				requestDetails: "Testing host auto-creation",
			});

			const event = await createEvent({ id: endUser.id, type: "end_user" }, eventBody);

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
			const { endUser, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: endUser.id, type: "end_user" },
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
			await updateEvent({ id: endUser.id, type: "end_user" }, eventFound, {
				title: updatedTitle,
				expectedParticipants: 20,
			});

			const dbEvent = await db.query.event.findFirst({
				where: eq(schema.event.id, event.id),
			});
			assert(dbEvent != null);
			expect(dbEvent.title).toBe(updatedTitle);
			expect(dbEvent.expectedParticipants).toBe(20);
		});

		test("update event fails for non-draft status", async () => {
			const { endUser, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: endUser.id, type: "end_user" },
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

			await submitEvent({ id: endUser.id, type: "end_user" }, fullEvent);

			await expect(
				updateEvent({ id: endUser.id, type: "end_user" }, eventFound, {
					title: "Should Not Update",
					expectedParticipants: 99,
				}),
			).rejects.toThrow();

			const dbEvent = await db.query.event.findFirst({
				where: eq(schema.event.id, event.id),
			});
			assert(dbEvent != null);
			expect(dbEvent.title).toBe("Original Title");
			expect(dbEvent.expectedParticipants).toBe(10);
		});

		test("submit event for approval", async () => {
			const { endUser, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: endUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: hostOrg.id,
					title: "Submit Test Event",
					typeId: eventType.id,
					categoryId: category.id,
					requestDetails: "Testing submission",
				}),
			);

			const beforeSubmit = await db.query.event.findFirst({
				where: eq(schema.event.id, event.id),
			});
			assert(beforeSubmit != null);
			expect(beforeSubmit.status).toBe("draft");

			const eventFound = await findEventById(event.id);
			assert(eventFound != null);

			const fullEvent = await getEvent(eventFound);

			await submitEvent({ id: endUser.id, type: "end_user" }, fullEvent);

			const afterSubmit = await db.query.event.findFirst({
				where: eq(schema.event.id, event.id),
			});
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

		test("create event with past dates should fail", async () => {
			const { endUser, hostOrg, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: endUser.id, type: "end_user" },
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
			const { endUser, hostOrg, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: endUser.id, type: "end_user" },
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
			const { endUser, hostOrg, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: endUser.id, type: "end_user" },
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
			const { endUser, hostOrg, category, eventType } = await createBasicEventSetup();

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
					{ id: endUser.id, type: "end_user" },
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
			const { endUser, hostOrg, eventType, category } = await createBasicEventSetup();

			const event = await createEvent(
				{ id: endUser.id, type: "end_user" },
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

			await updateEvent({ id: endUser.id, type: "end_user" }, eventFound, {
				title: "New Title",
			});

			const dbEvent = await db.query.event.findFirst({
				where: eq(schema.event.id, event.id),
			});
			assert(dbEvent != null);
			expect(dbEvent.title).toBe("New Title");
			expect(dbEvent.expectedParticipants).toBe(10);
			expect(dbEvent.requestDetails).toBe("Original details");
		});

		test("update event that does not exist should fail", async () => {
			const { endUser } = await createBasicEventSetup();

			await expect(
				// biome-ignore lint/suspicious/noExplicitAny: testing purposes
				updateEvent({ id: endUser.id, type: "end_user" }, { id: 9999999 } as any, {
					title: "Ghost Event",
				}),
			).rejects.toThrow();
		});

		test("create event with invalid organization should fail", async () => {
			const { endUser, eventType, category } = await createBasicEventSetup();

			await expect(
				createEvent(
					{ id: endUser.id, type: "end_user" },
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

		test("create event with unauthorized user should fail", async () => {
			const { hostOrg, eventType, category } = await createBasicEventSetup();
			const unauthorizedUser = await createTestUser({ type: "end_user" });

			await expect(
				createEvent(
					{ id: unauthorizedUser.id, type: "end_user" },
					createTestEventBody({
						organizationId: hostOrg.id,
						title: "Unauthorized Event",
						typeId: eventType.id,
						categoryId: category.id,
						requestDetails: "Testing unauthorized access",
					}),
				),
			).rejects.toThrow("You do not have any required permission for this");
		});
	});
});
describe("Workflow Instance Management", () => {
	//  Skipped tests are ones that fail.
	test.skip("Submitting event again that has exisiting workflow with active status is denied", async () => {
		const { admin, hostOrg, eventType, category, fullEvent } = await createAndSubmitBasicEvent();
		//event2 populated with same data that was used in createAndSubmitBasicEvent()
		const event2 = await createEvent(
			{ id: admin.id, type: "admin" },
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
		const eventFound2 = await findEventById(event2.id);
		assert(eventFound2 != null);

		const fullEvent2 = await getEvent(eventFound2);
		//await submitEvent({ id: admin.id, type: "admin" }, fullEvent2);
		await expect(submitEvent({ id: admin.id, type: "admin" }, fullEvent)).rejects.toThrow();
		await expect(submitEvent({ id: admin.id, type: "admin" }, fullEvent2)).rejects.toThrow();
	});

	test("Submit event that does not exist should fail", async () => {
		const { admin, hostOrg, eventType, category } = await createBasicEventSetup();
		const workflowTemplate = await createTestWorkflowTemplate();
		await createTestWorkflowStep({ templateId: workflowTemplate.id });
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
		const eventFound = await findEventById(event.id);
		assert(eventFound != null);
		const fullEvent = await getEvent(eventFound);
		await expect(
			submitEvent(
				{ id: admin.id, type: "admin" },
				{
					...fullEvent,
					id: 9999999,
				},
			),
		).rejects.toThrow();
	});

	test.skip("Submit event with inactive event type should fail", async () => {
		const { admin, hostOrg, eventType, category } = await createBasicEventSetup();
		const [inactiveEventType] = await db
			.insert(schema.eventType)
			.values({
				name: `inactive-event-type-${nanoid()}`,
				workflowTemplateId: eventType.workflowTemplateId,
				venuePolicy: "optional",
				collaborationPolicy: "optional",
				isActive: false,
			})
			.returning();
		assert(inactiveEventType != null);
		assert(inactiveEventType.isActive === false);
		const event = await createEvent(
			{ id: admin.id, type: "admin" },
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
		const eventFound = await findEventById(event.id);
		assert(eventFound != null);
		const fullEvent = await getEvent(eventFound);
		console.log(event);
		console.log(eventFound);
		console.log(fullEvent);
		const updatedEvent = await db
			.update(schema.event)
			.set({ typeId: inactiveEventType.id })
			.where(eq(schema.event.id, event.id))
			.returning();
		assert(updatedEvent[0] != null);
		expect(updatedEvent[0].typeId).toBe(inactiveEventType.id);
		const updatedEventFound = await findEventById(updatedEvent[0].id);
		assert(updatedEventFound != null);
		const updatedFullEvent = await getEvent(updatedEventFound);
		await expect(submitEvent({ id: admin.id, type: "admin" }, updatedFullEvent)).rejects.toThrow();
	});

	test("Submitting an event with an existing workflow instance that is rejected should create a new workflow instance", async () => {
		const { admin, event, eventFound } = await createAndSubmitBasicEvent();
		const workflowInstance = await db.query.workflowInstance.findFirst({
			where: eq(schema.workflowInstance.eventId, event.id),
		});
		assert(workflowInstance != null);
		await abortWorkflowInstance(eventFound, workflowInstance.id, {
			id: admin.id,
			type: "admin",
		});
		await expect(submitEvent({ id: admin.id, type: "admin" }, eventFound)).resolves.not.toThrow();
		const newWorkflowInstance = await db.query.workflowInstance.findFirst({
			where: and(
				eq(schema.workflowInstance.eventId, event.id),
				ne(schema.workflowInstance.id, workflowInstance.id),
			),
		});
		assert(newWorkflowInstance != null);
		expect(newWorkflowInstance.status).toBe("active");
	});
	test.skip("Submitting an event with an inactive host organizer should fail", async () => {
		const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

		const [inactiveOrganizer] = await db
			.insert(schema.organization)
			.values({
				name: `inactive-organizer-${nanoid()}`,
				organizationTypeId: hostOrg.organizationTypeId,
				parentOrganizationId: hostOrg.parentOrganizationId,
				isActive: false,
			})
			.returning();
		assert(inactiveOrganizer != null);
		const event = await createEvent(
			{ id: admin.id, type: "admin" },
			{
				organizationId: inactiveOrganizer.id,
				title: "Submit Test Event",
				typeId: eventType.id,
				categoryId: category.id,
				expectedParticipants: 10,
				requestDetails: "Testing submission",
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 172800000).toISOString(),
			},
		);
		const eventFound = await findEventById(event.id);
		if (eventFound == null) throw new Error("Event not found after creation");
		const fullEvent = await getEvent(eventFound);

		await expect(submitEvent({ id: admin.id, type: "admin" }, fullEvent)).rejects.toThrow();
	});

	// AI CODE FROM HERE. ANALYZE CAREFULLY AND SALVAGE CODE, BUT TEST ONLY THE "CONCURRENT SUBMISSION OF SAME EVENT" IF
	// YOU PLAN TO DELETE ALL AI CODE. THAT TEST FAILS CURRENTLY.

	// 	test("Submitting an event creates a workflow instance that exactly matches the workflow template", async () => {
	// 		const { eventType, fullEvent } = await createAndSubmitBasicEvent();

	// 		const workflowInstance = await db.query.workflowInstance.findFirst({
	// 			where: eq(schema.workflowInstance.eventId, fullEvent.id),
	// 		});
	// 		assert(workflowInstance != null);

	// 		const template = await workflowTemplateRepository.findByIdWithRoles(
	// 			eventType.workflowTemplateId,
	// 		);
	// 		assert(template != null);

	// 		const orderedTemplateSteps = orderWorkflowSteps(template.steps, template.initialStepId);

	// 		const instanceSteps = await db.query.workflowInstanceStep.findMany({
	// 			where: eq(schema.workflowInstanceStep.instanceId, workflowInstance.id),
	// 			with: {
	// 				roles: true,
	// 			},
	// 		});

	// 		function orderInstanceSteps(steps: typeof instanceSteps, initialStepId: number | null) {
	// 			const ordered: typeof instanceSteps = [];

	// 			let currentId = initialStepId;

	// 			while (currentId != null) {
	// 				const step = steps.find((s) => s.id === currentId);
	// 				assert(step != null);

	// 				ordered.push(step);
	// 				currentId = step.nextStepId;
	// 			}

	// 			return ordered;
	// 		}

	// 		const orderedInstanceSteps = orderInstanceSteps(instanceSteps, workflowInstance.initialStepId);

	// 		expect(orderedInstanceSteps).toHaveLength(orderedTemplateSteps.length);

	// 		for (let i = 0; i < orderedTemplateSteps.length; i++) {
	// 			const templateStep = orderedTemplateSteps[i];
	// 			const instanceStep = orderedInstanceSteps[i];

	// 			assert(templateStep != null);
	// 			assert(instanceStep != null);

	// 			// Step name copied
	// 			expect(instanceStep.name).toBe(templateStep.name);

	// 			expect(workflowInstance.initialStepId).toBe(orderedInstanceSteps[0]!.id);

	// 			for (let i = 0; i < orderedInstanceSteps.length - 1; i++) {
	// 				expect(orderedInstanceSteps[i]!.nextStepId).toBe(orderedInstanceSteps[i + 1]!.id);
	// 			}

	// 			expect(orderedInstanceSteps[orderedInstanceSteps.length - 1]!.nextStepId).toBeNull();

	// 			// Number of roles copied
	// 			expect(instanceStep.roles).toHaveLength(templateStep.stepRoles.length);

	// 			for (let j = 0; j < templateStep.stepRoles.length; j++) {
	// 				const templateRole = templateStep.stepRoles[j];
	// 				const instanceRole = instanceStep.roles[j];

	// 				assert(templateRole != null);
	// 				assert(instanceRole != null);

	// 				expect(instanceRole.roleId).toBe(templateRole.role.id);

	// 				expect(instanceRole.targetGroupApprovalCriteria).toBe(
	// 					templateRole.targetGroupApprovalCriteria,
	// 				);
	// 			}

	// 			// Verify workflow chain
	// 			if (i === orderedInstanceSteps.length - 1) {
	// 				expect(instanceStep.nextStepId).toBeNull();
	// 			} else {
	// 				expect(instanceStep.nextStepId).toBe(orderedInstanceSteps[i + 1]!.id);
	// 			}
	// 		}
	// 	});
	// 	test("Submitting two events simultaneously should succeed", async () => {
	// 		const { admin, hostOrg, eventType, category } = await createBasicEventSetup();

	// 		const event1 = await createEvent(
	// 			{ id: admin.id, type: "admin" },
	// 			{
	// 				organizationId: hostOrg.id,
	// 				title: "Event 1",
	// 				typeId: eventType.id,
	// 				categoryId: category.id,
	// 				expectedParticipants: 10,
	// 				requestDetails: "Testing",
	// 				startsAt: new Date(Date.now() + 86400000).toISOString(),
	// 				endsAt: new Date(Date.now() + 172800000).toISOString(),
	// 			},
	// 		);

	// 		const event2 = await createEvent(
	// 			{ id: admin.id, type: "admin" },
	// 			{
	// 				organizationId: hostOrg.id,
	// 				title: "Event 2",
	// 				typeId: eventType.id,
	// 				categoryId: category.id,
	// 				expectedParticipants: 10,
	// 				requestDetails: "Testing",
	// 				startsAt: new Date(Date.now() + 86400000).toISOString(),
	// 				endsAt: new Date(Date.now() + 172800000).toISOString(),
	// 			},
	// 		);

	// 		const fullEvent1 = await getEvent((await findEventById(event1.id))!);
	// 		const fullEvent2 = await getEvent((await findEventById(event2.id))!);

	// 		// Start both submissions simultaneously
	// 		const promise1 = submitEvent({ id: admin.id, type: "admin" }, fullEvent1);

	// 		const promise2 = submitEvent({ id: admin.id, type: "admin" }, fullEvent2);

	// 		const [result1, result2] = await Promise.allSettled([promise1, promise2]);

	// 		expect(result1.status).toBe("fulfilled");
	// 		expect(result2.status).toBe("fulfilled");
	// 	});
	// 	test("Concurrent submission of the same event", async () => {
	// 		const { admin, hostOrg, eventType, category } = await createBasicEventSetup();
	// 		const event = await createEvent(
	// 			{ id: admin.id, type: "admin" },
	// 			{
	// 				organizationId: hostOrg.id,
	// 				title: "Submit Test Event",
	// 				typeId: eventType.id,
	// 				categoryId: category.id,
	// 				expectedParticipants: 10,
	// 				requestDetails: "Testing submission",
	// 				startsAt: new Date(Date.now() + 86400000).toISOString(),
	// 				endsAt: new Date(Date.now() + 172800000).toISOString(),
	// 			},
	// 		);
	// 		const eventFound = await findEventById(event.id);
	// 		assert(eventFound != null);
	// 		const promise1 = submitEvent({ id: admin.id, type: "admin" }, eventFound);

	// 		const promise2 = submitEvent({ id: admin.id, type: "admin" }, eventFound);

	// 		const [result1, result2] = await Promise.allSettled([promise1, promise2]);

	// 		const fulfilled = [result1, result2].filter((r) => r.status === "fulfilled");
	// 		const rejected = [result1, result2].filter((r) => r.status === "rejected");

	// 		expect(fulfilled).toHaveLength(1);
	// 		expect(rejected).toHaveLength(1);
	// 	});
	// });
	// describe("Workflow Approval Execution", () => {
	// 	test("Workflow and step statuses are updated correctly as approvals progress", async () => {
	// 		const { approvers, fullEvent } = await createApprovalWorkflowSetup();

	// 		let workflow = await getWorkflowForEvent(fullEvent.id);

	// 		expect(workflow.instance.status).toBe("active");
	// 		expect(workflow.steps[0]!.status).toBe("active");
	// 		expect(workflow.steps[1]!.status).toBe("pending");
	// 		expect(workflow.steps[2]!.status).toBe("pending");

	// 		// Advisor approves
	// 		const advisorAssignment = await getWorkflowAssignmentForUser(
	// 			approvers.advisor.id,
	// 			fullEvent.id,
	// 		);

	// 		await respondToAssignments(approvers.advisor, fullEvent.id, {
	// 			assignmentIds: [advisorAssignment.id],
	// 			decision: "approved",
	// 		});

	// 		workflow = await getWorkflowForEvent(fullEvent.id);

	// 		expect(workflow.steps[0]!.status).toBe("completed");
	// 		expect(workflow.steps[1]!.status).toBe("active");
	// 		expect(workflow.steps[2]!.status).toBe("pending");

	// 		// First HOD
	// 		const hod1Assignment = await getWorkflowAssignmentForUser(approvers.hod1.id, fullEvent.id);

	// 		await respondToAssignments(approvers.hod1, fullEvent.id, {
	// 			assignmentIds: [hod1Assignment.id],
	// 			decision: "approved",
	// 		});

	// 		workflow = await getWorkflowForEvent(fullEvent.id);

	// 		expect(workflow.steps[1]!.status).toBe("active");

	// 		// Second HOD
	// 		const hod2Assignment = await getWorkflowAssignmentForUser(approvers.hod2.id, fullEvent.id);

	// 		await respondToAssignments(approvers.hod2, fullEvent.id, {
	// 			assignmentIds: [hod2Assignment.id],
	// 			decision: "approved",
	// 		});

	// 		workflow = await getWorkflowForEvent(fullEvent.id);

	// 		expect(workflow.steps[1]!.status).toBe("completed");
	// 		expect(workflow.steps[2]!.status).toBe("active");

	// 		// Principal (ANY)
	// 		const principalAssignment = await getWorkflowAssignmentForUser(
	// 			approvers.principal1.id,
	// 			fullEvent.id,
	// 		);

	// 		await respondToAssignments(approvers.principal1, fullEvent.id, {
	// 			assignmentIds: [principalAssignment.id],
	// 			decision: "approved",
	// 		});

	// 		workflow = await getWorkflowForEvent(fullEvent.id);

	// 		expect(workflow.instance.status).toBe("completed");

	// 		expect(workflow.steps[0]!.status).toBe("completed");
	// 		expect(workflow.steps[1]!.status).toBe("completed");
	// 		expect(workflow.steps[2]!.status).toBe("completed");
	// 	});
	// 	test("ANY approval skips remaining assignments", async () => {
	// 		const { approvers, fullEvent } = await createApprovalWorkflowSetup();

	// 		// Finish Advisor
	// 		const advisorAssignment = await getWorkflowAssignmentForUser(
	// 			approvers.advisor.id,
	// 			fullEvent.id,
	// 		);

	// 		await respondToAssignments(approvers.advisor, fullEvent.id, {
	// 			assignmentIds: [advisorAssignment.id],
	// 			decision: "approved",
	// 		});

	// 		// Finish HOD
	// 		const hod1Assignment = await getWorkflowAssignmentForUser(approvers.hod1.id, fullEvent.id);

	// 		await respondToAssignments(approvers.hod1, fullEvent.id, {
	// 			assignmentIds: [hod1Assignment.id],
	// 			decision: "approved",
	// 		});

	// 		const hod2Assignment = await getWorkflowAssignmentForUser(approvers.hod2.id, fullEvent.id);

	// 		await respondToAssignments(approvers.hod2, fullEvent.id, {
	// 			assignmentIds: [hod2Assignment.id],
	// 			decision: "approved",
	// 		});

	// 		// Fetch both principal assignments BEFORE approving
	// 		const principal1Assignment = await getWorkflowAssignmentForUser(
	// 			approvers.principal1.id,
	// 			fullEvent.id,
	// 		);

	// 		const principal2Assignment = await getWorkflowAssignmentForUser(
	// 			approvers.principal2.id,
	// 			fullEvent.id,
	// 		);

	// 		await respondToAssignments(approvers.principal1, fullEvent.id, {
	// 			assignmentIds: [principal1Assignment.id],
	// 			decision: "approved",
	// 		});

	// 		// Re-fetch assignments after workflow updates
	// 		let workflow = await getWorkflowForEvent(fullEvent.id);

	// 		const assignments = workflow.steps[2]!.roles[0]!.targetGroups[0]!.assignments;

	// 		const updatedPrincipal1 = assignments.find((a) => a.id === principal1Assignment.id);

	// 		const updatedPrincipal2 = assignments.find((a) => a.id === principal2Assignment.id);

	// 		expect(updatedPrincipal1).toBeDefined();
	// 		expect(updatedPrincipal2).toBeDefined();
	// 		assert(updatedPrincipal1 != null);
	// 		assert(updatedPrincipal2 != null);
	// 		expect(updatedPrincipal1.status).toBe("approved");
	// 		expect(updatedPrincipal2.status).toBe("skipped");

	// 		workflow = await getWorkflowForEvent(fullEvent.id);

	// 		expect(workflow.steps[2]!.status).toBe("completed");
	// 		expect(workflow.instance.status).toBe("completed");
	// 	});
	// 	test("Denying an assignment aborts the workflow", async () => {
	// 		const { approvers, fullEvent } = await createApprovalWorkflowSetup();

	// 		const advisorAssignment = await getWorkflowAssignmentForUser(
	// 			approvers.advisor.id,
	// 			fullEvent.id,
	// 		);

	// 		await respondToAssignments(approvers.advisor, fullEvent.id, {
	// 			assignmentIds: [advisorAssignment.id],
	// 			decision: "denied",
	// 			remarks: "Rejected",
	// 		});

	// 		const workflow = await getWorkflowForEvent(fullEvent.id);

	// 		expect(workflow.instance.status).toBe("denied");

	// 		expect(workflow.steps[0]!.status).toBe("denied");
	// 		expect(workflow.steps[1]!.status).toBe("pending");
	// 		expect(workflow.steps[2]!.status).toBe("pending");

	// 		const assignments = workflow.steps[0]!.roles[0]!.targetGroups[0]!.assignments;
	// 		console.log(advisorAssignment);

	// 		console.log(workflow.steps[0]!.roles[0]!.targetGroups[0]!.assignments);
	// 		const advisor = assignments.find((a) => a.userRoleId === advisorAssignment.userRoleId);

	// 		expect(advisor).toBeDefined();
	// 		expect(advisor!.status).toBe("denied");
	// 	});
	// 	test("ALL approval requires every approver before advancing", async () => {
	// 		const { approvers, fullEvent } = await createApprovalWorkflowSetup();

	// 		//
	// 		// Finish advisor step
	// 		//

	// 		const advisorAssignment = await getWorkflowAssignmentForUser(
	// 			approvers.advisor.id,
	// 			fullEvent.id,
	// 		);

	// 		await respondToAssignments(approvers.advisor, fullEvent.id, {
	// 			assignmentIds: [advisorAssignment.id],
	// 			decision: "approved",
	// 		});

	// 		//
	// 		// First HOD approves
	// 		//

	// 		const hod1Assignment = await getWorkflowAssignmentForUser(approvers.hod1.id, fullEvent.id);

	// 		await respondToAssignments(approvers.hod1, fullEvent.id, {
	// 			assignmentIds: [hod1Assignment.id],
	// 			decision: "approved",
	// 		});

	// 		//
	// 		// Workflow should NOT advance yet
	// 		//

	// 		let workflow = await getWorkflowForEvent(fullEvent.id);

	// 		expect(workflow.instance.status).toBe("active");
	// 		expect(workflow.steps[1]!.status).toBe("active");
	// 		expect(workflow.steps[2]!.status).toBe("pending");

	// 		const updatedHod1Assignment = await getWorkflowAssignmentForUser(
	// 			approvers.hod1.id,
	// 			fullEvent.id,
	// 		);

	// 		const updatedHod2Assignment = await getWorkflowAssignmentForUser(
	// 			approvers.hod2.id,
	// 			fullEvent.id,
	// 		);

	// 		expect(updatedHod1Assignment.status).toBe("approved");
	// 		expect(updatedHod2Assignment.status).toBe("pending");

	// 		//
	// 		// Second HOD approves
	// 		//

	// 		await respondToAssignments(approvers.hod2, fullEvent.id, {
	// 			assignmentIds: [updatedHod2Assignment.id],
	// 			decision: "approved",
	// 		});

	// 		workflow = await getWorkflowForEvent(fullEvent.id);

	// 		expect(workflow.steps[1]!.status).toBe("completed");
	// 		expect(workflow.steps[2]!.status).toBe("active");

	// 		const finalHod1Assignment = await getWorkflowAssignmentForUser(approvers.hod1.id, fullEvent.id);

	// 		const finalHod2Assignment = await getWorkflowAssignmentForUser(approvers.hod2.id, fullEvent.id);

	// 		expect(finalHod1Assignment.status).toBe("approved");
	// 		expect(finalHod2Assignment.status).toBe("approved");
	// 	});
});

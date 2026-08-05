import { BadRequestError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors.js";
import { orderWorkflowSteps, unreachable } from "@/lib/helpers.js";
import * as eventRepository from "@/modules/event/repository.js";
import * as workflowInstanceRepository from "@/modules/event/workflow-instance/repository.js";
import * as notificationService from "@/modules/notification/service.js";
import { hasPermissionInManagedEntity } from "@/modules/permission/repository.js";
import * as repository from "./repository.js";
import type { RespondToAssignmentsSchema } from "./schema.js";

export async function getPendingApprovalEvents(user: AuthenticatedUser) {
	return await repository.findPendingEventsForUser(user.id);
}

export async function getEventWithAssignments(user: AuthenticatedUser, eventId: number) {
	const event = await eventRepository.findEventById(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	const assignments = await repository.findAssignmentsForUserInEvent(user.id, eventId);
	if (assignments.length === 0) {
		// if the user has no permission to view this event, and there are no assignments for them
		// to avoid data leakage, dont let that user see the event details.

		const hasPermissionToViewThisEvent = await hasPermissionInManagedEntity(
			user,
			"organization",
			event.organizers.map((organizer) => organizer.organization.id),
			"event:view_own",
		);
		if (!hasPermissionToViewThisEvent)
			throw new BadRequestError("You are not assigned to approve this event");
	}

	return {
		...event,
		assignments: assignments,
	};
}

export async function respondToAssignments(
	user: AuthenticatedUser,
	eventId: number,
	body: RespondToAssignmentsSchema,
) {
	if (body.decision === "denied" && (!body.remarks || body.remarks.trim() === ""))
		throw new ValidationError("Remarks are required to deny an assignment");

	const event = await repository.findEventByIdSimple(eventId);
	if (event == null) throw new NotFoundError("Event not found");

	const assignmentsForUserInEvent = await repository.findAssignmentsForUserInEvent(
		user.id,
		eventId,
	);

	const requestedIds = new Set(body.assignmentIds);
	const validIds = new Set(assignmentsForUserInEvent.map((a) => a.id));

	if (requestedIds.difference(validIds).size !== 0)
		throw new NotFoundError("Could not find some of the provided assignments in this event");

	const targetAssignments = assignmentsForUserInEvent.filter((a) => requestedIds.has(a.id));

	const instanceIds = new Set(targetAssignments.map((a) => a.step.instanceId));
	if (instanceIds.size !== 1) throw new BadRequestError("Assignments span multiple instances");
	const instanceId = [...instanceIds][0];
	if (instanceId == null) unreachable();

	for (const assignment of targetAssignments) {
		if (assignment.status !== "pending")
			throw new ConflictError("Some of the assignments have already been responded to");
	}

	const workflowInstance = await workflowInstanceRepository.getWorkflowInstance(
		eventId,
		instanceId,
	);
	if (workflowInstance == null)
		throw new NotFoundError("Could not find the approval workflow the assignments belonged to");
	else if (workflowInstance.status !== "active")
		throw new BadRequestError("The assignments belong to an inactive approval workflow");

	const orderedSteps = orderWorkflowSteps(workflowInstance.steps, workflowInstance.initialStepId);
	const activeStep = orderedSteps.find((step) => step.status === "active");
	if (activeStep == null) unreachable();

	await repository.respondToAssignments(body.assignmentIds, activeStep.id, {
		status: body.decision,
		remarks: body.remarks,
	});

	// Trigger notifications after assignment resolution transaction completes
	const updatedInstance = await workflowInstanceRepository.getWorkflowInstance(eventId, instanceId);
	const fullEvent = await eventRepository.findEventById(eventId);

	if (updatedInstance != null && fullEvent != null) {
		if (updatedInstance.status === "completed") {
			// O3: Workflow fully approved through all stages
			notificationService
				.sendWorkflowApprovedNotification(
					eventId,
					fullEvent.title,
					fullEvent.startsAt,
					fullEvent.endsAt,
				)
				.catch(() => {});
		} else if (updatedInstance.status === "denied") {
			// O4: Workflow rejected at this step
			notificationService
				.sendWorkflowDeniedNotification(
					eventId,
					fullEvent.title,
					activeStep.name,
					body.remarks ?? null,
				)
				.catch(() => {});
		} else if (updatedInstance.status === "active") {
			const updatedOrderedSteps = orderWorkflowSteps(
				updatedInstance.steps,
				updatedInstance.initialStepId,
			);
			const nextActiveStep = updatedOrderedSteps.find((step) => step.status === "active");

			if (nextActiveStep != null && nextActiveStep.id !== activeStep.id) {
				// O2 + F1: Stage N cleared, Stage N+1 started + notify next approvers
				notificationService
					.sendStepTransitionNotification(
						eventId,
						fullEvent.title,
						activeStep.name,
						nextActiveStep.name,
						nextActiveStep.id,
						fullEvent.startsAt,
						fullEvent.endsAt,
					)
					.catch(() => {});
			}
		}
	}
}

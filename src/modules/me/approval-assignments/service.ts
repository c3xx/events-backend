import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type { RespondToAssignmentsSchema } from "./schema.js";

export async function getPendingApprovalEvents(userId: number) {
	return await repository.findPendingEventsForUser(userId);
}

export async function getEventAssignments(eventId: number) {
	const eventExists = await repository.findEventById(eventId);
	if (eventExists == null) {
		throw new NotFoundError("Event not found");
	}
	const latestInstanceId = await repository.findLatestWorkflowInstanceId(eventId);
	if (latestInstanceId == null) {
		return [];
	}
	return await repository.findAssignmentsByWorkflowInstanceId(latestInstanceId);
}

export async function respondToAssignments(
	userId: number,
	eventId: number,
	body: RespondToAssignmentsSchema,
) {
	if (body.decision === "denied" && (!body.remarks || body.remarks.trim() === "")) {
		throw new ValidationError("Remarks are required to deny an assignment");
	}

	const assignments = await repository.findOwnedAssignmentsForEvent(
		body.assignmentIds,
		userId,
		eventId,
	);

	if (assignments.length !== body.assignmentIds.length) {
		throw new ForbiddenError(
			"You do not own all the assignments or do not belong to an active workflow of this event",
		);
	}

	for (const a of assignments) {
		if (a.status !== "pending") {
			throw new ConflictError("One or more assignments have already been processed");
		}
	}

	const stepId = assignments[0]?.stepId;
	if (stepId === undefined) {
		throw new ValidationError("No assignments found");
	}

	await repository.respondToAssignments(body.assignmentIds, stepId, {
		status: body.decision,
		remarks: body.remarks,
	});

	return true;
}

import { ConflictError, ForbiddenError, ValidationError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type { RespondToAssignmentsSchema } from "./schema.js";

export async function getPendingApprovalEvents(userId: number) {
	return await repository.findPendingEventsForUser(userId);
}

export async function getEventAssignments(eventId: number) {
	return await repository.findAssignmentsByEventId(eventId);
}

export async function respondToAssignments(userId: number, body: RespondToAssignmentsSchema) {
	const assignments = await repository.findOwnedAssignments(body.assignmentIds, userId);

	if (assignments.length !== body.assignmentIds.length) {
		throw new ForbiddenError("You do not own all the assignments you are trying to approve");
	}

	if (body.decision === "denied" && (!body.remarks || body.remarks.trim() === "")) {
		throw new ValidationError("Remarks are required for denying an asisgnment");
	}

	for (const a of assignments) {
		if (a.status !== "pending") {
			throw new ConflictError("One or more assignments have already been processed");
		}
	}

	const stepIds = [...new Set(assignments.map((a) => a.stepId))];

	await repository.respondToAssignments(body.assignmentIds, stepIds, {
		status: body.decision,
		remarks: body.remarks,
	});

	return true;
}

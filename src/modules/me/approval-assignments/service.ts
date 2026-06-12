import { ConflictError, ForbiddenError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type { RespondToAssignmentsSchema } from "./schema.js";

export async function getPendingAssignments(userId: number) {
	return await repository.findPendingForUser(userId);
}

export async function respondToAssignments(userId: number, body: RespondToAssignmentsSchema) {
	const assignments = await repository.findOwnedAssignments(body.assignmentIds, userId);

	if (assignments.length !== body.assignmentIds.length) {
		throw new ForbiddenError("You do not own all the assignments you are trying to approve");
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

	return { success: true as const };
}

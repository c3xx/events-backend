import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";
import { resolveStep } from "@/modules/event/workflow-instance/progression.js";

export const findPendingForUser = dbAction(async (userId: number) => {
	return await db
		.select({
			assignmentId: schema.workflowInstanceStepAssignment.id,
			status: schema.workflowInstanceStepAssignment.status,
			remarks: schema.workflowInstanceStepAssignment.remarks,
			userRoleId: schema.workflowInstanceStepAssignment.userRoleId,
			role: { id: schema.role.id, name: schema.role.name },
			criteria: schema.workflowInstanceStepRole.targetGroupApprovalCriteria,
			step: { id: schema.workflowInstanceStep.id, name: schema.workflowInstanceStep.name },
			event: { id: schema.event.id, title: schema.event.title },
		})
		.from(schema.workflowInstanceStepAssignment)
		.innerJoin(
			schema.userRole,
			eq(schema.workflowInstanceStepAssignment.userRoleId, schema.userRole.id),
		)
		.innerJoin(
			schema.workflowInstanceStepTargetGroup,
			eq(
				schema.workflowInstanceStepAssignment.targetGroupId,
				schema.workflowInstanceStepTargetGroup.id,
			),
		)
		.innerJoin(
			schema.workflowInstanceStepRole,
			eq(schema.workflowInstanceStepTargetGroup.stepRoleId, schema.workflowInstanceStepRole.id),
		)
		.innerJoin(schema.role, eq(schema.workflowInstanceStepRole.roleId, schema.role.id))
		.innerJoin(
			schema.workflowInstanceStep,
			eq(schema.workflowInstanceStepRole.stepId, schema.workflowInstanceStep.id),
		)
		.innerJoin(
			schema.workflowInstance,
			eq(schema.workflowInstanceStep.instanceId, schema.workflowInstance.id),
		)
		.innerJoin(schema.event, eq(schema.workflowInstance.eventId, schema.event.id))
		.where(
			and(
				eq(schema.userRole.userId, userId),
				eq(schema.userRole.isActive, true),
				isNull(schema.userRole.deletedAt),
				eq(schema.workflowInstanceStepAssignment.status, "pending"),
				isNull(schema.workflowInstanceStepAssignment.deletedAt),
				inArray(schema.workflowInstanceStep.status, ["active", "blocked"]),
				isNull(schema.workflowInstanceStep.deletedAt),
				eq(schema.workflowInstance.status, "active"),
				isNull(schema.workflowInstance.deletedAt),
			),
		)
		.orderBy(schema.workflowInstanceStepAssignment.createdAt);
});

export const findOwnedAssignments = dbAction(async (assignmentIds: number[], userId: number) => {
	return await db
		.select({
			assignmentId: schema.workflowInstanceStepAssignment.id,
			status: schema.workflowInstanceStepAssignment.status,
			stepId: schema.workflowInstanceStep.id,
		})
		.from(schema.workflowInstanceStepAssignment)
		.innerJoin(
			schema.userRole,
			eq(schema.workflowInstanceStepAssignment.userRoleId, schema.userRole.id),
		)
		.innerJoin(
			schema.workflowInstanceStepTargetGroup,
			eq(
				schema.workflowInstanceStepAssignment.targetGroupId,
				schema.workflowInstanceStepTargetGroup.id,
			),
		)
		.innerJoin(
			schema.workflowInstanceStepRole,
			eq(schema.workflowInstanceStepTargetGroup.stepRoleId, schema.workflowInstanceStepRole.id),
		)
		.innerJoin(
			schema.workflowInstanceStep,
			eq(schema.workflowInstanceStepRole.stepId, schema.workflowInstanceStep.id),
		)
		.where(
			and(
				inArray(schema.workflowInstanceStepAssignment.id, assignmentIds),
				eq(schema.userRole.userId, userId),
				isNull(schema.workflowInstanceStepAssignment.deletedAt),
			),
		);
});

export const respondToAssignments = dbAction(
	async (
		assignmentIds: number[],
		stepIds: number[],
		data: { status: "approved" | "denied"; remarks?: string | undefined },
	) => {
		await db.transaction(async (tx) => {
			await tx
				.update(schema.workflowInstanceStepAssignment)
				.set({
					status: data.status,
					remarks: data.remarks,
					completedAt: sql`now()`,
				})
				.where(inArray(schema.workflowInstanceStepAssignment.id, assignmentIds));

			for (const stepId of stepIds) {
				await resolveStep(tx, stepId);
			}
		});
	},
);

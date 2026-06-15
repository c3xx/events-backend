import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";
import { resolveStep } from "@/modules/event/workflow-instance/progression.js";

export const findPendingEventsForUser = dbAction(async (userId: number) => {
	return await db
		.select({
			id: schema.event.id,
			title: schema.event.title,
			status: schema.event.status,
			startsAt: schema.event.startsAt,
			endsAt: schema.event.endsAt,
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
				isNull(schema.event.deletedAt),
			),
		)
		.groupBy(
			schema.event.id,
			schema.event.title,
			schema.event.status,
			schema.event.startsAt,
			schema.event.endsAt,
		)
		.orderBy(schema.event.startsAt);
});

export const findEventById = dbAction(async (eventId: number) => {
	return await db.query.event.findFirst({
		where: and(eq(schema.event.id, eventId), isNull(schema.event.deletedAt)),
		columns: { id: true },
	});
});

export const findLatestWorkflowInstanceId = dbAction(async (eventId: number) => {
	const latestInstance = await db.query.workflowInstance.findFirst({
		where: and(
			eq(schema.workflowInstance.eventId, eventId),
			isNull(schema.workflowInstance.deletedAt),
		),
		orderBy: (t, { desc }) => [desc(t.createdAt)],
		columns: { id: true },
	});
	return latestInstance?.id ?? null;
});

export const findAssignmentsByWorkflowInstanceId = dbAction(async (instanceId: number) => {
	const rows = await db
		.select({
			assignmentId: schema.workflowInstanceStepAssignment.id,
			status: schema.workflowInstanceStepAssignment.status,
			remarks: schema.workflowInstanceStepAssignment.remarks,
			completedAt: schema.workflowInstanceStepAssignment.completedAt,
			userRoleId: schema.workflowInstanceStepAssignment.userRoleId,
			userId: schema.user.id,
			userFullName: schema.user.fullName,
			roleId: schema.role.id,
			roleName: schema.role.name,
			stepId: schema.workflowInstanceStep.id,
			stepName: schema.workflowInstanceStep.name,
			stepStatus: schema.workflowInstanceStep.status,
			targetGroupId: schema.workflowInstanceStepTargetGroup.id,
			targetGroupDetail: sql<{
				type: "organization" | "venue";
				id: number;
				name: string;
			}>`case
					when ${schema.managedEntity.managedEntityType} = 'organization'
					then (
						select json_build_object('type', ${schema.managedEntity.managedEntityType}, 'id', o.id, 'name', o.name)
						from organization o where o.id = ${schema.managedEntity.refId} limit 1
					)
					when ${schema.managedEntity.managedEntityType} = 'venue'
					then (
						select json_build_object('type', ${schema.managedEntity.managedEntityType}, 'id', v.id, 'name', v.name)
						from venue v where v.id = ${schema.managedEntity.refId} limit 1
					)
					else null
				end`,
		})
		.from(schema.workflowInstanceStepAssignment)
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
			schema.userRole,
			eq(schema.workflowInstanceStepAssignment.userRoleId, schema.userRole.id),
		)
		.innerJoin(schema.user, eq(schema.userRole.userId, schema.user.id))
		.innerJoin(
			schema.managedEntity,
			eq(schema.workflowInstanceStepTargetGroup.managedEntityId, schema.managedEntity.id),
		)
		.where(
			and(
				eq(schema.workflowInstanceStep.instanceId, instanceId),
				isNull(schema.workflowInstanceStepAssignment.deletedAt),
				isNull(schema.workflowInstanceStepTargetGroup.deletedAt),
				isNull(schema.workflowInstanceStepRole.deletedAt),
				isNull(schema.workflowInstanceStep.deletedAt),
				isNull(schema.userRole.deletedAt),
				isNull(schema.user.deletedAt),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.orderBy(
			schema.workflowInstanceStep.id,
			schema.workflowInstanceStepTargetGroup.id,
			schema.workflowInstanceStepAssignment.createdAt,
		);
	return rows.map((r) => ({
		assignmentId: r.assignmentId,
		status: r.status,
		remarks: r.remarks,
		completedAt: r.completedAt,
		userRoleId: r.userRoleId,
		user: {
			id: r.userId,
			fullName: r.userFullName,
		},
		role: {
			id: r.roleId,
			name: r.roleName,
		},
		step: {
			id: r.stepId,
			name: r.stepName,
			status: r.stepStatus,
		},
		targetGroup: {
			id: r.targetGroupId,
			type: r.targetGroupDetail.type,
			organizationId: r.targetGroupDetail.type === "organization" ? r.targetGroupDetail.id : null,
			venueId: r.targetGroupDetail.type === "venue" ? r.targetGroupDetail.id : null,
			name: r.targetGroupDetail.name,
		},
	}));
});

export const findOwnedAssignmentsForEvent = dbAction(
	async (assignmentIds: number[], userId: number, eventId: number) => {
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
			.innerJoin(
				schema.workflowInstance,
				eq(schema.workflowInstanceStep.instanceId, schema.workflowInstance.id),
			)
			.where(
				and(
					inArray(schema.workflowInstanceStepAssignment.id, assignmentIds),
					eq(schema.userRole.userId, userId),
					eq(schema.workflowInstance.eventId, eventId),
					eq(schema.workflowInstance.status, "active"),
					isNull(schema.workflowInstanceStepAssignment.deletedAt),
					isNull(schema.workflowInstanceStepTargetGroup.deletedAt),
					isNull(schema.workflowInstanceStepRole.deletedAt),
					isNull(schema.workflowInstanceStep.deletedAt),
					isNull(schema.workflowInstance.deletedAt),
				),
			);
	},
);

export const respondToAssignments = dbAction(
	async (
		assignmentIds: number[],
		stepId: number,
		data: { status: "approved" | "denied"; remarks?: string | undefined },
	) => {
		await db.transaction(async (tx) => {
			await tx
				.update(schema.workflowInstanceStepAssignment)
				.set({
					status: data.status,
					remarks: data.remarks ?? null,
					completedAt: sql`now()`,
				})
				.where(inArray(schema.workflowInstanceStepAssignment.id, assignmentIds));

			await resolveStep(tx, stepId);
		});
	},
);

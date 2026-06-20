import { and, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";
import { resolveStep } from "./progression.js";

export const findActiveInstance = dbAction(async (eventId: number) => {
	return await db.query.workflowInstance.findFirst({
		where: and(
			eq(schema.workflowInstance.eventId, eventId),
			eq(schema.workflowInstance.status, "active"),
			isNull(schema.workflowInstance.deletedAt),
		),
		columns: { id: true },
	});
});

// Recursively find all managed entities related to given organizations.
export const findAncestorOrganizationManagedEntities = dbAction(
	async (organizationIds: number[]) => {
		if (organizationIds.length === 0) return [];

		const rows = await db.execute<{ managed_entity_id: string; type_ref_id: number }>(sql`
			WITH RECURSIVE ancestors AS (
				SELECT id, parent_organization_id, organization_type_id
				FROM organization
				WHERE id = ANY(${`{${organizationIds.join(",")}}`}::int[])
				  AND deleted_at IS NULL
				UNION ALL
				SELECT o.id, o.parent_organization_id, o.organization_type_id
				FROM organization o
				INNER JOIN ancestors a ON o.id = a.parent_organization_id
				WHERE o.deleted_at IS NULL
			)
			SELECT me.id AS managed_entity_id, anc.organization_type_id AS type_ref_id
			FROM ancestors anc
			INNER JOIN managed_entity me
			  ON me.ref_id = anc.id
			 AND me.managed_entity_type = 'organization'
			 AND me.deleted_at IS NULL
		`);

		return rows.rows.map((r) => ({
			managedEntityId: Number(r.managed_entity_id),
			managedEntityType: "organization" as const,
			typeRefId: r.type_ref_id,
		}));
	},
);

export const findVenueManagedEntityIds = dbAction(async (venueIds: number[]) => {
	if (venueIds.length === 0) return [];
	const rows = await db
		.select({
			id: schema.managedEntity.id,
			typeRefId: schema.venue.venueTypeId,
		})
		.from(schema.managedEntity)
		.innerJoin(schema.venue, eq(schema.managedEntity.refId, schema.venue.id))
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, "venue"),
				inArray(schema.managedEntity.refId, venueIds),
				isNull(schema.managedEntity.deletedAt),
			),
		);
	return rows.map((r) => ({
		managedEntityId: r.id,
		managedEntityType: "venue" as const,
		typeRefId: r.typeRefId,
	}));
});

export const insertWorkflowInstance = dbAction(
	async (data: {
		eventId: number;
		submittedBy: number;
		steps: {
			name: string;
			roles: {
				roleId: number;
				targetGroupApprovalCriteria: WorkflowTargetGroupApprovalCriteria;
				targetGroups: {
					managedEntityId: number;
					userRoleIds: number[];
				}[];
			}[];
		}[];
	}) => {
		return await db.transaction(async (tx) => {
			const [instance] = await tx
				.insert(schema.workflowInstance)
				.values({
					eventId: data.eventId,
					submittedBy: data.submittedBy,
					status: "active",
				})
				.returning({ id: schema.workflowInstance.id });
			if (instance == null) unreachable();

			await tx
				.update(schema.event)
				.set({ status: "pending" })
				.where(eq(schema.event.id, data.eventId));

			const insertedSteps = await tx
				.insert(schema.workflowInstanceStep)
				.values(
					data.steps.map((step) => ({
						instanceId: instance.id,
						name: step.name,
						status: "pending" as const,
						nextStepId: null,
					})),
				)
				.returning({ id: schema.workflowInstanceStep.id });

			if (insertedSteps.length !== data.steps.length) return unreachable();

			if (insertedSteps.length > 1) {
				const sqlChunks: SQL[] = [];
				const ids: number[] = [];

				sqlChunks.push(sql`(case`);

				for (let i = 0; i < insertedSteps.length - 1; i++) {
					const current = insertedSteps[i];
					const next = insertedSteps[i + 1];
					if (current == null || next == null) unreachable();
					sqlChunks.push(
						sql`when ${schema.workflowInstanceStep.id} = ${current.id} then ${next.id}`,
					);
					ids.push(current.id);
				}

				sqlChunks.push(sql`end)`);

				await tx
					.update(schema.workflowInstanceStep)
					.set({
						nextStepId: sql`
							(${sql.join(sqlChunks, sql.raw(" "))})::bigint
						`,
					})
					.where(inArray(schema.workflowInstanceStep.id, ids));
			}

			const firstStep = insertedSteps[0];
			if (firstStep == null) return unreachable();

			await tx
				.update(schema.workflowInstance)
				.set({ initialStepId: firstStep.id })
				.where(eq(schema.workflowInstance.id, instance.id));

			await tx
				.update(schema.workflowInstanceStep)
				.set({ status: "active" })
				.where(eq(schema.workflowInstanceStep.id, firstStep.id));

			for (let i = 0; i < data.steps.length; i++) {
				const step = data.steps[i];
				const insertedStep = insertedSteps[i];
				if (step == null || insertedStep == null) return unreachable();

				const insertedRoles = await tx
					.insert(schema.workflowInstanceStepRole)
					.values(
						step.roles.map((role) => ({
							stepId: insertedStep.id,
							roleId: role.roleId,
							targetGroupApprovalCriteria: role.targetGroupApprovalCriteria,
						})),
					)
					.returning({ id: schema.workflowInstanceStepRole.id });

				if (insertedRoles.length !== step.roles.length) return unreachable();

				for (let j = 0; j < step.roles.length; j++) {
					const role = step.roles[j];
					const insertedRole = insertedRoles[j];
					if (role == null || insertedRole == null) return unreachable();
					if (role.targetGroups.length === 0) {
						continue;
					}
					const insertedGroups = await tx
						.insert(schema.workflowInstanceStepTargetGroup)
						.values(
							role.targetGroups.map((group) => ({
								stepRoleId: insertedRole.id,
								managedEntityId: group.managedEntityId,
							})),
						)
						.returning({ id: schema.workflowInstanceStepTargetGroup.id });

					if (insertedGroups.length !== role.targetGroups.length) return unreachable();

					const allAssignments = role.targetGroups.flatMap((group, i) => {
						const insertedGroup = insertedGroups[i];
						if (insertedGroup == null) return unreachable();
						return group.userRoleIds.map((userRoleId) => ({
							targetGroupId: insertedGroup.id,
							userRoleId,
							status: "pending" as const,
						}));
					});

					if (allAssignments.length > 0) {
						await tx.insert(schema.workflowInstanceStepAssignment).values(allAssignments);
					}
				}
			}

			await resolveStep(tx, firstStep.id);

			return { id: instance.id };
		});
	},
);

export const getAllWorkflowInstances = dbAction(async (eventId: number) => {
	return await db.query.workflowInstance.findMany({
		where: and(
			eq(schema.workflowInstance.eventId, eventId),
			isNull(schema.workflowInstance.deletedAt),
		),
		orderBy: (t, { desc }) => [desc(t.createdAt)],
		columns: {
			id: true,
			createdAt: true,
			initialStepId: true,
			status: true,
			completedAt: true,
			eventId: true,
			submittedBy: true,
		},
	});
});

export const abortWorkflowInstance = dbAction(async (instanceId: number, eventId: number) => {
	await db.transaction(async (tx) => {
		await tx
			.update(schema.workflowInstance)
			.set({ status: "aborted", completedAt: sql`now()` })
			.where(
				and(eq(schema.workflowInstance.id, instanceId), isNull(schema.workflowInstance.deletedAt)),
			);

		await tx
			.update(schema.workflowInstanceStep)
			.set({ status: "skipped", completedAt: sql`now()` })
			.where(
				and(
					eq(schema.workflowInstanceStep.instanceId, instanceId),
					inArray(schema.workflowInstanceStep.status, ["pending", "active", "blocked"]),
					isNull(schema.workflowInstanceStep.deletedAt),
				),
			);

		await tx
			.update(schema.workflowInstanceStepAssignment)
			.set({ status: "skipped", completedAt: sql`now()` })
			.where(
				and(
					eq(schema.workflowInstanceStepAssignment.status, "pending"),
					isNull(schema.workflowInstanceStepAssignment.deletedAt),
					inArray(
						schema.workflowInstanceStepAssignment.targetGroupId,
						tx
							.select({ id: schema.workflowInstanceStepTargetGroup.id })
							.from(schema.workflowInstanceStepTargetGroup)
							.innerJoin(
								schema.workflowInstanceStepRole,
								eq(
									schema.workflowInstanceStepTargetGroup.stepRoleId,
									schema.workflowInstanceStepRole.id,
								),
							)
							.innerJoin(
								schema.workflowInstanceStep,
								eq(schema.workflowInstanceStepRole.stepId, schema.workflowInstanceStep.id),
							)
							.where(
								and(
									eq(schema.workflowInstanceStep.instanceId, instanceId),
									isNull(schema.workflowInstanceStepTargetGroup.deletedAt),
									isNull(schema.workflowInstanceStepRole.deletedAt),
									isNull(schema.workflowInstanceStep.deletedAt),
								),
							),
					),
				),
			);

		await tx
			.update(schema.event)
			.set({ status: "draft" })
			.where(and(eq(schema.event.id, eventId), isNull(schema.event.deletedAt)));
	});
});

const WORKFLOW_INSTANCE_COLUMNS = sql`
    wi.id                               AS instance_id,
    wi.created_at                       AS instance_created_at,
    wi.initial_step_id                  AS instance_initial_step_id,
    wi.status                           AS instance_status,
    wi.completed_at                     AS instance_completed_at,
    wi.event_id                         AS instance_event_id,
    wi.submitted_by                     AS instance_submitted_by,
    wis.id                              AS step_id,
    wis.name                            AS step_name,
    wis.status                          AS step_status,
    wis.next_step_id                    AS step_next_step_id,
    wisr.id                             AS step_role_id,
    wisr.role_id                        AS step_role_role_id,
    wisr.target_group_approval_criteria AS step_role_criteria,
    wistg.id                            AS target_group_id,
    wistg.managed_entity_id             AS target_group_managed_entity_id,
    wisa.id                             AS assignment_id,
    wisa.status                         AS assignment_status,
    wisa.completed_at                   AS assignment_completed_at,
    ur.id                               AS user_role_id,
    u.id                                AS user_id,
    u.full_name                         AS user_full_name,
    r.id                                AS role_id,
    r.name                              AS role_name
`;

const WORKFLOW_INSTANCE_JOINS = sql`
    LEFT JOIN workflow_instance_step wis
        ON wis.instance_id = wi.id
        AND wis.deleted_at IS NULL
    LEFT JOIN workflow_instance_step_role wisr
        ON wisr.step_id = wis.id
        AND wisr.deleted_at IS NULL
    LEFT JOIN workflow_instance_step_target_group wistg
        ON wistg.step_role_id = wisr.id
        AND wistg.deleted_at IS NULL
    LEFT JOIN workflow_instance_step_assignment wisa
        ON wisa.target_group_id = wistg.id
        AND wisa.deleted_at IS NULL
    LEFT JOIN user_role ur
        ON ur.id = wisa.user_role_id
        AND ur.deleted_at IS NULL
    LEFT JOIN "user" u
        ON u.id = ur.user_id
    LEFT JOIN role r
        ON r.id = ur.role_id
        AND r.deleted_at IS NULL
`;

//No dbAction since this is an internal function that is only used by other dbActions
async function fetchWorkflowInstanceRows(whereClause: SQL): Promise<InstanceRow[]> {
	const result = await db.execute<InstanceRow>(sql`
        SELECT ${WORKFLOW_INSTANCE_COLUMNS}
        FROM workflow_instance wi
        ${WORKFLOW_INSTANCE_JOINS}
        WHERE ${whereClause}
    `);
	return result.rows;
}

export const getLatestWorkflowInstance = dbAction(async (eventId: number) => {
	const rows = await fetchWorkflowInstanceRows(sql`
        wi.event_id = ${eventId}
        AND wi.deleted_at IS NULL
        AND wi.id = (
            SELECT id FROM workflow_instance
            WHERE event_id = ${eventId}
              AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
        )
    `);
	return rows;
});

export const getWorkflowInstance = dbAction(async (eventId: number, workflowInstanceId: number) => {
	const rows = await fetchWorkflowInstanceRows(sql`
        wi.event_id = ${eventId}
        AND wi.id = ${workflowInstanceId}
        AND wi.deleted_at IS NULL
    `);
	return rows;
});

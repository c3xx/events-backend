import { and, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

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
//Recursively find all managed entities related to given organizations.
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
					.set({ nextStepId: sql.join(sqlChunks, sql.raw(" ")) })
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

					for (const group of role.targetGroups) {
						const [insertedGroup] = await tx
							.insert(schema.workflowInstanceStepTargetGroup)
							.values({
								stepRoleId: insertedRole.id,
								managedEntityId: group.managedEntityId,
							})
							.returning({ id: schema.workflowInstanceStepTargetGroup.id });
						if (insertedGroup == null) return unreachable();

						if (group.userRoleIds.length > 0) {
							await tx.insert(schema.workflowInstanceStepAssignment).values(
								group.userRoleIds.map((userRoleId) => ({
									targetGroupId: insertedGroup.id,
									userRoleId,
									status: "pending" as const,
								})),
							);
						}
					}
				}
			}

			return { id: instance.id };
		});
	},
);

export const getLatestWorkflowInstance = dbAction(async (eventId: number) => {
	return await db.query.workflowInstance.findFirst({
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
		with: workflowInstanceWith,
	});
});

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

export const getWorkflowInstance = dbAction(async (eventId: number, workflowInstanceId: number) => {
	return await db.query.workflowInstance.findFirst({
		where: and(
			eq(schema.workflowInstance.eventId, eventId),
			eq(schema.workflowInstance.id, workflowInstanceId),
			isNull(schema.workflowInstance.deletedAt),
		),
		columns: {
			id: true,
			createdAt: true,
			initialStepId: true,
			status: true,
			completedAt: true,
			eventId: true,
			submittedBy: true,
		},
		with: workflowInstanceWith,
	});
});

const workflowInstanceWith = {
	steps: {
		columns: {
			id: true,
			name: true,
			status: true,
			nextStepId: true,
		},
		with: {
			stepRoles: {
				columns: {
					id: true,
					roleId: true,
					targetGroupApprovalCriteria: true,
				},
				with: {
					targetGroups: {
						columns: {
							id: true,
							managedEntityId: true,
						},
						with: {
							assignments: {
								columns: {
									id: true,
									status: true,
									completedAt: true,
								},
								with: {
									userRole: {
										columns: {
											id: true,
										},
										with: {
											role: {
												columns: {
													id: true,
													name: true,
												},
											},
											user: {
												columns: {
													id: true,
													fullName: true,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
} as const;

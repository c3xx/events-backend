import { and, eq, inArray, isNull, sql } from "drizzle-orm";
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

export const findAncestorOrganizationManagedEntities = dbAction(
	async (organizationIds: number[]) => {
		if (organizationIds.length === 0) return [];

		const rows = await db.execute<{ managed_entity_id: number }>(
			sql`
                WITH RECURSIVE ancestors AS (
                    SELECT id, parent_organization_id
                    FROM organization
                    WHERE id = ANY(${organizationIds})
                      AND deleted_at IS NULL
                    UNION ALL
                    SELECT o.id, o.parent_organization_id
                    FROM organization o
                    INNER JOIN ancestors a ON o.id = a.parent_organization_id
                    WHERE o.deleted_at IS NULL
                )
                SELECT me.id AS managed_entity_id
                FROM ancestors anc
                INNER JOIN managed_entity me
                  ON me.ref_id = anc.id
                 AND me.managed_entity_type = 'organization'
                 AND me.deleted_at IS NULL
            `,
		);

		return rows.rows.map((r) => r.managed_entity_id);
	},
);

export const findVenueManagedEntityIds = dbAction(async (venueIds: number[]) => {
	if (venueIds.length === 0) return [];
	const rows = await db
		.select({ id: schema.managedEntity.id })
		.from(schema.managedEntity)
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, "venue"),
				inArray(schema.managedEntity.refId, venueIds),
				isNull(schema.managedEntity.deletedAt),
			),
		);
	return rows.map((r) => r.id);
});

export const findManagedEntityMetadata = dbAction(async (managedEntityIds: number[]) => {
	if (!managedEntityIds.length) {
		return [];
	}

	const organizationRows = await db
		.select({
			managedEntityId: schema.managedEntity.id,
			managedEntityType: schema.managedEntity.managedEntityType,
			typeRefId: schema.organization.organizationTypeId,
		})
		.from(schema.managedEntity)
		.innerJoin(schema.organization, eq(schema.managedEntity.refId, schema.organization.id))
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, "organization"),
				inArray(schema.managedEntity.id, managedEntityIds),
				isNull(schema.managedEntity.deletedAt),
			),
		);

	const venueRows = await db
		.select({
			managedEntityId: schema.managedEntity.id,
			managedEntityType: schema.managedEntity.managedEntityType,
			typeRefId: schema.venue.venueTypeId,
		})
		.from(schema.managedEntity)
		.innerJoin(schema.venue, eq(schema.managedEntity.refId, schema.venue.id))
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, "venue"),
				inArray(schema.managedEntity.id, managedEntityIds),
				isNull(schema.managedEntity.deletedAt),
			),
		);

	return [...organizationRows, ...venueRows];
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

			if (data.steps.length === 0) return { id: instance.id };

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

			for (let i = 0; i < insertedSteps.length - 1; i++) {
				const current = insertedSteps[i];
				const next = insertedSteps[i + 1];
				if (current == null || next == null) unreachable();
				await tx
					.update(schema.workflowInstanceStep)
					.set({ nextStepId: next.id })
					.where(eq(schema.workflowInstanceStep.id, current.id));
			}

			for (let i = 0; i < data.steps.length; i++) {
				const step = data.steps[i];
				const insertedStep = insertedSteps[i];
				if (step == null || insertedStep == null) return unreachable();

				for (const role of step.roles) {
					const [insertedRole] = await tx
						.insert(schema.workflowInstanceStepRole)
						.values({
							stepId: insertedStep.id,
							roleId: role.roleId,
							targetGroupApprovalCriteria: role.targetGroupApprovalCriteria,
						})
						.returning({ id: schema.workflowInstanceStepRole.id });
					if (insertedRole == null) return unreachable();

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
		with: {
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
		},
	});
});

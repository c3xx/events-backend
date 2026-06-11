import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const insert = dbAction(
	async (
		templateId: number,
		data: {
			name: string;
			previousStepId: number | null | undefined;
			templateInitialStepId: number | null;
		},
	) => {
		const inserted = await db.transaction(async (tx) => {
			const [inserted] = await tx
				.insert(schema.workflowTemplateStep)
				.values({
					name: data.name,
					templateId: templateId,
					nextStepId: data.previousStepId == null ? data.templateInitialStepId : null,
				})
				.returning({ id: schema.workflowTemplateStep.id });

			if (inserted == null) unreachable();

			let nextStepId: number | null = null;

			// if thats the initial step
			if (data.previousStepId == null) {
				const updated = await tx
					.update(schema.workflowTemplate)
					.set({ initialStepId: inserted.id })
					.where(
						and(
							eq(schema.workflowTemplate.id, templateId),
							isNull(schema.workflowTemplate.deletedAt),
						),
					);

				if (updated.rowCount !== 1) {
					unreachable();
				}
			} else {
				const previousStepFilter = and(
					eq(schema.workflowTemplateStep.id, data.previousStepId),
					eq(schema.workflowTemplateStep.templateId, templateId),
					isNull(schema.workflowTemplateStep.deletedAt),
				);

				const [previousStep] = await tx
					.select({ nextStepId: schema.workflowTemplateStep.nextStepId })
					.from(schema.workflowTemplateStep)
					.where(previousStepFilter);

				// update previous step's next step to point to the just created one
				await tx
					.update(schema.workflowTemplateStep)
					.set({ nextStepId: inserted.id })
					.where(previousStepFilter);

				// update the just created one next to point to prev's old next

				// (needed only if it wasn't the last one)
				if (previousStep?.nextStepId != null) {
					nextStepId = previousStep.nextStepId;

					await tx
						.update(schema.workflowTemplateStep)
						.set({ nextStepId: previousStep.nextStepId })
						.where(
							and(
								eq(schema.workflowTemplateStep.id, inserted.id),
								eq(schema.workflowTemplateStep.templateId, templateId),
								isNull(schema.workflowTemplateStep.deletedAt),
							),
						);
				}
			}

			return {
				id: inserted.id,
				nextStepId: nextStepId,
			};
		});

		return inserted;
	},
);

// export const findMany = dbAction(async (templateId: number) => {
// 	return await db
// 		.select({
// 			id: schema.workflowTemplateStep.id,
// 			name: schema.workflowTemplateStep.name,
// 			nextStepId: schema.workflowTemplateStep.nextStepId,
// 		})
// 		.from(schema.workflowTemplateStep)
// 		.where(
// 			and(
// 				eq(schema.workflowTemplateStep.templateId, templateId),
// 				isNull(schema.workflowTemplateStep.deletedAt),
// 			),
// 		);
// });

export const findById = dbAction(async (templateId: number, stepId: number) => {
	return await db.query.workflowTemplateStep.findFirst({
		where: and(
			eq(schema.workflowTemplateStep.templateId, templateId),
			eq(schema.workflowTemplateStep.id, stepId),
			isNull(schema.workflowTemplateStep.deletedAt),
		),
		columns: {
			id: true,
			name: true,
			nextStepId: true,
		},
		with: {
			stepRoles: {
				where: isNull(schema.workflowTemplateStepRole.deletedAt),
				columns: { targetGroupApprovalCriteria: true },
				with: {
					role: {
						columns: {
							id: true,
							name: true,
						},
						extras: {
							scope: sql<{
								// note: null intentionally not handled because, critical system change
								type: "organization" | "venue";
								kindId: number;
								kindName: string;
							}>`case
								when ${schema.role.managedEntityType} = 'organization'
								then (
									select json_build_object('type', ${schema.role.managedEntityType}, 'kindId', ot.id, 'kindName', ot.name)
									from organization_type ot where ot.id = ${schema.role.typeRefId} limit 1
								)
								when ${schema.role.managedEntityType} = 'venue'
								then (
									select json_build_object('type', ${schema.role.managedEntityType}, 'kindId', vt.id, 'kindName', vt.name)
									from venue_type vt where vt.id = ${schema.role.typeRefId} limit 1
								)
								else null
							end`.as("scope"),
						},
					},
				},
			},
		},
	});
});

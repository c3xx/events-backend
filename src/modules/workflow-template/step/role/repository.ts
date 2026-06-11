import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";

// export const findMany = dbAction(async (stepId: number) => {
// 	return await db
// 		.select({
// 			role: {
// 				id: schema.role.id,
// 				name: schema.role.name,
// 			},
// 			targetGroupApprovalCriteria: schema.workflowTemplateStepRole.targetGroupApprovalCriteria,
// 		})
// 		.from(schema.workflowTemplateStepRole)
// 		.innerJoin(schema.role, eq(schema.workflowTemplateStepRole.roleId, schema.role.id))
// 		.where(
// 			and(
// 				eq(schema.workflowTemplateStepRole.stepId, stepId),
// 				isNull(schema.workflowTemplateStepRole.deletedAt),
// 				isNull(schema.role.deletedAt),
// 			),
// 		);
// });

// export const findById = dbAction(async (stepId: number, roleId: number) => {
// 	const [found] = await db
// 		.select({
// 			role: {
// 				id: schema.role.id,
// 				name: schema.role.name,
// 			},
// 			targetGroupApprovalCriteria: schema.workflowTemplateStepRole.targetGroupApprovalCriteria,
// 		})
// 		.from(schema.workflowTemplateStepRole)
// 		.innerJoin(schema.role, eq(schema.workflowTemplateStepRole.roleId, schema.role.id))
// 		.where(
// 			and(
// 				eq(schema.workflowTemplateStepRole.stepId, stepId),
// 				eq(schema.workflowTemplateStepRole.roleId, roleId),
// 				isNull(schema.role.deletedAt),
// 				isNull(schema.workflowTemplateStepRole.deletedAt),
// 			),
// 		);

// 	return found;
// });

export const assign = dbAction(
	async (
		stepId: number,
		data: {
			roleId: number;
			targetGroupApprovalCriteria: WorkflowTargetGroupApprovalCriteria;
		},
	) => {
		await db.insert(schema.workflowTemplateStepRole).values({
			stepId: stepId,
			roleId: data.roleId,
			targetGroupApprovalCriteria: data.targetGroupApprovalCriteria,
		});
	},
);

export const unassign = dbAction(async (stepId: number, roleId: number) => {
	await db
		.update(schema.workflowTemplateStepRole)
		.set({ deletedAt: sql`now()` })
		.where(
			and(
				eq(schema.workflowTemplateStepRole.stepId, stepId),
				eq(schema.workflowTemplateStepRole.roleId, roleId),
				isNull(schema.workflowTemplateStepRole.deletedAt),
			),
		);
});

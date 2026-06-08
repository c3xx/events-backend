import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const insert = dbAction(async (data: { name: string }) => {
	const [inserted] = await db
		.insert(schema.workflowTemplate)
		.values({
			name: data.name,
		})
		.returning({
			id: schema.workflowTemplate.id,
		});

	if (inserted == null) unreachable();

	return inserted;
});

export const findMany = dbAction(async () => {
	return await db
		.select({
			id: schema.workflowTemplate.id,
			name: schema.workflowTemplate.name,
		})
		.from(schema.workflowTemplate)
		.where(isNull(schema.workflowTemplate.deletedAt));
});

export const findById = dbAction(async (id: number) => {
	return await db.query.workflowTemplate.findFirst({
		where: and(eq(schema.workflowTemplate.id, id), isNull(schema.workflowTemplate.deletedAt)),
		columns: {
			id: true,
			name: true,
			initialStepId: true,
		},
		with: {
			steps: {
				where: isNull(schema.workflowTemplateStep.deletedAt),
				columns: {
					id: true,
					name: true,
					nextStepId: true,
				},
			},
		},
	});
});

export const findByIdWithRoles = dbAction(async (id: number) => {
	return db.query.workflowTemplate.findFirst({
		where: and(eq(schema.workflowTemplate.id, id), isNull(schema.workflowTemplate.deletedAt)),
		columns: {
			id: true,
			initialStepId: true,
		},
		with: {
			steps: {
				columns: {
					id: true,
					name: true,
					nextStepId: true,
				},
				where: isNull(schema.workflowTemplateStep.deletedAt),
				with: {
					stepRoles: {
						columns: {
							targetGroupApprovalCriteria: true,
						},
						where: isNull(schema.workflowTemplateStepRole.deletedAt),
						with: {
							role: {
								columns: {
									id: true,
									managedEntityType: true,
									typeRefId: true,
								},
							},
						},
					},
				},
			},
		},
	});
});

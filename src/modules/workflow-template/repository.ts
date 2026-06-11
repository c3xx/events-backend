import { and, eq, isNull, sql } from "drizzle-orm";
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
				with: {
					stepRoles: {
						where: isNull(schema.workflowTemplateStepRole.deletedAt),
						columns: {
							targetGroupApprovalCriteria: true,
						},
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
			},
		},
	});
});

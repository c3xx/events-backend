import z from "zod";
import { WORKFLOW_TARGET_GROUP_APPROVAL_CRITERIA } from "@/lib/constants.js";
import { idLike } from "@/lib/helpers.js";

export const stepRoleScopedSchema = z
	.object({
		roleId: idLike("Invalid workflow template step role ID"),
	})
	.strict();

export const assignRoleToWorkflowTemplateStepSchema = z.object({
	roleId: z.coerce.number({ error: "Invalid role ID" }).int({ error: "Invalid role ID" }),
	targetGroupApprovalCriteria: z.enum(WORKFLOW_TARGET_GROUP_APPROVAL_CRITERIA, {
		error: "Invalid target group approval criteria",
	}),
});

export type AssignRoleToWorkflowTemplateStepSchema = z.output<
	typeof assignRoleToWorkflowTemplateStepSchema
>;

import { ConflictError } from "@/lib/errors.js";
import type { WorkflowTemplateStepScope } from "@/modules/workflow-template/scopes.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getAllWorkflowTemplateStepRoles(
	templateStep: WorkflowTemplateStepScope["templateStep"],
) {
	return templateStep.stepRoles;
}

export async function assignRoleToWorkflowTemplateStep(
	templateStep: WorkflowTemplateStepScope["templateStep"],
	input: schemas.AssignRoleToWorkflowTemplateStepSchema,
) {
	const stepRoleWithRoleId = templateStep.stepRoles.find((stepRole) => {
		return stepRole.role.id === input.roleId;
	});
	if (stepRoleWithRoleId != null)
		throw new ConflictError("Same role already exists in the template step", stepRoleWithRoleId);

	await repository.assign(templateStep.id, {
		roleId: input.roleId,
		targetGroupApprovalCriteria: input.targetGroupApprovalCriteria,
	});
}

export async function unassignRoleFromWorkflowTemplateStep(stepId: number, roleId: number) {
	await repository.unassign(stepId, roleId);
}

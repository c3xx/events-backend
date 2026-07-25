import { ConflictError, NotFoundError } from "@/lib/errors.js";
import type { WorkflowTemplateScope, WorkflowTemplateStepScope } from "../scopes.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getWorkflowTemplateStep(step: WorkflowTemplateStepScope["templateStep"]) {
	return step;
}

export async function getAllWorkflowTemplateSteps(template: WorkflowTemplateScope["template"]) {
	return template.steps;
}

export async function createWorkflowTemplateStep(
	template: WorkflowTemplateScope["template"],
	input: schemas.CreateWorkflowTemplateStepSchema,
) {
	const templateNameLowercased = input.name.toLowerCase();
	const templateWithTheSameName = template.steps.find((step) => {
		return step.name.toLowerCase() === templateNameLowercased;
	});
	if (templateWithTheSameName != null) {
		throw new ConflictError(
			"There is a step in the template with the same name",
			templateWithTheSameName,
		);
	}

	return await repository.insert(template.id, {
		name: input.name,
		previousStepId: input.previousStepId,
		templateInitialStepId: template.initialStepId,
	});
}

export async function updateWorkflowTemplateStep(
	template: WorkflowTemplateScope["template"],
	step: WorkflowTemplateStepScope["templateStep"],
	input: schemas.UpdateWorkflowTemplateStepSchema,
) {
	const templateNameLowercased = input.name.toLowerCase();
	const templateWithTheSameName = template.steps.find((s) => {
		return s.id !== step.id && s.name.toLowerCase() === templateNameLowercased;
	});
	if (templateWithTheSameName != null) {
		throw new ConflictError(
			"There is a step in the template with the same name",
			templateWithTheSameName,
		);
	}

	const updated = await repository.update(step.id, { name: input.name });
	if (updated == null) throw new NotFoundError("Workflow template step not found");
	return updated;
}

export async function deleteWorkflowTemplateStep(
	template: WorkflowTemplateScope["template"],
	step: WorkflowTemplateStepScope["templateStep"],
) {
	const deleted = await repository.softDelete(template.id, step.id);
	if (deleted == null) throw new NotFoundError("Workflow template step not found");
}

import { ConflictError } from "@/lib/errors.js";
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
	const templateWithTheSameName = template.steps.find(
		(step) => step.name.toLowerCase() === input.name.toLowerCase(),
	);
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

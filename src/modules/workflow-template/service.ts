import * as repository from "./repository.js";
import type * as schemas from "./schema.js";
import type { WorkflowTemplateScope } from "./scopes.js";

export async function getWorkflowTemplate(template: WorkflowTemplateScope["template"]) {
	return {
		id: template.id,
		name: template.name,
		steps: template.steps.map((step) => ({
			id: step.id,
			name: step.name,
		})),
	};
}

export async function getAllWorkflowTemplates() {
	return await repository.findMany();
}

export async function createWorkflowTemplate(input: schemas.CreateWorkflowTemplateSchema) {
	return await repository.insert({
		name: input.name,
	});
}

import { ConflictError, NotFoundError } from "@/lib/errors.js";
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

export async function updateWorkflowTemplate(
	template: WorkflowTemplateScope["template"],
	input: schemas.UpdateWorkflowTemplateSchema,
) {
	const updated = await repository.updateWorkflowTemplate(template.id, {
		name: input.name,
	});
	if (updated == null) throw new NotFoundError("Workflow template not found");
	return updated;
}

export async function deleteWorkflowTemplate(template: WorkflowTemplateScope["template"]) {
	const eventTypes = await repository.findEventTypesUsingTemplate(template.id);
	if (eventTypes.length > 0) {
		throw new ConflictError(
			"Cannot delete workflow template because it is currently assigned to one or more active event types",
		);
	}

	const deleted = await repository.softDeleteWorkflowTemplate(template.id);
	if (deleted == null) throw new NotFoundError("Workflow template not found");
}

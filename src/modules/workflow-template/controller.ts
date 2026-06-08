import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import type { WorkflowTemplateScope } from "./scopes.js";
import * as service from "./service.js";

export const getAllWorkflowTemplates: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (_req, res) => {
	const result = await service.getAllWorkflowTemplates();
	return ok(res, result);
};

export const getWorkflowTemplate: ScopedApiRequestHandler<
	WorkflowTemplateScope,
	{
		id: number;
		name: string;
		steps: {
			id: number;
			name: string;
		}[];
	}
> = async (_req, res) => {
	const result = await service.getWorkflowTemplate(res.locals.template);
	return ok(res, result);
};

export const createWorkflowTemplate: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = schemas.createWorkflowTemplateSchema.parse(req.body);
	const result = await service.createWorkflowTemplate(body);
	return ok(res, result);
};

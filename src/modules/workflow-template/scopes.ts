import { NotFoundError } from "@/lib/errors.js";
import { idLike, orderWorkflowSteps, scopedParamHandler, unreachable } from "@/lib/helpers.js";
import * as templateRepository from "@/modules/workflow-template/repository.js";
import * as templateStepRepository from "@/modules/workflow-template/step/repository.js";

export type WorkflowTemplateScope = {
	template: {
		id: number;
		name: string;
		initialStepId: number | null;
		steps: {
			id: number;
			name: string;
			nextStepId: number | null;
			stepRoles: {
				targetGroupApprovalCriteria: "any" | "all";
				role: {
					id: number;
					name: string;
					scope: {
						type: "organization" | "venue";
						kindId: number;
						kindName: string;
					};
				};
			}[];
		}[];
	};
};

export const templateIdParamHandler = scopedParamHandler<WorkflowTemplateScope, number>(
	idLike("Invalid workflow template ID"),
	async (_req, res, _next, templateId) => {
		const template = await templateRepository.findById(templateId);
		if (template == null) throw new NotFoundError("Could not find the workflow template");
		res.locals.template = {
			id: template.id,
			name: template.name,
			initialStepId: template.initialStepId,
			steps: orderWorkflowSteps(template.steps, template.initialStepId),
		};
	},
);

export type WorkflowTemplateStepScope = WorkflowTemplateScope & {
	templateStep: {
		id: number;
		name: string;
		nextStepId: number | null;
		stepRoles: {
			targetGroupApprovalCriteria: WorkflowTargetGroupApprovalCriteria;
			role: {
				id: number;
				name: string;
				scope: {
					type: "organization" | "venue";
					kindId: number;
					kindName: string;
				};
			};
		}[];
	};
};

export const stepIdParamHandler = scopedParamHandler<WorkflowTemplateStepScope, number>(
	idLike("Invalid workflow template step ID"),
	async (_req, res, _next, stepId) => {
		if (res.locals.template == null) unreachable();
		const templateStep = await templateStepRepository.findById(res.locals.template.id, stepId);
		if (templateStep == null) throw new NotFoundError("Could not find the workflow template step");
		res.locals.templateStep = templateStep;
	},
);

// note: unused scope resolver because there is only delete route.
// but if there are some other routes in the future, then its alright to uncomment

// export type WorkflowTemplateStepRoleScope = WorkflowTemplateStepScope & {
// 	stepRole: {
// 		role: {
// 			id: number;
// 			name: string;
// 		};
// 		targetGroupApprovalCriteria: WorkflowTargetGroupApprovalCriteria;
// 	};
// };

// export const roleIdParamHandler = scopedParamHandler<WorkflowTemplateStepRoleScope, number>(
// 	idLike("Invalid workflow template step role ID"),
// 	async (_req, res, _next, roleId) => {
// 		if (res.locals.templateStep == null) unreachable();
// 		const stepRole = await templateStepRoleRepository.findById(res.locals.templateStep.id, roleId);
// 		if (stepRole == null) throw new NotFoundError("Could not find the workflow template step role");
// 		res.locals.stepRole = stepRole;
// 	},
// );

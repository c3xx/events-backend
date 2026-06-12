import { NotFoundError } from "@/lib/errors.js";
import { orderWorkflowSteps } from "@/lib/helpers.js";
import type { EventScope } from "../scopes.js";
import * as repository from "./repository.js";

export async function getLatestWorkflowInstance(event: EventScope["event"]) {
	const instance = await repository.getLatestWorkflowInstance(event.id);
	if (instance == null) {
		throw new NotFoundError("No workflow instance found");
	}
	instance.steps = orderWorkflowSteps(instance.steps, instance.initialStepId);
	return instance;
}

export async function getAllWorkflowInstances(event: EventScope["event"]) {
	const instances = await repository.getAllWorkflowInstances(event.id);
	return instances;
}

export async function getWorkflowInstance(event: EventScope["event"], workflowInstanceId: number) {
	const instance = await repository.getWorkflowInstance(event.id, workflowInstanceId);
	if (instance == null) {
		throw new NotFoundError("No workflow instance found");
	}
	instance.steps = orderWorkflowSteps(instance.steps, instance.initialStepId);
	return instance;
}

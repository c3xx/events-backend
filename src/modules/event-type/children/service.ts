import * as repository from "./repository.js";
import type { AllowedParentParamsSchema } from "./schema.js";

export async function getEventTypeChildTypes(parentEventTypeId: number) {
	return await repository.getEventTypeChildTypes(parentEventTypeId);
}

export async function addAllowedChildType(input: AllowedParentParamsSchema) {
	return await repository.addAllowedChildType({
		parentTypeId: input.id,
		childTypeId: input.childId,
	});
}

export async function removeAllowedChildType(input: AllowedParentParamsSchema) {
	return await repository.removeAllowedChildType({
		parentTypeId: input.id,
		childTypeId: input.childId,
	});
}

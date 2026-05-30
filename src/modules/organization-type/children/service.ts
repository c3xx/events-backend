import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getOrganizationTypeChildTypes(organizationTypeId: number) {
	return await repository.getOrganizationTypeChildrenTypes(organizationTypeId);
}

export async function addAllowedChildType(input: schemas.AddAllowedParentParamsSchema) {
	return await repository.addAllowedChildType({
		parentTypeId: input.id,
		childTypeId: input.childId,
	});
}

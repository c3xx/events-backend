import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getOrganizationTypeRoles(organizationId: number) {
	return await repository.getOrganizationTypeRoles(organizationId);
}

export async function createOrganizationTypeRole(
	organizationTypeId: number,
	input: schemas.CreateOrganizationTypeRoleSchema,
) {
	return await repository.createOrganizationTypeRole(organizationTypeId, {
		name: input.name,
	});
}

import * as repository from "./repository.js";
import type * as schemas from "./schema.js";
import type { OrganizationScope } from "./scopes.js";

export async function createOrganization(input: schemas.CreateOrganizationSchema) {
	return await repository.createOrganization({
		name: input.name,
		organizationTypeId: input.organizationTypeId,
		parentOrganizationId: input.parentOrganizationId,
	});
}

export async function getOrganizations() {
	return await repository.getOrganizations();
}

export async function getOrganization(organization: OrganizationScope["organization"]) {
	return {
		id: organization.id,
		name: organization.name,
		type: {
			id: organization.type.id,
			name: organization.type.name,
		},
		parentOrganization:
			organization.parentOrganization != null
				? {
						id: organization.parentOrganization.id,
						name: organization.parentOrganization.name,
						type: {
							id: organization.parentOrganization.type.id,
							name: organization.parentOrganization.type.name,
						},
					}
				: null,

		createdAt: organization.createdAt,
		isActive: organization.isActive,

		organizationTypeId: organization.organizationTypeId,
		parentOrganizationId: organization.parentOrganizationId,
	};
}

import { BadRequestError } from "@/lib/errors.js";
import * as organizationRepository from "@/modules/organization/repository.js";
import type { OrganizationAuthorityHolderScope, OrganizationScope } from "../scopes.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getAllAuthorityHolders(
	subjectOrganization: OrganizationScope["organization"],
) {
	return await repository.findAll(subjectOrganization.id);
}

export async function createAuthorityHolder(
	subjectOrganization: OrganizationScope["organization"],
	input: schemas.CreateAuthorityHolderSchema,
) {
	const holderManagedEntity = await organizationRepository.findOrganizationManagedEntity(
		input.organizationId,
	);
	if (holderManagedEntity == null)
		throw new BadRequestError("Could not find the organization to give authority to");

	return await repository.insert(subjectOrganization.id, input.organizationId);
}

export async function getAuthorityHolder(
	authorityHolder: OrganizationAuthorityHolderScope["authorityHolder"],
) {
	return {
		id: authorityHolder.id,
		organization: {
			id: authorityHolder.organization.id,
			name: authorityHolder.organization.name,
			type: {
				id: authorityHolder.organization.type.id,
				name: authorityHolder.organization.type.name,
			},
		},
		permissions: authorityHolder.permissions.map((permission) => {
			return {
				code: permission.code,
				description: permission.description,
			};
		}),
	};
}

export async function removeAuthorityHolder(
	authorityHolder: OrganizationAuthorityHolderScope["authorityHolder"],
) {
	await repository.remove(authorityHolder.id);
}

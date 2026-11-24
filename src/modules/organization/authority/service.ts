import { BadRequestError } from "@/lib/errors.js";
import * as organizationRepository from "@/modules/organization/repository.js";
import * as authorityRepository from "@/repositories/managed-entity-authority.js";
import type { OrganizationAuthorityHolderScope, OrganizationScope } from "../scopes.js";
import type * as schemas from "./schema.js";

export async function getAllAuthorityHolders(
	subjectOrganization: OrganizationScope["organization"],
) {
	return await authorityRepository.findAllAuthorityHolders({
		subjectType: "organization",
		subjectRefId: subjectOrganization.id,
	});
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

	return await authorityRepository.insertAuthorityRelation({
		holderType: "organization",
		holderRefId: input.organizationId,
		subjectType: "organization",
		subjectRefId: subjectOrganization.id,
	});
}

export async function getAuthorityHolder(
	authorityHolder: OrganizationAuthorityHolderScope["authorityHolder"],
) {
	return {
		id: authorityHolder.id,
		scope: {
			type: authorityHolder.scope.type,
			id: authorityHolder.scope.id,
			name: authorityHolder.scope.name,
			kind: {
				id: authorityHolder.scope.kind.id,
				name: authorityHolder.scope.kind.name,
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
	subjectOrganization: OrganizationScope["organization"],
	authorityHolder: OrganizationAuthorityHolderScope["authorityHolder"],
) {
	await authorityRepository.removeAuthorityRelation({
		subjectType: "organization",
		subjectRefId: subjectOrganization.id,
		authorityId: authorityHolder.id,
	});
}

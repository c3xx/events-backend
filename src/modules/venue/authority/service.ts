import { BadRequestError } from "@/lib/errors.js";
import * as organizationRepository from "@/modules/organization/repository.js";
import * as authorityRepository from "@/repositories/managed-entity-authority.js";
import type { VenueAuthorityHolderScope, VenueScope } from "../scopes.js";
import type * as schemas from "./schema.js";

export async function getAllAuthorityHolders(subjectVenue: VenueScope["venue"]) {
	return await authorityRepository.findAllAuthorityHolders({
		subjectType: "venue",
		subjectRefId: subjectVenue.id,
	});
}

export async function createAuthorityHolder(
	subjectVenue: VenueScope["venue"],
	input: schemas.CreateAuthorityHolderSchema,
) {
	// note: only O-V relationships for now
	const holderManagedEntity = await organizationRepository.findOrganizationManagedEntity(
		input.organizationId,
	);
	if (holderManagedEntity == null)
		throw new BadRequestError("Could not find the organization to give authority to");

	return await authorityRepository.insertAuthorityRelation({
		holderType: "organization",
		holderRefId: input.organizationId,
		subjectType: "venue",
		subjectRefId: subjectVenue.id,
	});
}

export async function getAuthorityHolder(
	authorityHolder: VenueAuthorityHolderScope["authorityHolder"],
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
	subjectVenue: VenueScope["venue"],
	authorityHolder: VenueAuthorityHolderScope["authorityHolder"],
) {
	await authorityRepository.removeAuthorityRelation({
		subjectType: "venue",
		subjectRefId: subjectVenue.id,
		authorityId: authorityHolder.id,
	});
}

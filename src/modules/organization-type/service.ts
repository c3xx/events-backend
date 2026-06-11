import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function getOrganizationTypes() {
	return await repository.getOrganizationTypes();
}

export async function createOrganizationType(input: schemas.CreateOrganizationTypeSchema) {
	return await repository.createOrganizationType({
		name: input.name,
	});
}

export async function getOrganizationType(organizationTypeId: number) {
	const organizationType = await repository.getOrganizationType(organizationTypeId);
	if (organizationType == null) throw new NotFoundError("Could not find the organization type");
	return organizationType;
}

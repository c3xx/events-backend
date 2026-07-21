import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

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

export async function getOrganization(organizationId: number) {
	const organization = await repository.getOrganization(organizationId);
	if (organization == null) throw new NotFoundError("Could not find the organization");
	return organization;
}

export async function updateOrganization(id: number, input: schemas.UpdateOrganizationSchema) {
	const updated = await repository.updateOrganization(id, {
		name: input.name,
		isActive: input.isActive,
	});
	if (updated == null) throw new NotFoundError("Organization not found");
	return updated;
}

export async function deleteOrganization(id: number) {
	const result = await repository.softDeleteOrganization(id);
	if ((result.rowCount ?? 0) === 0) throw new NotFoundError("Organization not found");
}

import { BadRequestError, NotFoundError } from "@/lib/errors.js";
import { isAuthorityPermission, isScopedAuthorityPermission } from "@/lib/helpers.js";
import * as authorityRepository from "@/repositories/managed-entity-authority.js";
import type { OrganizationAuthorityHolderScope } from "../../scopes.js";
import type * as schemas from "./schema.js";

export async function getAuthorityHolderPermissions(
	authorityHolder: OrganizationAuthorityHolderScope["authorityHolder"],
) {
	return authorityHolder.permissions.map((permission) => ({
		code: permission.code,
		description: permission.description,
	}));
}

export async function assignPermissionToAuthorityHolder(
	authorityHolder: OrganizationAuthorityHolderScope["authorityHolder"],
	input: schemas.PermissionCodeInputSchema,
) {
	if (!isAuthorityPermission(input.permissionCode))
		throw new BadRequestError("Invalid permission code");
	if (!isScopedAuthorityPermission(input.permissionCode, "organization", "organization"))
		throw new BadRequestError("This permission can only be assigned to an organization");

	if (authorityHolder.permissions.some((permission) => permission.code === input.permissionCode)) {
		throw new BadRequestError("This permission is already assigned to the authority holder");
	}
	await authorityRepository.assignPermissionToAuthority({
		authorityId: authorityHolder.id,
		permissionCode: input.permissionCode,
	});
}

export async function revokePermissionFromAuthorityHolder(
	authorityHolder: OrganizationAuthorityHolderScope["authorityHolder"],
	input: schemas.PermissionCodeInputSchema,
) {
	if (!isAuthorityPermission(input.permissionCode))
		throw new BadRequestError("Invalid permission code");
	if (!isScopedAuthorityPermission(input.permissionCode, "organization", "organization"))
		throw new BadRequestError("This permission can only be revoked from an organization");

	if (authorityHolder.permissions.every((permission) => permission.code !== input.permissionCode)) {
		throw new BadRequestError("This permission is not assigned to the authority holder");
	}
	const revoked = await authorityRepository.revokePermissionToAuthority({
		authorityId: authorityHolder.id,
		permissionCode: input.permissionCode,
	});
	if (!revoked) throw new NotFoundError("Invalid permission code"); // will never execute unless we mess up the very basic structure of the application, but good to have a definite guard
}

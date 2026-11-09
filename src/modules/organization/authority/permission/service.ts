import { BadRequestError, NotFoundError } from "@/lib/errors.js";
import { isAuthorityPermission } from "@/lib/helpers.js";
import type { OrganizationAuthorityHolderScope } from "../../scopes.js";
import * as repository from "./repository.js";
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
	if (!isAuthorityPermission(input.permissionCode)) {
		throw new BadRequestError("Invalid permission");
	}
	if (authorityHolder.permissions.some((permission) => permission.code === input.permissionCode)) {
		throw new BadRequestError("This permission is already assigned to the authority holder");
	}
	await repository.assign(authorityHolder.id, input.permissionCode);
}

export async function revokePermissionFromAuthorityHolder(
	authorityHolder: OrganizationAuthorityHolderScope["authorityHolder"],
	input: schemas.PermissionCodeInputSchema,
) {
	if (!isAuthorityPermission(input.permissionCode)) {
		throw new BadRequestError("Invalid permission code");
	}
	if (authorityHolder.permissions.every((permission) => permission.code !== input.permissionCode)) {
		throw new BadRequestError("This permission is not assigned to the authority holder");
	}
	const revoked = await repository.revoke(authorityHolder.id, input.permissionCode);
	if (!revoked) throw new NotFoundError("Invalid permission code"); // will never execute unless we mess up the very basic structure of the application, but good to have a definite guard
}

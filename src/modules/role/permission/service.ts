import * as repository from "./repository.js";
import type { SetRolePermissionSchema } from "./schema.js";

export async function getRolePermissions(roleId: number) {
	return await repository.getRolePermissions(roleId);
}

export async function setRolePermissions(roleId: number, input: SetRolePermissionSchema) {
	if (input.permissionIds.length === 0) {
		await repository.deleteAll(roleId);
		return [];
	}

	return await repository.setRolePermissions(roleId, {
		permissionIds: input.permissionIds,
	});
}

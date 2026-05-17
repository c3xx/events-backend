import { NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";

export async function getPermissions() {
	return await repository.getPermissions();
}

export async function getPermission(permissionId: number) {
	const permission = await repository.findPermission(permissionId);
	if (permission == null) throw new NotFoundError("Permission doesn't exist");
	return permission;
}

export async function hasPermission(
	user: {
		id: number;
		type: UserType;
	},
	managedEntity: ManagedEntityType,
	refId: number[],
	permission: PermissionCode,
) {
	if (user.type === "admin") return true;
	return await repository.hasPermissionInEntity(user.id, refId, managedEntity, permission);
}

import { ok } from "@/lib/helpers.js";
import { roleScopedSchema } from "@/modules/role/schema.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getRolePermissions: ApiRequestHandler<
	{
		id: number;
		code: PermissionCode;
		description: string;
	}[],
	{ id: string }
> = async (req, res) => {
	const params = roleScopedSchema.parse(req.params);
	const result = await service.getRolePermissions(params.id);
	return ok(res, result);
};

export const setRolePermissions: ApiRequestHandler<{ permissionId: number }[]> = async (
	req,
	res,
) => {
	const params = roleScopedSchema.parse(req.params);
	const body = schemas.setRolePermissionsSchema.parse(req.body);
	const result = await service.setRolePermissions(params.id, body);
	return ok(res, result);
};

// todo: [un]assign single permission

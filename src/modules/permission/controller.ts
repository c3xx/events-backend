import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getPermissions: ApiRequestHandler<
	{
		id: number;
		code: PermissionCode;
		description: string;
	}[]
> = async (_req, res) => {
	const result = await service.getPermissions();
	return ok(res, result);
};

export const getPermission: ApiRequestHandler<{
	id: number;
	code: PermissionCode;
	description: string;
}> = async (req, res) => {
	const params = schemas.permissionScopedSchema.parse(req.params);
	const result = await service.getPermission(params.id);
	return ok(res, result);
};

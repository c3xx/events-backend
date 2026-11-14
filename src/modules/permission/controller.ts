import { ok } from "@/lib/helpers.js";
import * as service from "./service.js";

export const getPermissions: ApiRequestHandler<
	{
		id: number;
		type: PermissionType;
		code: string;
		description: string;
	}[]
> = async (_req, res) => {
	const result = await service.getPermissions();
	return ok(res, result);
};

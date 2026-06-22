import { ok } from "@/lib/helpers.js";
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

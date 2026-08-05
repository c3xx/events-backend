import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const createUser: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = schemas.createUserSchema.parse(req.body);
	const result = await service.createUser(body);
	return ok(res, result);
};

export const getUsers: ApiRequestHandler<
	{
		email: string;
		fullName: string;
		id: number;
		isActive: boolean;
		createdAt: string;
		roles: {
			id: number;
			isActive: boolean;
			createdAt: string;
			roleId: number;
			managedEntityId: number;
		}[];
	}[]
> = async (_req, res) => {
	const result = await service.getUsers();
	return ok(res, result);
};

export const updateUser: ApiRequestHandler<{ id: number }> = async (req, res) => {
	const params = schemas.userScopedSchema.parse(req.params);
	const body = schemas.updateUserSchema.parse(req.body);
	const result = await service.updateUser(params.userId, body);
	return ok(res, result);
};

export const deleteUser: ApiRequestHandler<true> = async (req, res) => {
	const params = schemas.userScopedSchema.parse(req.params);
	await service.deleteUser(params.userId);
	return ok(res, true);
};

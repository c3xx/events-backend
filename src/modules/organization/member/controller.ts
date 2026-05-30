import { ok } from "@/lib/helpers.js";
import { organizationScopedSchema } from "@/modules/organization/schema.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getOrganizationMembers: ApiRequestHandler<
	{
		id: number;
		fullName: string;
		email: string;
		roles: {
			id: number;
			isActive: boolean;
			roleId: number;
		}[];
	}[]
> = async (req, res) => {
	const params = organizationScopedSchema.parse(req.params);
	const query = schemas.getOrganizationMembersQuerySchema.parse(req.query);
	const result = await service.getOrganizationMembers(params.id, query);
	return ok(res, result);
};

export const addMemberToOrganization: ApiRequestHandler<
	{
		id: number;
		roleId: number;
	}[]
> = async (req, res) => {
	const params = organizationScopedSchema.parse(req.params);
	const body = schemas.addOrganizationMemberSchema.parse(req.body);
	const result = await service.addOrganizationMember(params.id, body);
	return ok(res, result);
};

export const updateOrganizationMemberRoles: ApiRequestHandler<
	{
		id: number;
		roleId: number;
	}[]
> = async (req, res) => {
	const params = schemas.organizationMemberScopedSchema.parse(req.params);
	const body = schemas.assignOrganizationMemberRolesSchema.parse(req.body);
	const result = await service.assignOrganizationMemberRoles(params.id, params.userId, body);
	return ok(res, result);
};

export const deleteOrganizationMember: ApiRequestHandler<
	{
		id: number;
	}[]
> = async (req, res) => {
	const params = schemas.organizationMemberScopedSchema.parse(req.params);
	const result = await service.deleteOrganizationMember(params.id, params.userId);
	return ok(res, result);
};

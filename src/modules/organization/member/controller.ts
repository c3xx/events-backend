import { ok } from "@/lib/helpers.js";
import type { OrganizationScope } from "../scopes.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getOrganizationMembers: ScopedApiRequestHandler<
	OrganizationScope,
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
	const query = schemas.getOrganizationMembersQuerySchema.parse(req.query);
	const result = await service.getOrganizationMembers(res.locals.organization, query);
	return ok(res, result);
};

export const addMemberToOrganization: ScopedApiRequestHandler<
	OrganizationScope,
	{
		id: number;
		roleId: number;
	}[]
> = async (req, res) => {
	const body = schemas.addOrganizationMemberSchema.parse(req.body);
	const result = await service.addOrganizationMember(res.locals.organization, body);
	return ok(res, result);
};

export const updateOrganizationMemberRoles: ScopedApiRequestHandler<
	OrganizationScope,
	{
		id: number;
		roleId: number;
	}[]
> = async (req, res) => {
	const params = schemas.organizationMemberScopedSchema.parse(req.params);
	const body = schemas.assignOrganizationMemberRolesSchema.parse(req.body);
	const result = await service.assignOrganizationMemberRoles(
		res.locals.organization,
		params.userId,
		body,
	);
	return ok(res, result);
};

export const deleteOrganizationMember: ScopedApiRequestHandler<
	OrganizationScope,
	{
		id: number;
	}[]
> = async (req, res) => {
	const params = schemas.organizationMemberScopedSchema.parse(req.params);
	const result = await service.deleteOrganizationMember(res.locals.organization, params.userId);
	return ok(res, result);
};

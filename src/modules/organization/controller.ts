import { ok } from "@/lib/helpers.js";
import {
	addOrganizationMemberSchema,
	assignOrganizationMemberRolesSchema,
	createOrganizationSchema,
	getOrganizationMembersQuerySchema,
	organizationMemberScopedSchema,
	organizationScopedSchema,
} from "./schema.js";
import * as service from "./service.js";

export const createOrganization: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = createOrganizationSchema.parse(req.body);
	// todo: handle problems with unique and foregin constraints
	const result = await service.createOrganization(body);
	return ok(res, result, 201);
};

export const getOrganizations: ApiRequestHandler<
	{
		organizationTypeId: number;
		id: number;
		name: string;
		parentOrganizationId: number | null;
		isActive: boolean;
	}[]
> = async (_req, res) => {
	const result = await service.getOrganizations();
	return ok(res, result);
};

export const getOrganization: ApiRequestHandler<{
	organizationTypeId: number;
	id: number;
	name: string;
	parentOrganizationId: number | null;
	isActive: boolean;
}> = async (req, res) => {
	const params = organizationScopedSchema.parse(req.params);
	const result = await service.getOrganization(params.id);
	return ok(res, result);
};

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
	const query = getOrganizationMembersQuerySchema.parse(req.query);
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
	const body = addOrganizationMemberSchema.parse(req.body);
	const result = await service.addOrganizationMember(params.id, body);
	return ok(res, result);
};

export const updateOrganizationMemberRoles: ApiRequestHandler<
	{
		id: number;
		roleId: number;
	}[]
> = async (req, res) => {
	const params = organizationMemberScopedSchema.parse(req.params);
	const body = assignOrganizationMemberRolesSchema.parse(req.body);
	const result = await service.assignOrganizationMemberRoles(params.id, params.userId, body);
	return ok(res, result);
};

export const deleteOrganizationMember: ApiRequestHandler<
	{
		id: number;
	}[]
> = async (req, res) => {
	const params = organizationMemberScopedSchema.parse(req.params);
	const result = await service.deleteOrganizationMember(params.id, params.userId);
	return ok(res, result);
};

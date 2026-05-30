import { ok } from "@/lib/helpers.js";
import { venueScopedSchema } from "@/modules/venue/schema.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getVenueMembers: ApiRequestHandler<
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
	const params = venueScopedSchema.parse(req.params);
	const query = schemas.getVenueMembersQuerySchema.parse(req.query);
	const result = await service.getVenueMembers(params.id, query);
	return ok(res, result);
};

export const addMemberToVenue: ApiRequestHandler<
	{
		id: number;
		roleId: number;
	}[]
> = async (req, res) => {
	const params = venueScopedSchema.parse(req.params);
	const body = schemas.addVenueMemberSchema.parse(req.body);
	const result = await service.addVenueMember(params.id, body);
	return ok(res, result);
};

export const updateVenueMemberRoles: ApiRequestHandler<
	{
		id: number;
		roleId: number;
	}[]
> = async (req, res) => {
	const params = schemas.venueMemberScopedSchema.parse(req.params);
	const body = schemas.assignVenueMemberRolesSchema.parse(req.body);
	const result = await service.assignVenueMemberRoles(params.id, params.userId, body);
	return ok(res, result);
};

export const deleteVenueMember: ApiRequestHandler<
	{
		id: number;
	}[]
> = async (req, res) => {
	const params = schemas.venueMemberScopedSchema.parse(req.params);
	const result = await service.deleteVenueMember(params.id, params.userId);
	return ok(res, result);
};

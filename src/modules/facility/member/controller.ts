import { ok } from "@/lib/helpers.js";
import { facilityScopedSchema } from "@/modules/facility/schema.js";
import * as schemas from "./schema.js";
import * as service from "./service.js";

export const getFacilityMembers: ApiRequestHandler<
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
	const params = facilityScopedSchema.parse(req.params);
	const query = schemas.getFacilityMembersQuerySchema.parse(req.query);
	const result = await service.getFacilityMembers(params.facilityId, query);
	return ok(res, result);
};

export const addMemberToFacility: ApiRequestHandler<
	{
		id: number;
		roleId: number;
	}[]
> = async (req, res) => {
	const params = facilityScopedSchema.parse(req.params);
	const body = schemas.addFacilityMemberSchema.parse(req.body);
	const result = await service.addFacilityMember(params.facilityId, body);
	return ok(res, result);
};

export const updateFacilityMemberRoles: ApiRequestHandler<
	{
		id: number;
		roleId: number;
	}[]
> = async (req, res) => {
	const params = schemas.facilityMemberScopedSchema.parse(req.params);
	const body = schemas.assignFacilityMemberRolesSchema.parse(req.body);
	const result = await service.assignFacilityMemberRoles(params.id, params.userId, body);
	return ok(res, result);
};

export const deleteVenueMember: ApiRequestHandler<
	{
		id: number;
	}[]
> = async (req, res) => {
	const params = schemas.facilityMemberScopedSchema.parse(req.params);
	const result = await service.deleteFacilityMember(params.id, params.userId);
	return ok(res, result);
};

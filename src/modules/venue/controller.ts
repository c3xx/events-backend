import { ok } from "@/lib/helpers.js";
import {
	addVenueMemberSchema,
	assignVenueMemberRolesSchema,
	createVenueSchema,
	getVenueMembersQuerySchema,
	setVenueFacilitiesSchema,
	venueMemberScopedSchema,
	venueScopedSchema,
} from "./schema.js";
import * as service from "./service.js";

export const createVenue: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = createVenueSchema.parse(req.body);
	const result = await service.createVenue(body);
	return ok(res, result, 201);
};

export const getVenues: ApiRequestHandler<
	{
		name: string;
		venueTypeId: number;
		organizationId: number | null;
		maxCapacity: number;
		accessLevel: VenueAccessLevel;
		isAvailable: boolean;
		unavailabilityReason: string | null;
		id: number;
		isActive: boolean;
	}[]
> = async (_req, res) => {
	const result = await service.getVenues();
	return ok(res, result);
};

export const getVenue: ApiRequestHandler<{
	name: string;
	venueTypeId: number;
	organizationId: number | null;
	maxCapacity: number;
	accessLevel: VenueAccessLevel;
	isAvailable: boolean;
	unavailabilityReason: string | null;
	id: number;
	createdAt: string;
	isActive: boolean;
}> = async (req, res) => {
	const params = venueScopedSchema.parse(req.params);
	const result = await service.getVenue(params.id);
	return ok(res, result);
};

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
	const query = getVenueMembersQuerySchema.parse(req.query);
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
	const body = addVenueMemberSchema.parse(req.body);
	const result = await service.addVenueMember(params.id, body);
	return ok(res, result);
};

export const updateVenueMemberRoles: ApiRequestHandler<
	{
		id: number;
		roleId: number;
	}[]
> = async (req, res) => {
	const params = venueMemberScopedSchema.parse(req.params);
	const body = assignVenueMemberRolesSchema.parse(req.body);
	const result = await service.assignVenueMemberRoles(params.id, params.userId, body);
	return ok(res, result);
};

export const deleteVenueMember: ApiRequestHandler<
	{
		id: number;
	}[]
> = async (req, res) => {
	const params = venueMemberScopedSchema.parse(req.params);
	const result = await service.deleteVenueMember(params.id, params.userId);
	return ok(res, result);
};

export const getVenueFacilities: ApiRequestHandler<
	{
		id: number;
		facilityId: number;
		facilityName: string;
	}[]
> = async (req, res) => {
	const params = venueScopedSchema.parse(req.params);
	const result = await service.getVenueFacilities(params.id);
	return ok(res, result);
};

export const setVenueFacilities: ApiRequestHandler<{ facilityId: number }[]> = async (req, res) => {
	const params = venueScopedSchema.parse(req.params);
	const body = setVenueFacilitiesSchema.parse(req.body);
	const result = await service.setVenueFacilities(params.id, body);
	return ok(res, result);
};

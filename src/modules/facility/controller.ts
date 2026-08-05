import { ok } from "@/lib/helpers.js";
import * as schemas from "./schema.js";
import type { FacilityScope } from "./scopes.js";
import * as service from "./service.js";

export const getFacilities: ApiRequestHandler<
	{
		id: number;
		name: string;
		type: {
			id: number;
			name: string;
		};
		association: FacilityAssociationMethod;
		overlapPolicy: FacilityOverlapPolicy;
		workflowParticipationPolicy: FacilityWorkflowParticipationPolicy;
		isAvailable: boolean;
		providers: {
			id: number;
			scope: {
				type: FacilityProviderEntityType;
				id: number;
				name: string;
				kind: {
					id: number;
					name: string;
				};
			};
		}[];
	}[]
> = async (_req, res) => {
	const result = await service.getFacilities();
	return ok(res, result);
};

export const getEventAssociatedFacilities: ApiRequestHandler<
	{
		id: number;
		name: string;
		type: {
			id: number;
			name: string;
		};
		association: FacilityAssociationMethod;
		overlapPolicy: FacilityOverlapPolicy;
		workflowParticipationPolicy: FacilityWorkflowParticipationPolicy;
		isAvailable: boolean;
		providers: {
			id: number;
			scope: {
				type: FacilityProviderEntityType;
				id: number;
				name: string;
				kind: {
					id: number;
					name: string;
				};
			};
		}[];
	}[]
> = async (_req, res) => {
	const result = await service.getEventAssociatedFacilities();
	return ok(res, result);
};

export const createFacility: ApiRequestHandler<{
	id: number;
}> = async (req, res) => {
	const body = schemas.createFacilitySchema.parse(req.body);
	const result = await service.createFacility(body);
	return ok(res, result);
};

export const getFacility: ScopedApiRequestHandler<
	FacilityScope,
	{
		id: number;
		name: string;
		type: {
			id: number;
			name: string;
		};
		association: FacilityAssociationMethod;
		overlapPolicy: FacilityOverlapPolicy;
		workflowParticipationPolicy: FacilityWorkflowParticipationPolicy;
		isAvailable: boolean;
		providers: {
			id: number;
			scope: {
				type: FacilityProviderEntityType;
				id: number;
				name: string;
				kind: {
					id: number;
					name: string;
				};
			};
		}[];
	}
> = async (_req, res) => {
	const result = await service.getFacility(res.locals.facility);
	return ok(res, result);
};

export const changeAvailability: ScopedApiRequestHandler<FacilityScope, true> = async (
	req,
	res,
) => {
	const body = schemas.changeAvailabilitySchema.parse(req.body);
	await service.changeAvailability(res.locals.facility, body);
	return ok(res, true);
};

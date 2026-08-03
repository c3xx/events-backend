import { NotFoundError } from "@/lib/errors.js";
import { idLike, scopedParamHandler } from "@/lib/helpers.js";
import * as facilityRepository from "@/modules/facility/repository.js";

export type FacilityScope = {
	facility: {
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
	};
};

export const facilityIdParamHandler = scopedParamHandler<FacilityScope, number>(
	idLike("Invalid facility ID"),
	async (_req, res, _next, eventId) => {
		// const user = getAuthenticatedUser(req);
		const facility = await facilityRepository.findFacilityById(eventId);
		if (facility == null) throw new NotFoundError("Could not find the facility");
		// todo:
		// const organizationIds = facility.organizers.map((org) => org.organization.id);
		// const hasPermission = await hasPermissionInManagedEntity(
		// 	user,
		// 	"organization",
		// 	organizationIds,
		// 	"event:view_own",
		// );
		// if (!hasPermission) {
		// 	throw new ForbiddenError("You don't have permission to view this");
		// }
		res.locals.facility = facility;
	},
);

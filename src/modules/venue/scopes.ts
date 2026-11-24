import { NotFoundError } from "@/lib/errors.js";
import { idLike, scopedParamHandler } from "@/lib/helpers.js";
import * as authorityRepository from "@/repositories/managed-entity-authority.js";
import * as repository from "./repository.js";

export type VenueScope = {
	venue: {
		id: number;
		name: string;
		type: {
			id: number;
			name: string;
		};
		venueTypeId: number;
		maxCapacity: number;
		accessLevel: "public" | "private";
		isAvailable: boolean;
		unavailabilityReason: string | null;
		isActive: boolean;
		createdAt: string;
		organization: {
			id: number;
			name: string;
		} | null;
		facilities: {
			id: number;
			name: string;
			type: {
				id: number;
				name: string;
			};
			isAvailable: boolean;
		}[];
	};
};

export const venueIdParamHandler = scopedParamHandler<VenueScope, IdLike>(
	idLike("Invalid venue ID"),
	async (_req, res, _next, venueId) => {
		const venue = await repository.findVenueById(venueId);
		if (venue == null) throw new NotFoundError("Could not find the venue");
		res.locals.venue = venue;
	},
);

export type VenueAuthorityHolderScope = VenueScope & {
	authorityHolder: {
		id: IdLike;
		scope: {
			type: ManagedEntityType;
			id: IdLike;
			name: string;
			kind: { id: IdLike; name: string };
		};
		permissions: {
			code: AuthorityPermissionCode;
			description: string;
		}[];
	};
};

export const authorityIdParamHandler = scopedParamHandler<VenueAuthorityHolderScope, IdLike>(
	idLike("Invalid authority ID"),
	async (_req, res, _next, authorityId) => {
		const authorityHolder = await authorityRepository.findAuthorityRelation({
			subjectType: "venue",
			subjectRefId: res.locals.venue.id,
			authorityId: authorityId,
		});
		if (authorityHolder == null) throw new NotFoundError("Could not find the authority holder");
		res.locals.authorityHolder = authorityHolder;
	},
);

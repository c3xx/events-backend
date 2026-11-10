import { NotFoundError } from "@/lib/errors.js";
import { idLike, scopedParamHandler } from "@/lib/helpers.js";
import * as authorityRepository from "./authority/repository.js";
import * as repository from "./repository.js";

export type OrganizationScope = {
	organization: {
		id: number;
		name: string;
		isActive: boolean;
		createdAt: string;
		type: {
			id: number;
			name: string;
		};
		parentOrganization: {
			id: number;
			name: string;
			type: {
				id: number;
				name: string;
			};
		} | null;
		managedEntity: {
			id: number;
		};
		organizationTypeId: number;
		parentOrganizationId: number | null;
	};
};

export const organizationIdParamHandler = scopedParamHandler<OrganizationScope, IdLike>(
	idLike("Invalid organization ID"),
	async (_req, res, _next, organizationId) => {
		const organization = await repository.getOrganization(organizationId);
		if (organization == null) throw new NotFoundError("Could not find the organization");
		res.locals.organization = organization;
	},
);

export type OrganizationAuthorityHolderScope = OrganizationScope & {
	authorityHolder: {
		id: IdLike;
		organization: {
			id: number;
			name: string;
			type: {
				id: number;
				name: string;
			};
		};
		permissions: {
			code: string;
			description: string;
		}[];
	};
};

export const authorityIdParamHandler = scopedParamHandler<OrganizationAuthorityHolderScope, IdLike>(
	idLike("Invalid authority ID"),
	async (_req, res, _next, authorityId) => {
		const authorityHolder = await authorityRepository.find(res.locals.organization.id, authorityId);
		if (authorityHolder == null)
			throw new NotFoundError("Could not find the authority holder organization");
		res.locals.authorityHolder = authorityHolder;
	},
);

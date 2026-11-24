import { NotFoundError } from "@/lib/errors.js";
import { idLike, scopedParamHandler } from "@/lib/helpers.js";
import * as authorityRepository from "@/repositories/managed-entity-authority.js";
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

export const authorityIdParamHandler = scopedParamHandler<OrganizationAuthorityHolderScope, IdLike>(
	idLike("Invalid authority ID"),
	async (_req, res, _next, authorityId) => {
		const authorityHolder = await authorityRepository.findAuthorityRelation({
			subjectType: "organization",
			subjectRefId: res.locals.organization.id,
			authorityId: authorityId,
		});
		if (authorityHolder == null) throw new NotFoundError("Could not find the authority holder");
		res.locals.authorityHolder = authorityHolder;
	},
);

import { NotFoundError } from "@/lib/errors.js";
import { idLike, scopedParamHandler } from "@/lib/helpers.js";
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

export const organizationIdParamHandler = scopedParamHandler<OrganizationScope, number>(
	idLike("Invalid organization ID"),
	async (_req, res, _next, organizationId) => {
		const organization = await repository.getOrganization(organizationId);
		if (organization == null) throw new NotFoundError("Could not find the organization");
		res.locals.organization = organization;
	},
);

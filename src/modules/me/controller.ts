import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import * as service from "./service.js";

export const getEventCreatableOrganizations: ApiRequestHandler<
	{
		id: number;
		name: string;
	}[]
> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const result = await service.getEventCreatableOrganizations(user);
	return ok(res, result);
};

import { ForbiddenError, UnauthorizedError } from "@/lib/errors.js";

export function requireUserType(userType: UserType | UserType[]): ApiRequestHandler {
	return (req, _res, next) => {
		if (req.user == null) {
			throw new UnauthorizedError("Unauthorized");
		}

		const types = Array.isArray(userType) ? [userType] : userType;

		if (types.includes(req.user.type)) {
			return next();
		} else {
			throw new ForbiddenError("You have no access");
		}
	};
}

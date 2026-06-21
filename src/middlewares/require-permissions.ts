// note: unused
// but will be back when system wide user permissions are implemented
// like, user will be able to act as admin. currently permissions are based on managed entity kind scope

// import type { NextFunction, Request, RequestHandler } from "express";
// import { env } from "@/lib/env.js";
// import { ForbiddenError, UnauthorizedError } from "@/lib/errors.js";

// export function requirePermissions(permissions: PermissionCode[]): RequestHandler {
// 	return (req: Request, _res: ApiResponse, next: NextFunction) => {
// 		if (env.NODE_ENV === "development" && env.DEBUG_BYPASS_PERMISSIONS) {
// 			return next();
// 		}

// 		if (req.user == null) {
// 			throw new UnauthorizedError("Unauthorized");
// 		}

// 		if (req.user.type === "admin") {
// 			// admin can bypass permissions!
// 			// note: this implementation is flaky since it only allows "admin" to pass-through.
// 			// fine for our current implementation, but may become a trouble if new user types are added
// 			return next();
// 		}

// 		const userPermissions = req.user.permissions;

// 		if (permissions.some((permission) => userPermissions.includes(permission))) {
// 			return next();
// 		} else {
// 			throw new ForbiddenError("You do not have any required permission for this");
// 		}
// 	};
// }

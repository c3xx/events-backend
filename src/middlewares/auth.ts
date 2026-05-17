import { and, eq, inArray, isNull } from "drizzle-orm";
import { jwtVerify } from "jose";
import { db, schema } from "@/db/index.js";
import { UnauthorizedError } from "@/lib/errors.js";
import { quickEnv } from "@/lib/helpers.js";
import { JWS_ALG_HEADER_PARAMETER, JWT_ACCESS_SECRET_SIGN_KEY } from "@/lib/jwt.js";

const BEARER_PREFIX = "Bearer ";

const DEBUG_BYPASS_AUTH = !!quickEnv("DEBUG_BYPASS_AUTH", false);

export const authenticateToken: ApiRequestHandler = async (req, _res, next) => {
	if (DEBUG_BYPASS_AUTH) {
		return next();
	}

	const authHeader = req.headers.authorization;

	if (
		typeof authHeader !== "string" ||
		!authHeader.startsWith(BEARER_PREFIX) ||
		authHeader.length <= BEARER_PREFIX.length
	) {
		throw new UnauthorizedError("No authentication token");
	}

	try {
		const accessToken = authHeader.slice(BEARER_PREFIX.length);
		const { payload } = await jwtVerify<IJWTPayload>(accessToken, JWT_ACCESS_SECRET_SIGN_KEY, {
			algorithms: [JWS_ALG_HEADER_PARAMETER],
		});

		if (typeof payload.id !== "number") {
			throw new UnauthorizedError("Expired token");
		}

		// todo: always fetch permissions, or embed inside *very* short-lived access tokens?
		// going with always fetch for now, for testing purposes. this is heavy though.

		const userRoles = await db
			.selectDistinct({ roleId: schema.userRole.roleId }) // will probably have to scope it later; so might need to remove the distinct i think
			.from(schema.userRole)
			.where(and(isNull(schema.userRole.deletedAt), eq(schema.userRole.userId, payload.id)));
		const permissions = await db
			.selectDistinct({ code: schema.permission.code })
			.from(schema.rolePermission)
			.innerJoin(schema.permission, eq(schema.rolePermission.permissionId, schema.permission.id))
			.where(
				inArray(
					schema.rolePermission.roleId,
					userRoles.map((role) => role.roleId),
				),
			);

		req.user = {
			id: payload.id,
			type: payload.type,
			permissions: permissions.map((permission) => permission.code),
		};

		next();
	} catch {
		throw new UnauthorizedError("Expired token");
	}
};

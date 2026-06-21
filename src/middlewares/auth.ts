import { jwtVerify } from "jose";
import { env } from "@/lib/env.js";
import { UnauthorizedError } from "@/lib/errors.js";
import { JWS_ALG_HEADER_PARAMETER, JWT_ACCESS_SECRET_SIGN_KEY } from "@/lib/jwt.js";

const BEARER_PREFIX = "Bearer ";

export const authenticateToken: ApiRequestHandler = async (req, _res, next) => {
	if (env.NODE_ENV === "development" && env.DEBUG_BYPASS_AUTH) {
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

		req.user = {
			id: payload.id,
			type: payload.type,
		};

		next();
	} catch {
		throw new UnauthorizedError("Expired token");
	}
};

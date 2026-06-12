import { SignJWT } from "jose";
import { MINUTE, WEEK } from "./constants.js";
import { quickEnv } from "./helpers.js";

const JWT_ACCESS_SECRET = quickEnv("JWT_ACCESS_SECRET");
const JWT_REFRESH_SECRET = quickEnv("JWT_REFRESH_SECRET");

export const JWT_ACCESS_SECRET_SIGN_KEY = new TextEncoder().encode(JWT_ACCESS_SECRET);
export const JWT_REFRESH_SECRET_SIGN_KEY = new TextEncoder().encode(JWT_REFRESH_SECRET);

export const JWT_ACCESS_TOKEN_EXPIRY = 10 * MINUTE;
export const JWT_REFRESH_TOKEN_EXPIRY = 1 * WEEK;
export const JWS_ALG_HEADER_PARAMETER = "HS256";

export function getJWTTokenGenerator(expiration: number, signKey: Parameters<SignJWT["sign"]>[0]) {
	return async (payload: IJWTPayload) => {
		const expires = new Date(Date.now() + expiration);

		return await new SignJWT(payload)
			.setProtectedHeader({ alg: JWS_ALG_HEADER_PARAMETER })
			.setIssuedAt()
			.setExpirationTime(expires)
			.sign(signKey);
	};
}

export const generateAccessToken = getJWTTokenGenerator(
	JWT_ACCESS_TOKEN_EXPIRY,
	JWT_ACCESS_SECRET_SIGN_KEY,
);

export const generateRefreshToken = getJWTTokenGenerator(
	JWT_REFRESH_TOKEN_EXPIRY,
	JWT_REFRESH_SECRET_SIGN_KEY,
);

import { IS_PROD, REFRESH_TOKEN_COOKIE_NAME } from "@/lib/constants.js";
import { UnauthorizedError } from "@/lib/errors.js";
import { getAuthenticatedUser, ok } from "@/lib/helpers.js";
import { JWT_REFRESH_TOKEN_EXPIRY } from "@/lib/jwt.js";
import { loginSchema, requestPasswordTokenSchema, resetPasswordSchema } from "./schema.js";
import * as service from "./service.js";

export const login: ApiRequestHandler<{
	accessToken: string;
}> = async (req, res) => {
	const body = loginSchema.parse(req.body);
	const result = await service.login(body.email, body.password);

	res.cookie(REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, {
		httpOnly: true,
		secure: IS_PROD,
		sameSite: "lax",
		maxAge: JWT_REFRESH_TOKEN_EXPIRY,
	});

	return ok(res, {
		accessToken: result.accessToken,
	});
};

export const logout: ApiRequestHandler = (_req, res) => {
	res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
		httpOnly: true,
		secure: IS_PROD,
		sameSite: "lax",
	});
	return res.sendStatus(200);
};

export const userDetails: ApiRequestHandler<Frontend.AuthenticatedUser> = async (req, res) => {
	const user = getAuthenticatedUser(req);
	const result = await service.getUserDetails(user.id);
	return ok(res, result);
};

export const refresh: ApiRequestHandler<{
	accessToken: string;
}> = async (req, res) => {
	const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
	if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
		throw new UnauthorizedError("No refresh token");
	}

	const tokens = await service.createNewTokens(refreshToken);

	res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
		httpOnly: true,
		secure: IS_PROD,
		sameSite: "lax",
		maxAge: JWT_REFRESH_TOKEN_EXPIRY,
	});

	return ok(res, {
		accessToken: tokens.accessToken,
	});
};

export const resetPassword: ApiRequestHandler = async (req, res) => {
	const body = resetPasswordSchema.parse(req.body);
	const result = await service.resetPassword(body.token, body.password);
	return ok(res, result);
};

export const generatePasswordToken: ApiRequestHandler = async (req, res) => {
	const body = requestPasswordTokenSchema.parse(req.body);
	await service.generatePasswordToken(body.email, body.type);
	return ok(res, null);
};

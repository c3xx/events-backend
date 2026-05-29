import { jwtVerify } from "jose";
import { verifyPassword } from "@/lib/argon2.js";
import { NotFoundError, UnauthorizedError } from "@/lib/errors.js";
import {
	generateAccessToken,
	generateRefreshToken,
	JWT_REFRESH_SECRET_SIGN_KEY,
} from "@/lib/jwt.js";
import * as userRepository from "@/modules/user/repository.js";

export async function login(
	email: string,
	password: string,
): Promise<{
	accessToken: string;
	refreshToken: string;
}> {
	const user = await userRepository.findUserByEmail(email);
	if (user == null) {
		throw new NotFoundError("Invalid credentials");
	}

	const isValid = await verifyPassword(user.passwordHash, password);
	if (!isValid) {
		throw new NotFoundError("Invalid credentials");
	}

	const payload: IJWTPayload = {
		id: user.id,
		type: user.type,
	};

	const accessToken = await generateAccessToken(payload);
	const refreshToken = await generateRefreshToken(payload);

	return {
		accessToken: accessToken,
		refreshToken: refreshToken,
	};
}

export async function createNewTokens(refreshToken: string) {
	let jwtPayload: IJWTPayload;

	try {
		const { payload } = await jwtVerify<IJWTPayload>(refreshToken, JWT_REFRESH_SECRET_SIGN_KEY);
		jwtPayload = payload;
	} catch {
		throw new UnauthorizedError("Invalid or expired refresh token");
	}

	const user = await userRepository.getUserWithPermissions(jwtPayload.id);
	if (user == null) {
		throw new UnauthorizedError("Could not find the authenticated user");
	}

	const newPayload = {
		id: user.id,
		type: user.type,
	} satisfies IJWTPayload;

	const newAccessToken = await generateAccessToken(newPayload);
	const newRefreshToken = await generateRefreshToken(newPayload);

	return {
		accessToken: newAccessToken,
		refreshToken: newRefreshToken,
	};
}

import { jwtVerify } from "jose";
import { hashPassword, verifyPassword } from "@/lib/argon2.js";
import { sendEmail } from "@/lib/email.js";
import { getPasswordUpdatedContent } from "@/lib/email-templates.js";
import { NotFoundError, UnauthorizedError } from "@/lib/errors.js";
import { hexSha256, quickEnv } from "@/lib/helpers.js";
import {
	generateAccessToken,
	generateRefreshToken,
	JWT_REFRESH_SECRET_SIGN_KEY,
} from "@/lib/jwt.js";
import * as repository from "./repository.js";

export async function login(
	email: string,
	password: string,
): Promise<{
	accessToken: string;
	refreshToken: string;
}> {
	const user = await repository.findUserByEmail(email);
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

export async function getUserDetails(userId: number): Promise<Frontend.AuthenticatedUser> {
	const user = await repository.getUserWithPermissions(userId);
	if (user == null) throw new NotFoundError("User not found");
	return user;
}

export async function createNewTokens(refreshToken: string) {
	let jwtPayload: IJWTPayload;

	try {
		const { payload } = await jwtVerify<IJWTPayload>(refreshToken, JWT_REFRESH_SECRET_SIGN_KEY);
		jwtPayload = payload;
	} catch {
		throw new UnauthorizedError("Invalid or expired refresh token");
	}

	const user = await repository.getUserWithPermissions(jwtPayload.id);
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

const frontendUrl = quickEnv("FRONTEND_ORIGIN", true);
export async function resetPassword(token: string, newPassword: string) {
	const tokenHash = hexSha256(token);
	const tokenRecord = await repository.findActivePasswordToken(tokenHash);

	if (tokenRecord == null) {
		throw new UnauthorizedError("Invalid, expired, or already used token");
	}

	if (tokenRecord.user.deletedAt !== null) {
		throw new NotFoundError("Associated account not found");
	}

	const newPasswordHash = await hashPassword(newPassword);

	await repository.applyPasswordChange({
		userId: tokenRecord.user.id,
		tokenId: tokenRecord.id,
		newPasswordHash,
	});

	try {
		const loginUrl = `${frontendUrl}/login`; //todo: change the url as needed
		const html = getPasswordUpdatedContent(loginUrl);
		await sendEmail(tokenRecord.user.email, "Password Updated Successfully", html);
	} catch (error) {
		throw error;
	}
}

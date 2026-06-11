import { jwtVerify } from "jose";
import { hashPassword, verifyPassword } from "@/lib/argon2.js";
import { sendEmail } from "@/lib/email.js";
import {
	getPasswordChangedContent,
	getPasswordSetContent,
	getPasswordSetupTokenContent,
	getResetPasswordContent,
} from "@/lib/email-templates.js";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors.js";
import { generateSecureString, hexSha256, quickEnv } from "@/lib/helpers.js";
import {
	generateAccessToken,
	generateRefreshToken,
	JWT_REFRESH_SECRET_SIGN_KEY,
} from "@/lib/jwt.js";
import * as userRepository from "@/modules/user/repository.js";
import * as repository from "./repository.js";

const frontendUrl = quickEnv("FRONTEND_ORIGIN", true);

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

	if (user.passwordHash == null) {
		throw new ForbiddenError(
			"Account password not set. Please complete your account password setup first.",
		);
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

export async function requestPasswordToken(email: string, type: "SET_PASSWORD" | "RESET_PASSWORD") {
	const user = await userRepository.findUserByEmail(email);

	if (user == null) {
		throw new NotFoundError("No account found with that email address.");
	}

	if (type === "RESET_PASSWORD" && user.passwordHash == null) {
		throw new ForbiddenError(
			"No password set on this account. Please complete your account password setup first.",
		);
	}

	if (type === "RESET_PASSWORD" && !user.isActive) {
		throw new ForbiddenError("Your Account is not active.");
	}

	if (type === "SET_PASSWORD" && user.passwordHash != null) {
		throw new ForbiddenError("Your account password is already set.");
	}

	await repository.invalidateActiveTokensForUser(user.id);

	const token = generateSecureString();
	const tokenHash = hexSha256(token);
	await repository.insertPasswordToken({ userId: user.id, tokenHash, type });

	const tokenUrl = `${frontendUrl}/new-password?token=${token}`;

	if (type === "SET_PASSWORD") {
		const html = getPasswordSetupTokenContent(tokenUrl);
		await sendEmail(user.email, "Set up your account password", html);
	} else {
		const html = getResetPasswordContent(tokenUrl);
		await sendEmail(user.email, "Reset your password", html);
	}
}

export async function resetPassword(token: string, newPassword: string) {
	const tokenHash = hexSha256(token);
	const tokenRecord = await repository.findActivePasswordToken(tokenHash);

	if (tokenRecord == null) {
		throw new UnauthorizedError("Invalid, expired, or already used token");
	}

	if (tokenRecord.type === "RESET_PASSWORD" && !tokenRecord.user.isActive) {
		throw new ForbiddenError("Your account is not active. Password change is not allowed.");
	}

	const newPasswordHash = await hashPassword(newPassword);

	await repository.applyPasswordChange({
		userId: tokenRecord.user.id,
		tokenId: tokenRecord.id,
		newPasswordHash,
	});

	const loginUrl = `${frontendUrl}/login`;

	if (tokenRecord.type === "SET_PASSWORD") {
		const html = getPasswordSetContent(loginUrl);
		await sendEmail(tokenRecord.user.email, "Your password has been set successfully", html);
	} else {
		const html = getPasswordChangedContent(loginUrl);
		await sendEmail(tokenRecord.user.email, "Your password has been changed successfully", html);
	}
}

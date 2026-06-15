import { jwtVerify } from "jose";
import { hashPassword, verifyPassword } from "@/lib/argon2.js";
import { FRONTEND_URL } from "@/lib/constants.js";
import { sendEmail } from "@/lib/email.js";
import {
	getPasswordChangedContent,
	getPasswordSetContent,
	getPasswordSetupTokenContent,
	getResetPasswordContent,
} from "@/lib/email-templates.js";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors.js";
import { generatePasswordToken, hexSha256 } from "@/lib/helpers.js";
import {
	generateAccessToken,
	generateRefreshToken,
	JWT_REFRESH_SECRET_SIGN_KEY,
} from "@/lib/jwt.js";
import * as userRepository from "@/modules/user/repository.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

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

export async function requestPasswordToken(input: schemas.RequestPasswordTokenSchema) {
	const user = await userRepository.findUserByEmail(input.email);

	if (user == null) {
		throw new NotFoundError("No account found with that email address.");
	}

	if (input.type === "reset_password" && user.passwordHash == null) {
		throw new ForbiddenError(
			"No password set on this account. Please complete your account password setup first.",
		);
	}

	if (input.type === "reset_password" && !user.isActive) {
		throw new ForbiddenError("Your Account is not active.");
	}

	if (input.type === "set_password" && user.passwordHash != null) {
		throw new ForbiddenError("Your account password is already set.");
	}

	await repository.invalidateActiveTokensForUser(user.id);

	const token = generatePasswordToken();
	const tokenHash = hexSha256(token);
	await repository.insertPasswordToken({
		userId: user.id,
		tokenHash: tokenHash,
		type: input.type,
	});

	const tokenUrl = `${FRONTEND_URL}/new-password?token=${encodeURIComponent(token)}`;

	const isSetPassword = input.type === "set_password";
	const subject = isSetPassword ? "Set up your account password" : "Reset your password";
	const html = isSetPassword ? getPasswordSetupTokenContent(tokenUrl) : getResetPasswordContent(tokenUrl);

	await sendEmail(user.email, subject, html);
}

export async function resetPassword(input: schemas.ResetPasswordSchema) {
	const tokenHash = hexSha256(input.token);
	const tokenRecord = await repository.findActivePasswordToken(tokenHash);

	if (tokenRecord == null) {
		throw new UnauthorizedError("Invalid, expired, or already used token");
	}

	if (tokenRecord.type === "reset_password" && !tokenRecord.user.isActive) {
		throw new ForbiddenError("Your account is not active. Password change is not allowed.");
	}

	const newPasswordHash = await hashPassword(input.password);

	await repository.applyPasswordChange({
		userId: tokenRecord.user.id,
		tokenId: tokenRecord.id,
		newPasswordHash,
	});

	const loginUrl = `${FRONTEND_URL}/login`;

	const isSetPassword = tokenRecord.type === "set_password";
	const subject = isSetPassword ? "Your password has been set successfully": "Your password has been changed successfully";
	const html = isSetPassword ? getPasswordSetContent(loginUrl) : getPasswordChangedContent(loginUrl);

	await sendEmail(tokenRecord.user.email, subject, html);
}

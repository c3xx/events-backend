import type { RequestHandler } from "express";
import { RateLimitError } from "@/lib/errors.js";
import { isAccountLocked } from "@/lib/login-lockout.js";

export const loginLockout: RequestHandler = async (req, _res, next) => {
	const email = req.body?.email;

	if (typeof email !== "string" || email.trim().length === 0) {
		return next();
	}

	try {
		const status = await isAccountLocked(email);

		if (status.locked) {
			return next(
				new RateLimitError(
					`Your account has been temporarily locked due to too many failed login attempts. ` +
						`Please try again in ${status.retryAfterSeconds} seconds or contact an administrator.`,
					status.retryAfterSeconds,
				),
			);
		}

		return next();
	} catch (error) {
		console.error("Login lockout Redis check failed:", error);
		return next();
	}
};

import { sendEmail } from "@/lib/email.js";
import { getAccountLockedContent } from "@/lib/email-templates.js";
import { env } from "@/lib/env.js";
import { redis } from "@/redis/index.js";
import { attemptsKey, lockoutKey } from "../redis/helper.js";

export const LOGIN_MAX_ATTEMPTS = 3;

export const LOGIN_LOCKOUT_DURATION_MS = 3 * 60 * 60 * 1000;

export async function isAccountLocked(
	email: string,
): Promise<{ locked: false } | { locked: true; retryAfterSeconds: number }> {
	const ttl = await redis.pttl(lockoutKey(email));

	if (ttl <= 0) return { locked: false };

	return { locked: true, retryAfterSeconds: Math.ceil(ttl / 1000) };
}

export async function recordFailedLoginAttempt(email: string, userEmail: string): Promise<void> {
	const key = attemptsKey(email);
	const lockMs = LOGIN_LOCKOUT_DURATION_MS;

	const count = await redis.incr(key);

	if (count === 1) {
		await redis.pexpire(key, lockMs * 2);
	}

	if (count >= LOGIN_MAX_ATTEMPTS) {
		await redis.set(lockoutKey(email), "1", { px: lockMs });

		if (count === LOGIN_MAX_ATTEMPTS) {
			const retryAfterMinutes = Math.ceil(lockMs / 60_000);
			await sendEmail({
				to: [userEmail],
				subject: "Your account has been temporarily locked",
				html: getAccountLockedContent(retryAfterMinutes, env.ADMIN_LOGIN_EMAIL),
			}).catch((err) => {
				console.error("[login-lockout] Failed to send account-locked email:", err);
			});
		}
	}
}

export async function clearLoginAttempts(email: string): Promise<void> {
	await redis.del(attemptsKey(email), lockoutKey(email));
}

export async function unlockAccount(email: string): Promise<void> {
	await clearLoginAttempts(email);
}

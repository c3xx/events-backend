import { createHash } from "node:crypto";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { customAlphabet } from "nanoid";
import { FLATTENED_PERMISSIONS, PERMISSION_SCOPES } from "@/lib/constants.js";
import { handleDbError, UnauthorizedError, UnreachableError } from "./errors.js";

export function unreachable(): never {
	console.error("never supposed to reach here");
	throw new UnreachableError();
}

export function quickEnv(name: string, check: false): string | undefined;
export function quickEnv(name: string, check?: true): string;
export function quickEnv(name: string, check?: boolean): string | undefined {
	const value = process.env[name];
	if (check && (typeof value !== "string" || value.length === 0)) {
		throw new Error(`Environment variable '${name}' must be set`);
	}
	return value;
}

export function isPermissionScope(scope: string): scope is PermissionScope {
	return (PERMISSION_SCOPES as string[]).includes(scope);
}

export function isPermission(permission: string): permission is PermissionCode {
	return permission in FLATTENED_PERMISSIONS;
}

export function getAuthenticatedUser(
	req: Express.Request,
): Pick<User, "id" | "type"> & { permissions: PermissionCode[] } {
	if (req.user == null) {
		throw new UnauthorizedError("Authentication required");
	}
	return req.user;
}

export function ok<T>(res: ApiResponse<T>, data: T, statusCode: number = 200) {
	return res.status(statusCode).json({ success: true, data: data });
}

export function dbAction<T extends unknown[], R>(
	fn: (...args: T) => Promise<R>,
): (...args: T) => Promise<R> {
	return async (...args: T) => {
		try {
			return await fn(...args);
		} catch (error) {
			if (error instanceof DrizzleQueryError) {
				handleDbError(error);
			} else {
				// then it must be some unrelated shitty case. will have to inspect later.
				console.error(error);
				console.error(
					"This was not expected. Expected all DB errors to be a DrizzleQueryError, which is wrong to assume so; so fix it.",
				);
				throw error;
			}
		}
	};
}

export function snakeToNormalCase(s: string) {
	const r = s.split("_").join(" ").replace(/\s+/g, " ");
	return r[0]?.toUpperCase() + r.slice(1);
}

const PASSWORD_GENERATION_CUSTOM_ALPHABET_SET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

export const generateSecureString = customAlphabet(PASSWORD_GENERATION_CUSTOM_ALPHABET_SET, 12);

export function hexSha256(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

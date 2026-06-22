import { createHash } from "node:crypto";
import { DrizzleQueryError } from "drizzle-orm/errors";
import type * as express from "express";
import { customAlphabet } from "nanoid";
import z from "zod";
import type { $ZodType } from "zod/v4/core";
import { FLATTENED_PERMISSIONS, PERMISSION_SCOPES } from "@/lib/constants.js";
import { handleDbError, UnauthorizedError, UnreachableError } from "./errors.js";

export function unreachable(): never {
	throw new UnreachableError("never supposed to reach here");
}

export function isPermissionScope(scope: string): scope is PermissionScope {
	return (PERMISSION_SCOPES as string[]).includes(scope);
}

export function isPermission(permission: string): permission is PermissionCode {
	return permission in FLATTENED_PERMISSIONS;
}

export function getAuthenticatedUser(req: Express.Request): AuthenticatedUser {
	if (req.user == null) throw new UnauthorizedError("Authentication required");
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

export function snakeToNormalCase(s: string): string {
	const r = s.split("_").join(" ").replace(/\s+/g, " ");
	return r[0]?.toUpperCase() + r.slice(1);
}

const PASSWORD_TOKEN_ALPHABET_SET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const generatePasswordToken = customAlphabet(PASSWORD_TOKEN_ALPHABET_SET, 20);

export function hexSha256(token: string) {
	return createHash("sha256").update(token).digest("hex");
}
/**
 * Orders the workflow template/instance steps in correct order despite the given order.
 * @param unorderedSteps Steps to be ordered
 * @param initialStepId The initial step to start the ordering from.
 * @returns An array of step IDs in order
 */
export function orderWorkflowSteps<T extends { id: number; nextStepId: number | null }>(
	unorderedSteps: T[],
	initialStepId: number | null,
): T[] {
	if (unorderedSteps.length === 0) return []; // they should technically be asserted. no steps = no initial
	if (initialStepId == null) throw new Error("Initial step ID is required for ordering steps");

	const stepMap = new Map(unorderedSteps.map((s) => [s.id, s]));

	const seenIds = new Set<number>();
	const ordered: T[] = [];
	let currentStepId: number | null = initialStepId;
	while (currentStepId != null) {
		const currentStep = stepMap.get(currentStepId);
		if (currentStep == null) unreachable(); // should be there
		if (seenIds.has(currentStepId)) unreachable(); // loops! bad

		seenIds.add(currentStepId);
		ordered.push(currentStep);
		currentStepId = currentStep.nextStepId;
	}

	return ordered;
}

export const scopedParamHandler = <S extends Record<string, unknown>, T>(
	zodSchema: $ZodType<T>,
	handler: ApiRequestParamsHandler<T, S>,
): express.RequestParamHandler => {
	return async (req, res, next, value) => {
		try {
			const parsed = z.parse(zodSchema, value);
			await handler(req, res as express.Response<unknown, S>, next, parsed);
			next();
		} catch (err) {
			next(err);
		}
	};
};

export const idLike = (error: string) => z.coerce.number({ error }).int({ error });

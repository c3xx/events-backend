import { sql } from "drizzle-orm";
import type { RequestHandler } from "express";
import { beforeAll, vi } from "vitest";
import { db, schema } from "@/db/index.js";
import { hashPassword } from "@/lib/argon2.js";
import { FLATTENED_PERMISSIONS } from "@/lib/constants.js";
import { env } from "@/lib/env.js";
import { isPermission, unreachable } from "@/lib/helpers.js";

vi.mock("@/middlewares/rate-limiter.js", () => ({
	rateLimiter: (): RequestHandler => (_req, _res, next) => next(),
}));

vi.mock("@/redis/index.js", () => {
	const store = new Map<string, string>();
	const expiries = new Map<string, number>();

	return {
		redis: {
			pttl: vi.fn(async (key: string) => {
				const exp = expiries.get(key);
				if (exp == null) return -1;
				const remaining = exp - Date.now();
				return remaining > 0 ? remaining : -2;
			}),
			incr: vi.fn(async (key: string) => {
				const current = Number(store.get(key) ?? 0);
				const next = current + 1;
				store.set(key, String(next));
				return next;
			}),
			pexpire: vi.fn(async (key: string, ms: number) => {
				expiries.set(key, Date.now() + ms);
				return 1;
			}),
			set: vi.fn(async (key: string, value: string, opts?: { px?: number }) => {
				store.set(key, value);
				if (opts?.px != null) expiries.set(key, Date.now() + opts.px);
				return "OK";
			}),
			del: vi.fn(async (...keys: string[]) => {
				let count = 0;
				for (const key of keys) {
					if (store.delete(key)) count++;
					expiries.delete(key);
				}
				return count;
			}),
		},
	};
});

beforeAll(async () => {
	const tables = await db.execute<{ tablename: string }>(
		sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
	);

	await db.execute(
		sql`TRUNCATE ${sql.raw(
			tables.rows.map((row) => `"${row.tablename}"`).join(","),
		)} RESTART IDENTITY CASCADE`,
	);

	if (env.ADMIN_LOGIN_EMAIL == null || env.ADMIN_LOGIN_PASSWORD == null)
		throw new Error("Expected the admin email and password to be found in env");

	await db.insert(schema.user).values({
		fullName: "System Admin",
		type: "admin",
		email: env.ADMIN_LOGIN_EMAIL,
		passwordHash: await hashPassword(env.ADMIN_LOGIN_PASSWORD),
	});

	for (const permission in FLATTENED_PERMISSIONS) {
		if (!isPermission(permission)) unreachable();
		await db.insert(schema.permission).values({
			code: permission,
			description: FLATTENED_PERMISSIONS[permission],
		});
	}
});

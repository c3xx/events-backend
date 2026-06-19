import { sql } from "drizzle-orm";
import { beforeAll } from "vitest";
import { db, schema } from "@/db/index.js";
import { hashPassword } from "@/lib/argon2.js";
import { FLATTENED_PERMISSIONS } from "@/lib/constants.js";
import { env } from "@/lib/env.js";
import { isPermission, unreachable } from "@/lib/helpers.js";

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

import { confirm } from "@inquirer/prompts";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { hashPassword, verifyPassword } from "@/lib/argon2.js";
import { FLATTENED_AUTHORITY_PERMISSIONS, FLATTENED_USER_PERMISSIONS } from "@/lib/constants.js";
import { env } from "@/lib/env.js";
import { isAuthorityPermission, isUserPermission, unreachable } from "@/lib/helpers.js";

// === Setup 'admin' user account

console.log("Setting up administrator user account");

const existingAdminAccounts = await db
	.select()
	.from(schema.user)
	.where(eq(schema.user.type, "admin"));

if (existingAdminAccounts.length === 0) {
	console.log("Found no admin account, setting up one now");
	await db.insert(schema.user).values({
		type: "admin",
		fullName: "System admin",
		email: env.ADMIN_LOGIN_EMAIL,
		passwordHash: await hashPassword(env.ADMIN_LOGIN_PASSWORD),
	});
} else if (existingAdminAccounts.length > 1) {
	throw new Error("misconfiguration in database: more than one admin account");
} else {
	const account = existingAdminAccounts[0];
	if (account == null) unreachable();
	const emailMatch = account.email === env.ADMIN_LOGIN_EMAIL;
	const passwordMatch =
		account.passwordHash == null
			? false
			: await verifyPassword(account.passwordHash, env.ADMIN_LOGIN_PASSWORD);
	if (!emailMatch || !passwordMatch) {
		console.log("mismatched credentials for admin account, setting them to config");
		if (
			await confirm({
				message: "Set email and password of admin account to ENV vars?",
			})
		)
			await db
				.update(schema.user)
				.set({
					email: env.ADMIN_LOGIN_EMAIL,
					passwordHash: await hashPassword(env.ADMIN_LOGIN_PASSWORD),
				})
				.where(eq(schema.user.type, "admin"));
	}
}

// === Sync permissions
console.log("Setting up permissions");

async function syncPermissionSet<TCode extends string>({
	type,
	definitions,
	isPermissionCode,
	cleanupAssignments,
}: {
	type: PermissionType;
	definitions: Record<TCode, string>;
	isPermissionCode: (code: string) => code is TCode;
	cleanupAssignments: (ids: number[]) => Promise<void>;
}) {
	const existingRows = await db
		.select()
		.from(schema.permission)
		.where(eq(schema.permission.type, type));

	const existingPermissions = new Map(
		existingRows.map((permission) => [permission.code, permission] as const),
	);

	const permissionsToInsert: TCode[] = [];
	const permissionsToUpdate: { code: TCode; description: string }[] = [];
	const permissionsToDelete: number[] = [];

	for (const rawCode of Object.keys(definitions)) {
		if (!isPermissionCode(rawCode)) unreachable();

		const existing = existingPermissions.get(rawCode);
		const description = definitions[rawCode];

		if (existing) {
			if (description !== existing.description) {
				permissionsToUpdate.push({ code: rawCode, description });
			}
		} else {
			permissionsToInsert.push(rawCode);
		}
	}

	const desiredCodes = new Set(Object.keys(definitions));

	for (const existing of existingRows) {
		if (!desiredCodes.has(existing.code)) {
			permissionsToDelete.push(existing.id);
		}
	}

	console.log(`${type} permissions`, {
		permissionsToInsert,
		permissionsToUpdate,
		permissionsToDelete,
	});

	if (
		permissionsToInsert.length > 0 &&
		(await confirm({
			message: `Insert ${permissionsToInsert.length} ${type} permissions?`,
		}))
	) {
		const inserted = await db.insert(schema.permission).values(
			permissionsToInsert.map(
				(code) =>
					({
						type,
						code,
						description: definitions[code],
					}) satisfies typeof schema.permission.$inferInsert,
			),
		);

		console.log("inserted", inserted.rowCount, `${type} permissions`);
	}

	if (
		permissionsToUpdate.length > 0 &&
		(await confirm({
			message: `Update ${permissionsToUpdate.length} ${type} permissions?`,
		}))
	) {
		const cases = permissionsToUpdate.map(
			({ code, description }) => sql`when ${schema.permission.code} = ${code} then ${description}`,
		);

		const finalSql = sql`
			case ${sql.join(cases, sql.raw(" "))}
			else ${schema.permission.description}
			end
		`;

		const updated = await db
			.update(schema.permission)
			.set({ description: finalSql })
			.where(
				and(
					eq(schema.permission.type, type),
					inArray(
						schema.permission.code,
						permissionsToUpdate.map(({ code }) => code),
					),
				),
			);

		console.log("updated", updated.rowCount, `${type} permissions`);
	}

	if (
		permissionsToDelete.length > 0 &&
		(await confirm({
			message: `Delete ${permissionsToDelete.length} ${type} permissions?`,
		}))
	) {
		// Remove dependent assignments before deleting permissions.
		await cleanupAssignments(permissionsToDelete);

		const deleted = await db
			.delete(schema.permission)
			.where(
				and(eq(schema.permission.type, type), inArray(schema.permission.id, permissionsToDelete)),
			);

		console.log("hard-deleted", deleted.rowCount, `${type} permissions`);
	}
}

// User permissions
await syncPermissionSet({
	type: "user",
	definitions: FLATTENED_USER_PERMISSIONS,
	isPermissionCode: isUserPermission,
	cleanupAssignments: async (ids) => {
		const deleted = await db
			.delete(schema.rolePermission)
			.where(inArray(schema.rolePermission.permissionId, ids));

		console.log("hard-deleted", deleted.rowCount, "role permissions");
	},
});

// Authority permissions
await syncPermissionSet({
	type: "managed_entity_authority",
	definitions: FLATTENED_AUTHORITY_PERMISSIONS,
	isPermissionCode: isAuthorityPermission,
	cleanupAssignments: async (ids) => {
		const deleted = await db
			.delete(schema.managedEntityAuthorityPermission)
			.where(inArray(schema.managedEntityAuthorityPermission.permissionId, ids));

		console.log("hard-deleted", deleted.rowCount, "organization authority permissions");
	},
});

import { confirm } from "@inquirer/prompts";
import { db, schema } from "@/db/index.js";
import { hashPassword, verifyPassword } from "@/lib/argon2.js";
import { FLATTENED_PERMISSIONS } from "@/lib/constants.js";
import { isPermission, quickEnv, unreachable } from "@/lib/helpers.js";
import "dotenv/config";
import { eq, inArray, type SQL, sql } from "drizzle-orm";

// === Setup 'admin' user account
const ADMIN_LOGIN_EMAIL = quickEnv("ADMIN_LOGIN_EMAIL");
const ADMIN_LOGIN_PASSWORD = quickEnv("ADMIN_LOGIN_PASSWORD");

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
		email: ADMIN_LOGIN_EMAIL,
		passwordHash: await hashPassword(ADMIN_LOGIN_PASSWORD),
	});
} else if (existingAdminAccounts.length > 1) {
	throw new Error("misconfiguration in database: more than one admin account");
} else {
	const account = existingAdminAccounts[0];
	if (account == null) unreachable();
	const emailMatch = account.email === ADMIN_LOGIN_EMAIL;
	const passwordMatch =
		account.passwordHash == null
			? false
			: await verifyPassword(account.passwordHash, ADMIN_LOGIN_PASSWORD);
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
					email: ADMIN_LOGIN_EMAIL,
					passwordHash: await hashPassword(ADMIN_LOGIN_PASSWORD),
				})
				.where(eq(schema.user.type, "admin"));
	}
}

// === Sync permissions
console.log("Setting up permissions");

const existingPermissions = await db
	.select()
	.from(schema.permission)
	.then((perms) => Object.fromEntries(perms.map((perm) => [perm.code, perm])));

const permissionsToInsert: PermissionCode[] = [];
const permissionsToUpdate: PermissionCode[] = [];
const permissionsToDelete: number[] = [];

for (const permissionCode in FLATTENED_PERMISSIONS) {
	if (!isPermission(permissionCode)) unreachable();
	if (permissionCode in existingPermissions && existingPermissions[permissionCode] != null) {
		if (FLATTENED_PERMISSIONS[permissionCode] !== existingPermissions[permissionCode].description) {
			// mismatch in display names
			permissionsToUpdate.push(permissionCode);
		} else {
			// don't care
		}
	} else {
		permissionsToInsert.push(permissionCode);
	}
}
for (const permissionCode in existingPermissions) {
	if (permissionCode in FLATTENED_PERMISSIONS) {
		// don't care. have already handled the modification state.
	} else {
		if (existingPermissions[permissionCode] == null) {
			unreachable();
		}
		permissionsToDelete.push(existingPermissions[permissionCode].id);
	}
}

console.log({ permissionsToInsert, permissionsToUpdate, permissionsToDelete });

if (
	permissionsToInsert.length > 0 &&
	(await confirm({
		message: `Insert ${permissionsToInsert.length} permissions?`,
	}))
) {
	const inserted = await db.insert(schema.permission).values(
		permissionsToInsert.map(
			(permission) =>
				({
					code: permission,
					description: FLATTENED_PERMISSIONS[permission],
				}) satisfies typeof schema.permission.$inferInsert,
		),
	);
	console.log("inserted", inserted.rowCount, "permissions");
}

if (
	permissionsToUpdate.length > 0 &&
	(await confirm({
		message: `Update ${permissionsToUpdate.length} permissions?`,
	}))
) {
	const sqlChunks: SQL[] = [];
	sqlChunks.push(sql`(case`);
	for (const permissionCode of permissionsToUpdate) {
		sqlChunks.push(
			sql`when code = '${permissionCode}' then '${FLATTENED_PERMISSIONS[permissionCode]}'`,
		);
	}
	sqlChunks.push(sql`end)`);
	const finalSql: SQL = sql.join(sqlChunks, sql.raw(" "));
	const updated = await db
		.update(schema.permission)
		.set({ description: finalSql })
		.where(inArray(schema.permission.code, permissionsToUpdate));
	console.log("updated", updated.rowCount, "permissions");
}

if (
	permissionsToDelete.length > 0 &&
	(await confirm({
		message: `Delete ${permissionsToDelete.length} permissions?`,
	}))
) {
	const hardDeleted = await db
		.delete(schema.permission)
		.where(inArray(schema.permission.id, permissionsToDelete));
	console.log("hard-deleted", hardDeleted.rowCount, "permissions");

	const hardDeletedRolePermissions = await db
		.delete(schema.rolePermission)
		.where(inArray(schema.rolePermission.permissionId, permissionsToDelete));
	console.log("hard-deleted", hardDeletedRolePermissions.rowCount, "role permissions");
}

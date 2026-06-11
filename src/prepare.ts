import { styleText } from "node:util";
import { db, schema } from "@/db/index.js";
import { FLATTENED_PERMISSIONS, IS_PROD } from "@/lib/constants.js";

export async function prepare() {
	if (!IS_PROD) {
		console.warn(styleText("yellow", "[!] skipped prepare checks"));
		return;
	}

	const localPermissions = new Set<PermissionCode>(
		Object.keys(FLATTENED_PERMISSIONS) as PermissionCode[],
	);
	const dbPermissions = await db
		.select({ code: schema.permission.code })
		.from(schema.permission)
		.then((permissions) => permissions.map((p) => p.code))
		.then((permissionCodes) => new Set(permissionCodes));
	if (
		dbPermissions.size !== localPermissions.size ||
		dbPermissions.symmetricDifference(localPermissions).size > 0
	) {
		console.error(
			styleText("red", "[x] error: mismatch in permissions local vs. db; please run 'populate'"),
		);
		throw new Error("fatal: mismatch in permissions");
	}
}

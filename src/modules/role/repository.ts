import { and, eq, inArray, isNull } from "drizzle-orm";
import { dbAction } from "@/lib/helpers.js";
import { db, schema } from "@/db/index.js";

export const findAssignmentsForRoles = dbAction(
	async (roleIds: number[], managedEntityIds: number[]) => {
		if (!roleIds.length || !managedEntityIds.length) {
			return [];
		}

		return db
			.select({
				roleId: schema.userRole.roleId,
				managedEntityId: schema.userRole.managedEntityId,
				userRoleId: schema.userRole.id,
			})
			.from(schema.userRole)
			.where(
				and(
					inArray(schema.userRole.roleId, roleIds),
					inArray(schema.userRole.managedEntityId, managedEntityIds),
					eq(schema.userRole.isActive, true),
					isNull(schema.userRole.deletedAt),
				),
			);
	},
);

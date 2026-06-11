import z from "zod";

export const setRolePermissionsSchema = z
	.object({
		permissionIds: z.array(
			z.coerce.number({ error: "Invalid permission ID" }).int({ error: "Invalid permission ID" }),
			{ error: "Invalid set of permission IDs" },
		),
	})
	.strict();

export type SetRolePermissionSchema = z.output<typeof setRolePermissionsSchema>;

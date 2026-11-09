import z from "zod";
import { FLATTENED_AUTHORITY_PERMISSIONS } from "@/lib/constants.js";

export const permissionCodeInputSchema = z
	.object({
		permissionCode: z.enum(
			Object.keys(FLATTENED_AUTHORITY_PERMISSIONS) as AuthorityPermissionCode[],
		), // todo: extract this into actual constant
	})
	.strict();

export type PermissionCodeInputSchema = z.output<typeof permissionCodeInputSchema>;

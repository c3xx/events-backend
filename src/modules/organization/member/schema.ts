import z from "zod";

export const organizationMemberScopedSchema = z
	.object({
		id: z.coerce
			.number({ error: "Invalid organization ID" })
			.int({ error: "Invalid organization ID" }),
		userId: z.coerce.number({ error: "Invalid user ID" }).int({ error: "Invalid user ID" }),
	})
	.strict();

export const getOrganizationMembersQuerySchema = z.object({
	email: z.string().optional(),
});

export const addOrganizationMemberSchema = z.object({
	userId: z.coerce.number({ error: "Invalid user ID" }).int({ error: "Invalid user ID" }),
	roleIds: z
		.array(z.coerce.number({ error: "Invalid role ID" }).int({ error: "Invalid role ID" }), {
			error: "Expected an array of role IDs",
		})
		.nonempty({ error: "Expected at least one role to be assigned to the user" }),
});

export const assignOrganizationMemberRolesSchema = z.object({
	roleIds: z
		.array(z.coerce.number({ error: "Invalid role ID" }).int({ error: "Invalid role ID" }), {
			error: "Expected an array of role IDs",
		})
		.nonempty({ error: "Expected at least one role to be assigned to the user" }),
});

export type GetOrganizationMembersQuerySchema = z.output<typeof getOrganizationMembersQuerySchema>;
export type AddOrganizationMemberSchema = z.output<typeof addOrganizationMemberSchema>;
export type AssignOrganizationMemberRolesSchema = z.output<
	typeof assignOrganizationMemberRolesSchema
>;

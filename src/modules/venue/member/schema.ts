import z from "zod";

export const venueMemberScopedSchema = z
	.object({
		id: z.coerce.number({ error: "Invalid venue ID" }).int({ error: "Invalid venue ID" }),
		userId: z.coerce.number({ error: "Invalid user ID" }).int({ error: "Invalid user ID" }),
	})
	.strict();

export const getVenueMembersQuerySchema = z.object({
	email: z.string().optional(),
});

export const addVenueMemberSchema = z.object({
	userId: z.coerce.number({ error: "Invalid user ID" }).int({ error: "Invalid user ID" }),
	roleIds: z
		.array(z.coerce.number({ error: "Invalid role ID" }).int({ error: "Invalid role ID" }), {
			error: "Expected an array of role IDs",
		})
		.nonempty({ error: "Expected at least one role to be assigned to the user" }),
});

export const assignVenueMemberRolesSchema = z.object({
	roleIds: z
		.array(z.coerce.number({ error: "Invalid role ID" }).int({ error: "Invalid role ID" }), {
			error: "Expected an array of role IDs",
		})
		.nonempty({ error: "Expected at least one role to be assigned to the user" }),
});

export type GetVenueMembersQuerySchema = z.output<typeof getVenueMembersQuerySchema>;
export type AddVenueMemberSchema = z.output<typeof addVenueMemberSchema>;
export type AssignVenueMemberRolesSchema = z.output<typeof assignVenueMemberRolesSchema>;

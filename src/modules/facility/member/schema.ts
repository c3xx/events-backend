import z from "zod";

export const facilityMemberScopedSchema = z
	.object({
		facilityId: z.coerce
			.number({ error: "Invalid facility ID" })
			.int({ error: "Invalid facility ID" }),
		userId: z.coerce.number({ error: "Invalid user ID" }).int({ error: "Invalid user ID" }),
	})
	.strict();

export const getFacilityMembersQuerySchema = z.object({
	email: z.string().optional(),
});

export const addFacilityMemberSchema = z.object({
	userId: z.coerce.number({ error: "Invalid user ID" }).int({ error: "Invalid user ID" }),
	roleIds: z
		.array(z.coerce.number({ error: "Invalid role ID" }).int({ error: "Invalid role ID" }), {
			error: "Expected an array of role IDs",
		})
		.nonempty({ error: "Expected at least one role to be assigned to the user" }),
});

export const assignFacilityMemberRolesSchema = z.object({
	roleIds: z
		.array(z.coerce.number({ error: "Invalid role ID" }).int({ error: "Invalid role ID" }), {
			error: "Expected an array of role IDs",
		})
		.nonempty({ error: "Expected at least one role to be assigned to the user" }),
});

export type GetFacilityMembersQuerySchema = z.output<typeof getFacilityMembersQuerySchema>;
export type AddFacilityMemberSchema = z.output<typeof addFacilityMemberSchema>;
export type AssignFacilityMemberRolesSchema = z.output<typeof assignFacilityMemberRolesSchema>;

import z from "zod";

export const invitationScopedSchema = z
	.object({
		eventId: z.coerce.number({ error: "Invalid event ID" }).int({ error: "Invalid event ID" }),
	})
	.strict();

export const invitationItemScopedSchema = z
	.object({
		eventId: z.coerce.number({ error: "Invalid event ID" }).int({ error: "Invalid event ID" }),
		invitationId: z.coerce
			.number({ error: "Invalid invitation ID" })
			.int({ error: "Invalid invitation ID" }),
	})
	.strict();

export const respondToInvitationSchema = z
	.object({
		userRoleId: z.coerce
			.number({ error: "Invalid user role id" })
			.int({ error: "Invalid user role id" }),
		status: z.enum(["accepted", "rejected"], {
			error: "Status must be either accepted or rejected",
		}),
	})
	.strict();

export const revokeInvitationSchema = z
	.object({
		userRoleId: z.coerce
			.number({ error: "Invalid user role ID" })
			.int({ error: "Invalid user role ID" }),
	})
	.strict();

export type InvitationScopedSchema = z.output<typeof invitationScopedSchema>;
export type InvitationItemScopedSchema = z.output<typeof invitationItemScopedSchema>;
export type RespondToInvitationSchema = z.output<typeof respondToInvitationSchema>;
export type RevokeInvitationSchema = z.output<typeof revokeInvitationSchema>;

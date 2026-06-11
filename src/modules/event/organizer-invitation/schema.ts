import z from "zod";
import { idLike } from "@/lib/helpers.js";

export const invitationItemScopedSchema = z
	.object({
		id: idLike("Invalid event ID"),
		invitationId: idLike("Invalid invitation ID"),
	})
	.strict();

export const respondToInvitationSchema = z
	.object({
		userRoleId: idLike("Invalid user role id"),
		status: z.enum(["accepted", "rejected"], {
			error: "Status must be either accepted or rejected",
		}),
	})
	.strict();

export const revokeInvitationSchema = z
	.object({
		userRoleId: idLike("Invalid user role ID"),
	})
	.strict();

export type InvitationItemScopedSchema = z.output<typeof invitationItemScopedSchema>;
export type RespondToInvitationSchema = z.output<typeof respondToInvitationSchema>;
export type RevokeInvitationSchema = z.output<typeof revokeInvitationSchema>;

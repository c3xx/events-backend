import z from "zod";
import { idLike } from "@/lib/helpers.js";

export const invitationScopedSchema = z
	.object({
		invitationId: idLike("Invalid invitation ID"),
	})
	.strict();

export const respondToInvitationSchema = z
	.object({
		roleId: idLike("Invalid role ID"),
		status: z.enum(["accepted", "rejected"], {
			error: "Status must be either accepted or rejected",
		}),
	})
	.strict();

export type RespondToInvitationSchema = z.output<typeof respondToInvitationSchema>;

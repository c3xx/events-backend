import z from "zod";
import { idLike } from "@/lib/helpers.js";
import { eventScopedSchema } from "@/modules/event/schema.js";

export const invitationItemScopedSchema = eventScopedSchema
	.extend({
		invitationId: idLike("Invalid invitation ID"),
	})
	.strict();

export const revokeInvitationSchema = z
	.object({
		roleId: idLike("Invalid role ID"),
	})
	.strict();

export type InvitationItemScopedSchema = z.output<typeof invitationItemScopedSchema>;
export type RevokeInvitationSchema = z.output<typeof revokeInvitationSchema>;

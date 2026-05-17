import z from "zod";

export const invitationScopedSchema = z
	.object({
		eventId: z.coerce.number({ error: "Invalid event ID" }),
	})
	.strict();

export const invitationItemScopedSchema = z
	.object({
		eventId: z.coerce.number({ error: "Invalid event ID" }),
		invitationId: z.coerce.number({ error: "Invalid invitation ID" }),
	})
	.strict();

export const sendInvitationSchema = z
	.object({
		recipientOrganizationId: z.int({ error: "Invalid organization ID" }),
	})
	.strict();

export const respondToInvitationSchema = z
	.object({
		status: z.enum(["accepted", "rejected"], {
			error: "Status must be either accepted or rejected",
		}),
	})
	.strict();

export type InvitationScopedSchema = z.output<typeof invitationScopedSchema>;
export type InvitationItemScopedSchema = z.output<typeof invitationItemScopedSchema>;
export type SendInvitationSchema = z.output<typeof sendInvitationSchema>;
export type RespondToInvitationSchema = z.output<typeof respondToInvitationSchema>;

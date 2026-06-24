import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getEventInvitations = dbAction(async (eventId: number) => {
	return await db.query.eventOrganizerInvitation.findMany({
		where: and(
			eq(schema.eventOrganizerInvitation.eventId, eventId),
			isNull(schema.eventOrganizerInvitation.deletedAt),
		),
		columns: {
			id: true,
			status: true,
			invitedAt: true,
			closedAt: true,
		},
		with: {
			senderOrganization: {
				columns: { id: true, name: true },
			},
			recipientOrganization: {
				columns: { id: true, name: true },
			},
			invitedByUser: {
				columns: { id: true },
				with: {
					user: { columns: { id: true, fullName: true } },
				},
			},
		},
	});
});

export const findInvitationById = dbAction(async (eventId: number, invitationId: number) => {
	const [invitation] = await db
		.select({
			id: schema.eventOrganizerInvitation.id,
			status: schema.eventOrganizerInvitation.status,
			senderOrganizationId: schema.eventOrganizerInvitation.senderOrganizationId,
			recipientOrganizationId: schema.eventOrganizerInvitation.recipientOrganizationId,
		})
		.from(schema.eventOrganizerInvitation)
		.where(
			and(
				eq(schema.eventOrganizerInvitation.id, invitationId),
				eq(schema.eventOrganizerInvitation.eventId, eventId),
				isNull(schema.eventOrganizerInvitation.deletedAt),
			),
		)
		.limit(1);

	return invitation;
});

export const findPendingInvitation = dbAction(
	async (eventId: number, recipientOrganizationId: number) => {
		const [invitation] = await db
			.select({
				id: schema.eventOrganizerInvitation.id,
			})
			.from(schema.eventOrganizerInvitation)
			.where(
				and(
					eq(schema.eventOrganizerInvitation.eventId, eventId),
					eq(schema.eventOrganizerInvitation.recipientOrganizationId, recipientOrganizationId),
					eq(schema.eventOrganizerInvitation.status, "pending"),
					isNull(schema.eventOrganizerInvitation.deletedAt),
				),
			)
			.limit(1);
		return invitation;
	},
);

export const sendInvitation = dbAction(
	async (data: {
		eventId: number;
		invitedByUserId: number;
		senderOrganizationId: number;
		recipientOrganizationId: number;
		intendedRole: "co_host";
	}) => {
		const [inserted] = await db
			.insert(schema.eventOrganizerInvitation)
			.values({
				eventId: data.eventId,
				invitedByUserId: data.invitedByUserId,
				senderOrganizationId: data.senderOrganizationId,
				intendedRole: data.intendedRole,
				recipientOrganizationId: data.recipientOrganizationId,
			})
			.returning({ id: schema.eventOrganizerInvitation.id });

		if (inserted == null) unreachable();
		return inserted;
	},
);

export const revokeInvitation = dbAction(async (eventId: number, invitationId: number) => {
	await db
		.update(schema.eventOrganizerInvitation)
		.set({
			status: "revoked",
			closedAt: new Date().toISOString(),
		})
		.where(
			and(
				eq(schema.eventOrganizerInvitation.id, invitationId),
				eq(schema.eventOrganizerInvitation.eventId, eventId),
				isNull(schema.eventOrganizerInvitation.deletedAt),
			),
		);
});

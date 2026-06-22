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

export const respondToInvitation = dbAction(
	async (
		eventId: number,
		invitationId: number,
		data: {
			status: "accepted" | "rejected";
			respondedByUserId: number;
			recipientOrganizationId: number;
		},
	) => {
		const updated = await db.transaction(async (tx) => {
			const [updated] = await tx
				.update(schema.eventOrganizerInvitation)
				.set({
					status: data.status,
					respondedByUserId: data.respondedByUserId,
					closedAt: new Date().toISOString(),
				})
				.where(
					and(
						eq(schema.eventOrganizerInvitation.id, invitationId),
						isNull(schema.eventOrganizerInvitation.deletedAt),
					),
				)
				.returning({
					id: schema.eventOrganizerInvitation.id,
					intendedRole: schema.eventOrganizerInvitation.intendedRole,
				});

			if (updated == null) unreachable();

			if (data.status === "accepted") {
				await tx.insert(schema.eventOrganizer).values({
					eventId: eventId,
					organizationId: data.recipientOrganizationId,
					invitationId: invitationId,
					role: updated.intendedRole,
				});
			}

			return { id: updated.id };
		});
		return updated;
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

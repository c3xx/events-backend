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

export const findInvitationById = dbAction(async (invitationId: number) => {
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

export const findEventOrganizerUser = dbAction(
	async (eventId: number, userId: number, userRoleId: number) => {
		const [result] = await db
			.select({
				userRoleId: schema.userRole.id,
				organizationId: schema.eventOrganizer.organizationId,
			})
			.from(schema.userRole)
			.innerJoin(
				schema.managedEntity,
				and(
					eq(schema.managedEntity.id, schema.userRole.managedEntityId),
					eq(schema.managedEntity.managedEntityType, "organization"),
				),
			)
			.innerJoin(
				schema.eventOrganizer,
				and(
					eq(schema.eventOrganizer.organizationId, schema.managedEntity.refId),
					eq(schema.eventOrganizer.eventId, eventId),
					isNull(schema.eventOrganizer.deletedAt),
				),
			)

			.where(
				and(
					eq(schema.userRole.id, userRoleId),
					eq(schema.userRole.userId, userId),
					isNull(schema.userRole.deletedAt),
				),
			)
			.limit(1);
		return result;
	},
);

export const findUserRoleInOrganization = dbAction(
	async (userId: number, userRoleId: number, organizationId: number) => {
		const [result] = await db
			.select({ userRoleId: schema.userRole.id })
			.from(schema.userRole)
			.innerJoin(
				schema.managedEntity,
				and(
					eq(schema.managedEntity.id, schema.userRole.managedEntityId),
					eq(schema.managedEntity.managedEntityType, "organization"),
					eq(schema.managedEntity.refId, organizationId),
				),
			)
			.where(
				and(
					eq(schema.userRole.id, userRoleId),
					eq(schema.userRole.userId, userId),
					isNull(schema.userRole.deletedAt),
				),
			)
			.limit(1);
		return result;
	},
);

export const sendInvitation = dbAction(
	async (data: {
		eventId: number;
		invitedByUserId: number;
		senderOrganizationId: number;
		recipientOrganizationId: number;
	}) => {
		const [inserted] = await db
			.insert(schema.eventOrganizerInvitation)
			.values(data)
			.returning({ id: schema.eventOrganizerInvitation.id });

		if (inserted == null) unreachable();
		return inserted;
	},
);

export const respondToInvitation = dbAction(
	async (
		invitationId: number,
		data: {
			status: "accepted" | "rejected";
			respondedByUserId: number;
			eventId: number;
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
				.where(eq(schema.eventOrganizerInvitation.id, invitationId))
				.returning({
					id: schema.eventOrganizerInvitation.id,
					status: schema.eventOrganizerInvitation.status,
				});

			if (updated == null) unreachable();

			if (data.status === "accepted") {
				await tx.insert(schema.eventOrganizer).values({
					eventId: data.eventId,
					organizationId: data.recipientOrganizationId,
					role: "co_host",
				});
			}
			return updated;
		});
		return updated;
	},
);
export const revokeInvitation = dbAction(async (invitationId: number) => {
	await db
		.update(schema.eventOrganizerInvitation)
		.set({
			status: "revoked",
			closedAt: new Date().toISOString(),
		})
		.where(eq(schema.eventOrganizerInvitation.id, invitationId));
});

import { and, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { jsonAgg, jsonBuildObject, jsonBuildObjectNullable } from "@/db/helpers.js";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const findPendingInvitationsForUser = dbAction(
	async (data: { userId: number; organizationIds: number[] }) => {
		const senderOrganization = alias(schema.organization, "senderOrganization");
		const senderOrganizationType = alias(schema.organizationType, "senderOrganizationType");
		const recipientOrganization = alias(schema.organization, "recipientOrganization");
		const recipientOrganizationType = alias(schema.organizationType, "recipientOrganizationType");

		return await db
			.select({
				id: schema.eventOrganizerInvitation.id,
				intendedRole: schema.eventOrganizerInvitation.intendedRole,
				invitedAt: schema.eventOrganizerInvitation.invitedAt,

				event: {
					id: schema.event.id,
					title: schema.event.title,
					createdAt: schema.event.createdAt,
					startsAt: schema.event.startsAt,
					endsAt: schema.event.endsAt,
					type: jsonBuildObject({
						id: schema.eventType.id,
						name: schema.eventType.name,
					}),
					category: jsonBuildObject({
						id: schema.eventCategory.id,
						name: schema.eventCategory.name,
					}),
				},
				sender: {
					id: schema.user.id,
					fullName: schema.user.fullName,
					role: jsonBuildObject({
						id: schema.role.id,
						name: schema.role.name,
						// scope: sql<{
						// 	type: "organization" | "venue";
						// 	kindId: number;
						// 	kindName: string;
						// }>`case
						// 	when ${schema.role.managedEntityType} = 'organization'
						// 	then (
						// 		select json_build_object('type', ${schema.role.managedEntityType}, 'kindId', ot.id, 'kindName', ot.name)
						// 		from organization_type ot where ot.id = ${schema.role.typeRefId} limit 1
						// 	)
						// 	when ${schema.role.managedEntityType} = 'venue'
						// 	then (
						// 		select json_build_object('type', ${schema.role.managedEntityType}, 'kindId', vt.id, 'kindName', vt.name)
						// 		from venue_type vt where vt.id = ${schema.role.typeRefId} limit 1
						// 	)
						// 	else null
						// end`,
					}),
					organization: jsonBuildObject({
						id: senderOrganization.id,
						name: senderOrganization.name,
						type: jsonBuildObject({
							id: senderOrganizationType.id,
							name: senderOrganizationType.name,
						}),
					}),
				},
				recipientOrganization: {
					id: recipientOrganization.id,
					name: recipientOrganization.name,
					type: jsonBuildObject({
						id: recipientOrganizationType.id,
						name: recipientOrganizationType.name,
					}),
				},
			})
			.from(schema.eventOrganizerInvitation)
			.innerJoin(schema.event, eq(schema.event.id, schema.eventOrganizerInvitation.eventId))
			.innerJoin(schema.eventType, eq(schema.eventType.id, schema.event.typeId))
			.innerJoin(schema.eventCategory, eq(schema.eventCategory.id, schema.event.categoryId))
			.innerJoin(
				schema.userRole,
				eq(schema.userRole.id, schema.eventOrganizerInvitation.invitedByUserId),
			)
			.innerJoin(schema.user, eq(schema.user.id, schema.userRole.userId))
			.innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
			.innerJoin(
				senderOrganization,
				eq(senderOrganization.id, schema.eventOrganizerInvitation.senderOrganizationId),
			)
			.innerJoin(
				senderOrganizationType,
				eq(senderOrganizationType.id, senderOrganization.organizationTypeId),
			)
			.innerJoin(
				recipientOrganization,
				eq(recipientOrganization.id, schema.eventOrganizerInvitation.recipientOrganizationId),
			)
			.innerJoin(
				recipientOrganizationType,
				eq(recipientOrganizationType.id, recipientOrganization.organizationTypeId),
			)
			.where(
				and(
					eq(schema.event.status, "draft"),
					eq(schema.eventOrganizerInvitation.status, "pending"),
					isNull(schema.eventOrganizerInvitation.deletedAt),
					inArray(schema.eventOrganizerInvitation.recipientOrganizationId, data.organizationIds),
				),
			)
			.groupBy(
				schema.event.id,
				schema.eventType.id,
				schema.eventCategory.id,
				schema.user.id,
				schema.role.id,
				schema.eventOrganizerInvitation.id,
				senderOrganization.id,
				senderOrganizationType.id,
				recipientOrganization.id,
				recipientOrganizationType.id,
			);
	},
);

export const findPendingInvitationById = dbAction(async (invitationId: number) => {
	const senderOrganization = alias(schema.organization, "senderOrganization");
	const senderOrganizationType = alias(schema.organizationType, "senderOrganizationType");
	const recipientOrganization = alias(schema.organization, "recipientOrganization");
	const recipientOrganizationType = alias(schema.organizationType, "recipientOrganizationType");
	const parentEvent = alias(schema.event, "parentEvent");

	const [invitation] = await db
		.select({
			id: schema.eventOrganizerInvitation.id,
			intendedRole: schema.eventOrganizerInvitation.intendedRole,
			invitedAt: schema.eventOrganizerInvitation.invitedAt,

			event: {
				id: schema.event.id,
				title: schema.event.title,
				requestDetails: schema.event.requestDetails,
				expectedParticipants: schema.event.expectedParticipants,
				createdAt: schema.event.createdAt,
				startsAt: schema.event.startsAt,
				endsAt: schema.event.endsAt,
				parentEvent: jsonBuildObjectNullable(
					{
						id: parentEvent.id,
						title: parentEvent.title,
					},
					parentEvent.id,
				),
				type: jsonBuildObject({
					id: schema.eventType.id,
					name: schema.eventType.name,
					collaborationPolicy: schema.eventType.collaborationPolicy,
					venuePolicy: schema.eventType.venuePolicy,
				}),
				category: jsonBuildObject({
					id: schema.eventCategory.id,
					name: schema.eventCategory.name,
				}),
				organizers: jsonAgg(
					jsonBuildObject({
						id: schema.eventOrganizer.id,
						role: schema.eventOrganizer.role,
						organization: jsonBuildObject({
							id: schema.organization.id,
							name: schema.organization.name,
						}),
					}),
				),
			},
			sender: {
				id: schema.user.id,
				fullName: schema.user.fullName,
				role: jsonBuildObject({
					id: schema.role.id,
					name: schema.role.name,
				}),
				organization: jsonBuildObject({
					id: senderOrganization.id,
					name: senderOrganization.name,
					type: jsonBuildObject({
						id: senderOrganizationType.id,
						name: senderOrganizationType.name,
					}),
				}),
			},
			recipientOrganization: {
				id: recipientOrganization.id,
				name: recipientOrganization.name,
				type: jsonBuildObject({
					id: recipientOrganizationType.id,
					name: recipientOrganizationType.name,
				}),
			},
		})
		.from(schema.eventOrganizerInvitation)
		.innerJoin(schema.event, eq(schema.event.id, schema.eventOrganizerInvitation.eventId))
		.leftJoin(parentEvent, eq(parentEvent.id, schema.event.parentEventId))
		.innerJoin(schema.eventType, eq(schema.eventType.id, schema.event.typeId))
		.innerJoin(schema.eventCategory, eq(schema.eventCategory.id, schema.event.categoryId))
		.innerJoin(schema.eventOrganizer, eq(schema.eventOrganizer.eventId, schema.event.id))
		.innerJoin(
			schema.organization,
			eq(schema.organization.id, schema.eventOrganizer.organizationId),
		)
		.innerJoin(
			schema.userRole,
			eq(schema.userRole.id, schema.eventOrganizerInvitation.invitedByUserId),
		)
		.innerJoin(schema.user, eq(schema.user.id, schema.userRole.userId))
		.innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
		.innerJoin(
			senderOrganization,
			eq(senderOrganization.id, schema.eventOrganizerInvitation.senderOrganizationId),
		)
		.innerJoin(
			senderOrganizationType,
			eq(senderOrganizationType.id, senderOrganization.organizationTypeId),
		)
		.innerJoin(
			recipientOrganization,
			eq(recipientOrganization.id, schema.eventOrganizerInvitation.recipientOrganizationId),
		)
		.innerJoin(
			recipientOrganizationType,
			eq(recipientOrganizationType.id, recipientOrganization.organizationTypeId),
		)
		.where(
			and(
				eq(schema.eventOrganizerInvitation.id, invitationId),
				eq(schema.event.status, "draft"),
				eq(schema.eventOrganizerInvitation.status, "pending"),
				isNull(schema.eventOrganizerInvitation.deletedAt),
			),
		)
		.groupBy(
			schema.event.id,
			schema.eventType.id,
			schema.eventCategory.id,
			schema.user.id,
			schema.role.id,
			schema.eventOrganizerInvitation.id,
			senderOrganization.id,
			senderOrganizationType.id,
			recipientOrganization.id,
			recipientOrganizationType.id,
			parentEvent.id,
		)
		.limit(1);

	return invitation;
});

export const findPendingInvitationByIdSimple = dbAction(async (invitationId: number) => {
	const [invitation] = await db
		.select({
			id: schema.eventOrganizerInvitation.id,
			status: schema.eventOrganizerInvitation.status,
			eventId: schema.event.id,
			senderOrganizationId: schema.eventOrganizerInvitation.senderOrganizationId,
			recipientOrganizationId: schema.eventOrganizerInvitation.recipientOrganizationId,
		})
		.from(schema.eventOrganizerInvitation)
		.innerJoin(schema.event, eq(schema.event.id, schema.eventOrganizerInvitation.eventId))
		.where(
			and(
				eq(schema.eventOrganizerInvitation.id, invitationId),
				eq(schema.event.status, "draft"),
				eq(schema.eventOrganizerInvitation.status, "pending"),
				isNull(schema.eventOrganizerInvitation.deletedAt),
			),
		)
		.limit(1);

	return invitation;
});

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
		await db.transaction(async (tx) => {
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
						eq(schema.eventOrganizerInvitation.eventId, eventId),
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
		});
	},
);

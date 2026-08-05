import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { jsonAggDistinct, jsonBuildObject, jsonBuildObjectNullable } from "@/db/helpers.js";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const findEventReportData = dbAction(async (eventId: number) => {
	const [event, latestInstance] = await Promise.all([
		db.query.event.findFirst({
			where: and(eq(schema.event.id, eventId), isNull(schema.event.deletedAt)),
			columns: {
				id: true,
				title: true,
				requestDetails: true,
				status: true,
				startsAt: true,
				endsAt: true,
			},
			with: {
				category: {
					columns: { name: true },
				},
				creator: {
					columns: { fullName: true, email: true },
				},
				organizers: {
					where: isNull(schema.eventOrganizer.deletedAt),
					columns: { role: true },
					with: {
						organization: {
							columns: { id: true, name: true },
						},
					},
				},
				invitations: {
					where: and(
						eq(schema.eventOrganizerInvitation.status, "accepted"),
						isNull(schema.eventOrganizerInvitation.deletedAt),
					),
					with: {
						recipientOrganization: {
							columns: { id: true, name: true },
						},
						respondedByUser: {
							with: {
								user: {
									columns: { fullName: true, email: true },
								},
							},
						},
					},
				},
				venueAllotments: {
					where: isNull(schema.venueAllotment.deletedAt),
					columns: { startsAt: true, endsAt: true },
					with: {
						venue: {
							columns: { id: true, name: true },
							with: {
								facilities: {
									where: eq(schema.venueFacility.isActive, true),
									columns: {},
									with: {
										facility: { columns: { id: true, name: true } },
									},
								},
							},
						},
					},
				},
				report: {
					columns: { details: true, participantsCount: true },
					with: {
						images: {
							columns: { imageUrl: true },
						},
					},
				},
			},
		}),
		db
			.select({ id: schema.workflowInstance.id })
			.from(schema.workflowInstance)
			.where(
				and(
					eq(schema.workflowInstance.eventId, eventId),
					eq(schema.workflowInstance.status, "completed"),
					isNull(schema.workflowInstance.deletedAt),
				),
			)
			.orderBy(sql`${schema.workflowInstance.completedAt} DESC`)
			.limit(1)
			.then((rows) => rows[0]),
	]);

	if (!event) return null;

	const approvedSteps = latestInstance
		? await db
				.select({
					stepId: schema.workflowInstanceStep.id,
					stepName: schema.workflowInstanceStep.name,
					stepCompletedAt: schema.workflowInstanceStep.completedAt,
					roleName: schema.role.name,
					approverName: schema.user.fullName,
					approverEmail: schema.user.email,
					status: schema.workflowInstanceStepAssignment.status,
					completedAt: schema.workflowInstanceStepAssignment.completedAt,
				})
				.from(schema.workflowInstanceStep)
				.innerJoin(
					schema.workflowInstanceStepRole,
					eq(schema.workflowInstanceStepRole.stepId, schema.workflowInstanceStep.id),
				)
				.innerJoin(
					schema.workflowInstanceStepTargetGroup,
					eq(schema.workflowInstanceStepTargetGroup.stepRoleId, schema.workflowInstanceStepRole.id),
				)
				.innerJoin(
					schema.workflowInstanceStepAssignment,
					eq(
						schema.workflowInstanceStepAssignment.targetGroupId,
						schema.workflowInstanceStepTargetGroup.id,
					),
				)
				.innerJoin(
					schema.userRole,
					eq(schema.userRole.id, schema.workflowInstanceStepAssignment.userRoleId),
				)
				.innerJoin(schema.user, eq(schema.user.id, schema.userRole.userId))
				.innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
				.where(
					and(
						eq(schema.workflowInstanceStep.instanceId, latestInstance.id),
						eq(schema.workflowInstanceStepAssignment.status, "approved"),
						isNull(schema.workflowInstanceStep.deletedAt),
						isNull(schema.workflowInstanceStepRole.deletedAt),
						isNull(schema.workflowInstanceStepTargetGroup.deletedAt),
						isNull(schema.workflowInstanceStepAssignment.deletedAt),
					),
				)
		: [];

	return {
		...event,
		approvedSteps,
	};
});

const EVENT_ASSOCIATED_FACILITIES_KEY = Symbol("event associated facilities");

export const createEvent = dbAction(
	async (data: {
		organizationId: number;
		title: string;
		typeId: number;
		categoryId: number;
		expectedParticipants: number;
		requestDetails: string;
		startsAt: string;
		endsAt: string;
		parentEventId: number | null | undefined;
		createdBy: number;
	}) => {
		return await db.transaction(async (tx) => {
			const [event] = await tx
				.insert(schema.event)
				.values({
					title: data.title,
					typeId: data.typeId,
					categoryId: data.categoryId,
					expectedParticipants: data.expectedParticipants,
					requestDetails: data.requestDetails,
					status: "draft",
					startsAt: data.startsAt,
					endsAt: data.endsAt,
					parentEventId: data.parentEventId,
					createdBy: data.createdBy,
				})
				.returning({
					id: schema.event.id,
				});
			if (event == null) unreachable();

			const [organizer] = await tx
				.insert(schema.eventOrganizer)
				.values({
					eventId: event.id,
					organizationId: data.organizationId,
					role: "host",
				})
				.returning({ id: schema.eventOrganizer.id });
			if (organizer == null) unreachable();

			return event;
		});
	},
);

export const findEvents = dbAction(
	async (filter: {
		organizationIds: number[];
		status?: EventStatus[] | undefined;
		typeId?: number | undefined;
	}) => {
		const parentEvent = alias(schema.event, "parentEvent");

		return await db
			.select({
				id: schema.event.id,
				title: schema.event.title,
				status: schema.event.status,
				createdAt: schema.event.createdAt,
				startsAt: schema.event.startsAt,
				type: {
					id: schema.eventType.id,
					name: schema.eventType.name,
				},
				category: {
					id: schema.eventCategory.id,
					name: schema.eventCategory.name,
				},
				parentEvent: {
					id: parentEvent.id,
					title: parentEvent.title,
				},
				organizers: sql<
					{
						id: number;
						role: EventOrganizerRole;
						organization: {
							id: number;
							name: string;
						};
					}[]
				>`json_agg(json_build_object('id', ${schema.eventOrganizer.id}, 'role', ${schema.eventOrganizer.role}, 'organization', json_build_object('id', ${schema.organization.id}, 'name', ${schema.organization.name})))`,
			})
			.from(schema.event)
			.innerJoin(schema.eventCategory, eq(schema.event.categoryId, schema.eventCategory.id))
			.innerJoin(schema.eventType, eq(schema.event.typeId, schema.eventType.id))
			.leftJoin(parentEvent, eq(schema.event.parentEventId, parentEvent.id))
			.innerJoin(
				schema.eventOrganizer,
				and(
					eq(schema.eventOrganizer.eventId, schema.event.id),
					isNull(schema.eventOrganizer.deletedAt),
				),
			)
			.innerJoin(
				schema.organization,
				and(
					eq(schema.organization.id, schema.eventOrganizer.organizationId),
					isNull(schema.organization.deletedAt),
				),
			)
			.where(
				and(
					inArray(
						schema.organization.id,
						filter.organizationIds,
						// db
						// 	.selectDistinct({ id: schema.organization.id })
						// 	.from(schema.userRole)
						// 	.innerJoin(
						// 		schema.managedEntity,
						// 		and(
						// 			eq(schema.managedEntity.id, schema.userRole.managedEntityId),
						// 			eq(schema.managedEntity.managedEntityType, "organization"),
						// 		),
						// 	)
						// 	.innerJoin(
						// 		schema.organization,
						// 		eq(schema.organization.id, schema.managedEntity.refId),
						// 	)
						// 	.where(eq(schema.userRole.userId, 7)),
					),

					filter.status != null ? inArray(schema.event.status, filter.status) : undefined,
					filter.typeId != null ? eq(schema.event.typeId, filter.typeId) : undefined,

					isNull(schema.event.deletedAt),
				),
			)
			.groupBy(schema.event.id, schema.eventType.id, schema.eventCategory.id, parentEvent.id)
			.orderBy(schema.event.startsAt);
	},
);

export const findEventById = dbAction(async (eventId: number) => {
	const parentEvent = alias(schema.event, "parent_event");

	const [eventDetails] = await db
		.select({
			id: schema.event.id,
			title: schema.event.title,
			expectedParticipants: schema.event.expectedParticipants,
			requestDetails: schema.event.requestDetails,
			status: schema.event.status,
			createdAt: schema.event.createdAt,
			startsAt: schema.event.startsAt,
			endsAt: schema.event.endsAt,

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
			parentEvent: jsonBuildObjectNullable(
				{
					id: parentEvent.id,
					title: parentEvent.title,
				},
				parentEvent.id,
			),
			organizers: jsonAggDistinct(
				jsonBuildObject({
					id: schema.eventOrganizer.id,
					role: schema.eventOrganizer.role,
					organization: jsonBuildObject({
						id: schema.organization.id,
						name: schema.organization.name,
					}),
				}),
			),
			venueAllotments: jsonAggDistinct(
				jsonBuildObject({
					id: schema.venueAllotment.id,
					startsAt: schema.venueAllotment.startsAt,
					endsAt: schema.venueAllotment.endsAt,
					venue: jsonBuildObject({
						id: schema.venue.id,
						name: schema.venue.name,
					}),
				}),
				schema.venueAllotment.id,
			),
			facilityAssignments: jsonAggDistinct(
				jsonBuildObject({
					id: schema.eventFacility.id,
					venueAllotmentId: schema.eventFacility.venueAllotmentId,
					facility: jsonBuildObject({
						id: schema.facility.id,
						name: schema.facility.name,
						type: jsonBuildObject({
							id: schema.facilityType.id,
							name: schema.facilityType.name,
						}),
						isAvailable: schema.facility.isAvailable,
					}),
				}),
				schema.eventFacility.id,
			),
		})
		.from(schema.event)
		.innerJoin(
			schema.eventType,
			and(eq(schema.event.typeId, schema.eventType.id), isNull(schema.eventType.deletedAt)),
		)
		.innerJoin(
			schema.eventCategory,
			and(
				eq(schema.event.categoryId, schema.eventCategory.id),
				isNull(schema.eventCategory.deletedAt),
			),
		)
		.leftJoin(
			parentEvent,
			and(eq(schema.event.parentEventId, parentEvent.id), isNull(parentEvent.deletedAt)),
		)
		.innerJoin(
			schema.eventOrganizer,
			and(
				eq(schema.event.id, schema.eventOrganizer.eventId),
				isNull(schema.eventOrganizer.deletedAt),
			),
		)
		.innerJoin(
			schema.organization,
			and(
				eq(schema.eventOrganizer.organizationId, schema.organization.id),
				isNull(schema.organization.deletedAt),
			),
		)
		.leftJoin(
			schema.venueAllotment,
			and(
				eq(schema.venueAllotment.eventId, schema.event.id),
				isNull(schema.venueAllotment.deletedAt),
			),
		)
		.leftJoin(
			schema.venue,
			and(eq(schema.venueAllotment.venueId, schema.venue.id), isNull(schema.venue.deletedAt)),
		)
		.leftJoin(
			schema.eventFacility,
			and(
				eq(schema.eventFacility.eventId, schema.event.id),
				isNull(schema.eventFacility.deletedAt),
			),
		)
		.leftJoin(
			schema.facility,
			and(
				eq(schema.facility.id, schema.eventFacility.facilityId),
				isNull(schema.facility.deletedAt),
			),
		)
		.leftJoin(
			schema.facilityType,
			and(
				eq(schema.facilityType.id, schema.facility.typeId),
				isNull(schema.facilityType.deletedAt),
			),
		)
		.where(and(eq(schema.event.id, eventId), isNull(schema.event.deletedAt)))
		.limit(1)
		.groupBy(schema.event.id, schema.eventType.id, schema.eventCategory.id, parentEvent.id);

	if (eventDetails == null) return eventDetails;

	const { facilityAssignments, ...event } = eventDetails;

	const grouped = facilityAssignments.reduce(
		(grouped, facilityAssignment) => {
			const key = facilityAssignment.venueAllotmentId ?? EVENT_ASSOCIATED_FACILITIES_KEY;
			grouped[key] ??= [];
			grouped[key].push(facilityAssignment);
			return grouped;
		},
		{} as Record<
			number | symbol,
			{
				id: number;
				venueAllotmentId: number | null;
				facility: {
					id: number;
					name: string;
					type: {
						id: number;
						name: string;
					};
					isAvailable: boolean;
				};
			}[]
		>,
	);

	return {
		...event,
		venueAllotments: eventDetails.venueAllotments.map((venueAllotment) => ({
			...venueAllotment,
			facilities: grouped[venueAllotment.id] ?? [],
		})),
		facilities: grouped[EVENT_ASSOCIATED_FACILITIES_KEY] ?? [],
	};
});

export const findEventOrganizerOrgIds = dbAction(async (eventId: number) => {
	const rows = await db
		.select({ organizationId: schema.eventOrganizer.organizationId })
		.from(schema.eventOrganizer)
		.where(
			and(eq(schema.eventOrganizer.eventId, eventId), isNull(schema.eventOrganizer.deletedAt)),
		);
	return rows.map((r) => r.organizationId);
});

export const updateEvent = dbAction(
	async (data: {
		id: number;
		title?: string | undefined;
		typeId?: number | undefined;
		categoryId?: number | undefined;
		expectedParticipants?: number | undefined;
		requestDetails?: string | undefined;
		parentEventId?: number | null | undefined;
		startsAt?: string | undefined;
		endsAt?: string | undefined;
	}) => {
		const [updated] = await db
			.update(schema.event)
			.set({
				title: data.title,
				typeId: data.typeId,
				categoryId: data.categoryId,
				expectedParticipants: data.expectedParticipants,
				requestDetails: data.requestDetails,
				parentEventId: data.parentEventId,
				startsAt: data.startsAt,
				endsAt: data.endsAt,
			})
			.where(
				and(
					eq(schema.event.id, data.id),
					eq(schema.event.status, "draft"),
					isNull(schema.event.deletedAt),
				),
			)
			.returning({ id: schema.event.id });

		if (updated == null) unreachable();

		return updated;
	},
);

export const findParentableEvents = dbAction(
	async (data: { typeId: number; organizationId: number }) => {
		return await db
			.select({ id: schema.event.id, title: schema.event.title })
			.from(schema.event)
			.innerJoin(
				schema.eventOrganizer,
				and(
					eq(schema.event.id, schema.eventOrganizer.eventId),
					eq(schema.eventOrganizer.organizationId, data.organizationId),
					inArray(schema.eventOrganizer.role, ["host", "co_host"]),
					isNull(schema.eventOrganizer.deletedAt),
				),
			)
			.innerJoin(
				schema.eventTypeAllowedParent,
				and(
					eq(schema.eventTypeAllowedParent.parentTypeId, schema.event.typeId),
					eq(schema.eventTypeAllowedParent.childTypeId, data.typeId),
				),
			)
			.where(
				and(
					eq(schema.event.status, "approved"),
					gt(schema.event.endsAt, sql`now()`),
					isNull(schema.event.deletedAt),
				),
			);
	},
);

// export const getOrganizationEvents = dbAction(async (organizationId: number) => {
// 	return await db
// 		.select({
// 			id: schema.event.id,
// 			eventTitle: schema.event.eventTitle,
// 			eventType: schema.eventType.name,
// 			status: schema.event.status,
// 			parentEventId: schema.event.parentEventId,
// 			parentEventTitle: parentEvent.eventTitle,
// 			startsAt: schema.event.startsAt,
// 		})
// 		.from(schema.eventOrganizer)
// 		.innerJoin(schema.event, eq(schema.eventOrganizer.eventId, schema.event.id))
// 		.innerJoin(schema.eventType, eq(schema.event.eventTypeId, schema.eventType.id))
// 		.leftJoin(parentEvent, eq(schema.event.parentEventId, parentEvent.id))
// 		.where(eq(schema.eventOrganizer.organizationId, organizationId))
// 		.orderBy(schema.event.startsAt);
// });

export const discardDraftEvent = dbAction(async (eventId: number) => {
	await db.transaction(async (tx) => {
		await tx
			.update(schema.event)
			.set({ deletedAt: sql`now()` })
			.where(and(eq(schema.event.id, eventId), isNull(schema.event.deletedAt)));

		await tx
			.update(schema.eventOrganizer)
			.set({ deletedAt: sql`now()` })
			.where(
				and(eq(schema.eventOrganizer.eventId, eventId), isNull(schema.eventOrganizer.deletedAt)),
			);

		await tx
			.update(schema.venueAllotment)
			.set({ deletedAt: sql`now()` })
			.where(
				and(eq(schema.venueAllotment.eventId, eventId), isNull(schema.venueAllotment.deletedAt)),
			);

		await tx
			.update(schema.eventOrganizerInvitation)
			.set({ deletedAt: sql`now()` })
			.where(
				and(
					eq(schema.eventOrganizerInvitation.eventId, eventId),
					isNull(schema.eventOrganizerInvitation.deletedAt),
				),
			);
	});
});

export const cancelApprovedEvent = dbAction(async (eventId: number) => {
	const [updated] = await db
		.update(schema.event)
		.set({ status: "cancelled" })
		.where(
			and(
				eq(schema.event.id, eventId),
				eq(schema.event.status, "approved"),
				isNull(schema.event.deletedAt),
			),
		)
		.returning({ id: schema.event.id });
	return updated;
});

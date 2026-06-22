
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "./src/db/index.js";


const result = await db.query.workflowInstance.findFirst({
where: and(
	eq(schema.workflowInstance.id, 27),
	isNull(schema.workflowInstance.deletedAt),
),
columns: {
	id: true,
	createdAt: true,
	initialStepId: true,
	status: true,
	completedAt: true,
	eventId: true,
	submittedBy: true,
},
with: {
	steps: {
		columns: {
			id: true,
			name: true,
			status: true,
			nextStepId: true,
			completedAt: true,
		},
		with: {
			roles: {
				columns: {
					id: true,
					targetGroupApprovalCriteria: true,
				},
				with: {
					role: {
						columns: {
							id: true,
							name: true,
						},
						extras: {
							scope: sql<{
								// note: null intentionally not handled because, critical system change
								type: "organization" | "venue";
								kindId: number;
								kindName: string;
							}>`case
								when ${schema.role.managedEntityType} = 'organization'
								then (
									select json_build_object('type', ${schema.role.managedEntityType}, 'kindId', ot.id, 'kindName', ot.name)
									from organization_type ot where ot.id = ${schema.role.typeRefId} limit 1
								)
								when ${schema.role.managedEntityType} = 'venue'
								then (
									select json_build_object('type', ${schema.role.managedEntityType}, 'kindId', vt.id, 'kindName', vt.name)
									from venue_type vt where vt.id = ${schema.role.typeRefId} limit 1
								)
								else null
							end`.as("scope"),
						},
					},
					targetGroups: {
						columns: {
							id: true,
						},
						extras: {
						    scope: sql<{
						      type: "organization" | "venue";
						      id: number;
						      name: string;
						    } | null>`(
						      select case
						        when me.managed_entity_type = 'organization'
						        then json_build_object(
						          'type', me.managed_entity_type,
						          'id', o.id,
						          'name', o.name
						        )
						        when me.managed_entity_type = 'venue'
						        then json_build_object(
						          'type', me.managed_entity_type,
						          'id', v.id,
						          'name', v.name
						        )
						        else null
						      end
						      from managed_entity me
						      left join organization o on me.managed_entity_type = 'organization' and o.id = me.ref_id
						      left join venue v on me.managed_entity_type = 'venue' and v.id = me.ref_id
						      where me.id = ${schema.workflowInstanceStepTargetGroup.managedEntityId}
						      limit 1
						    )`.as("entity"),
						  },

						with: {
							assignments: {
								columns: {
									id: true,
									status: true,
									completedAt: true,
									remarks: true,
								},
								with: {
									userRole: {
										columns: {
											id: true,
										},
										with: {
											user: {
												columns: {
													id: true,
													fullName: true,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
},
});

console.dir(result, { depth: 33 });

// console.dir(await db.query.workflowInstance.findMany({
// 	with: {
// 		steps: {
// 			with: {
// 				stepRoles: {
// 					with: {
// 						targetGroups: {
// 							with: {
// 								assignments: {
// 									with: {
// 										userRole: {
// 											with: {
// 												user: true
// 											}
// 										}
// 									}
// 								}
// 							}
// 						}
// 					}
// 				}
// 			}
// 		}
// 	}
// }), {depth: 33})

// const parentEvent = alias(schema.event, "parentEvent");

// const result = await db
// 	.select({
// 		id: schema.event.id,
// 		title: schema.event.title,
// 		type: {
// 			id: schema.eventType.id,
// 			name: schema.eventType.name,
// 		},
// 		category: {
// 			id: schema.eventCategory.id,
// 			name: schema.eventCategory.name,
// 		},
// 		parentEvent: {
// 			id: parentEvent.id,
// 			title: parentEvent.title,
// 		},
// 		organizers: sql<
// 			{
// 				id: number;
// 				role: EventOrganizerRole;
// 				organization: {
// 					id: number;
// 					name: string;
// 				};
// 			}[]
// 		>`json_agg(json_build_object('id', ${schema.eventOrganizer.id}, 'role', ${schema.eventOrganizer.role}, 'organization', json_build_object('id', ${schema.organization.id}, 'name', ${schema.organization.name})))`,
// 	})
// 	.from(schema.event)
// 	.innerJoin(schema.eventCategory, eq(schema.event.categoryId, schema.eventCategory.id))
// 	.innerJoin(schema.eventType, eq(schema.event.typeId, schema.eventType.id))
// 	.leftJoin(parentEvent, eq(schema.event.parentEventId, parentEvent.id))
// 	.innerJoin(
// 		schema.eventOrganizer,
// 		and(
// 			eq(schema.eventOrganizer.eventId, schema.event.id),
// 			isNull(schema.eventOrganizer.deletedAt),
// 		),
// 	)
// 	.innerJoin(
// 		schema.organization,
// 		and(
// 			eq(schema.organization.id, schema.eventOrganizer.organizationId),
// 			isNull(schema.organization.deletedAt),
// 		),
// 	)
// 	.where(
// 		and(
// 			inArray(
// 				schema.organization.id,
// 				(await getUserOrganizations(7, "event:view_own")).map((o) => o.id),
// 			),

// 			// filters
// 			// filter.status != null ? inArray(schema.event.status, filter.status) : undefined,
// 			// filter.typeId != null ? eq(schema.event.typeId, filter.typeId) : undefined,

// 			isNull(schema.event.deletedAt),
// 		),
// 	)
// 	.groupBy(schema.event.id, schema.eventType.id, schema.eventCategory.id, parentEvent.id)
// 	.orderBy(schema.event.startsAt);

// console.log(await getFullUser())

// const d = await db
// 	.select({
// 		id: schema.event.id,
// 		title: schema.event.title,
// 	})
// 	.from(schema.event)
// 	.innerJoin(
// 		schema.eventOrganizer,
// 		and(
// 			eq(schema.eventOrganizer.eventId, schema.event.id),
// 			isNull(schema.eventOrganizer.deletedAt)
// 		)
// 	)
// 	.innerJoin(schema.organization, and(
// 		eq(schema.organization.id, schema.eventOrganizer.organizationId),
// 		isNull(schema.organization.deletedAt)
// 	))
// 	.where(and(
// 		inArray(schema.organization.id,
// 			db.selectDistinct({ id: schema.organization.id })
// 				.from(schema.userRole)
// 				.innerJoin(schema.managedEntity, and(
// 					eq(schema.managedEntity.id, schema.userRole.managedEntityId),
// 					eq(schema.managedEntity.managedEntityType, "organization"),
// 				))
// 				.innerJoin(schema.organization, eq(schema.organization.id, schema.managedEntity.refId))
// 				.where(eq(schema.userRole.userId, 13)
// 			)
// 		),
// 		isNull(schema.event.deletedAt)))
// 	.groupBy(schema.event.id)

// console.log(await db.select().from(schema.eventOrganizer))
// console.log(await db.select().from(schema.organization))

// console.dir(await getFullUser(7), { depth: 33 });
// console.dir(await getEventTypes(4), { depth: 33 });

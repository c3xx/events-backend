import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";
import { resolveStep } from "@/modules/event/workflow-instance/progression.js";

// Find all events that requires approval from the user
export const findPendingEventsForUser = dbAction(async (userId: number) => {
	const parentEvent = alias(schema.event, "parentEvent");

	return await db
		.select({
			id: schema.event.id,
			title: schema.event.title,
			createdAt: schema.event.createdAt,
			startsAt: schema.event.startsAt,
			endsAt: schema.event.endsAt,
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
		.from(schema.workflowInstanceStepAssignment)
		.innerJoin(
			schema.userRole,
			eq(schema.workflowInstanceStepAssignment.userRoleId, schema.userRole.id),
		)
		.innerJoin(
			schema.workflowInstanceStepTargetGroup,
			eq(
				schema.workflowInstanceStepAssignment.targetGroupId,
				schema.workflowInstanceStepTargetGroup.id,
			),
		)
		.innerJoin(
			schema.workflowInstanceStepRole,
			eq(schema.workflowInstanceStepTargetGroup.stepRoleId, schema.workflowInstanceStepRole.id),
		)
		.innerJoin(
			schema.workflowInstanceStep,
			eq(schema.workflowInstanceStepRole.stepId, schema.workflowInstanceStep.id),
		)
		.innerJoin(
			schema.workflowInstance,
			eq(schema.workflowInstanceStep.instanceId, schema.workflowInstance.id),
		)
		.innerJoin(schema.event, eq(schema.workflowInstance.eventId, schema.event.id))
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
				eq(schema.userRole.userId, userId), // for the given user id
				eq(schema.workflowInstanceStepAssignment.status, "pending"), // fetch all his pending assignments
				eq(schema.workflowInstanceStep.status, "active"), // (only if in the current active steps (no need to show stuff in future until the first one reached))
				eq(schema.workflowInstance.status, "active"), // from the active workflow instance

				eq(schema.userRole.isActive, true), // first make sure bro is still active
				isNull(schema.userRole.deletedAt), // and isn't deleted
				isNull(schema.workflowInstanceStep.deletedAt),
				isNull(schema.workflowInstanceStepAssignment.deletedAt),
				isNull(schema.workflowInstance.deletedAt),
				isNull(schema.event.deletedAt),
			),
		)
		.groupBy(schema.event.id, schema.eventType.id, schema.eventCategory.id, parentEvent.id);
});

export const findEventByIdSimple = dbAction(async (eventId: number) => {
	return await db.query.event.findFirst({
		where: and(eq(schema.event.id, eventId), isNull(schema.event.deletedAt)),
		columns: { id: true },
	});
});

export const findAssignmentsForUserInEvent = dbAction(async (userId: number, eventId: number) => {
	return await db
		.select({
			id: schema.workflowInstanceStepAssignment.id,
			status: schema.workflowInstanceStepAssignment.status,
			remarks: schema.workflowInstanceStepAssignment.remarks,
			createdAt: schema.workflowInstanceStepAssignment.createdAt,
			completedAt: schema.workflowInstanceStepAssignment.completedAt,

			step: {
				id: schema.workflowInstanceStep.id,
				name: schema.workflowInstanceStep.name,
				status: schema.workflowInstanceStep.status,
				instanceId: schema.workflowInstance.id,
			},
			role: {
				id: schema.role.id,
				name: schema.role.name,
				scope: sql<{
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
			scope: sql<{
				type: "organization" | "venue";
				id: number;
				name: string;
			}>`case
					when ${schema.managedEntity.managedEntityType} = 'organization'
					then (
						select json_build_object('type', ${schema.managedEntity.managedEntityType}, 'id', o.id, 'name', o.name)
						from organization o where o.id = ${schema.managedEntity.refId} limit 1
					)
					when ${schema.managedEntity.managedEntityType} = 'venue'
					then (
						select json_build_object('type', ${schema.managedEntity.managedEntityType}, 'id', v.id, 'name', v.name)
						from venue v where v.id = ${schema.managedEntity.refId} limit 1
					)
					else null
				end`.as("scope"),
		})
		.from(schema.workflowInstanceStepAssignment)
		.innerJoin(
			schema.userRole,
			eq(schema.userRole.id, schema.workflowInstanceStepAssignment.userRoleId),
		)
		.innerJoin(
			schema.workflowInstanceStepTargetGroup,
			eq(
				schema.workflowInstanceStepTargetGroup.id,
				schema.workflowInstanceStepAssignment.targetGroupId,
			),
		)
		.innerJoin(
			schema.managedEntity,
			eq(schema.managedEntity.id, schema.workflowInstanceStepTargetGroup.managedEntityId),
		)
		.innerJoin(
			schema.workflowInstanceStepRole,
			eq(schema.workflowInstanceStepRole.id, schema.workflowInstanceStepTargetGroup.stepRoleId),
		)
		.innerJoin(schema.role, eq(schema.role.id, schema.workflowInstanceStepRole.roleId))
		.innerJoin(
			schema.workflowInstanceStep,
			eq(schema.workflowInstanceStep.id, schema.workflowInstanceStepRole.stepId),
		)
		.innerJoin(
			schema.workflowInstance,
			eq(schema.workflowInstance.id, schema.workflowInstanceStep.instanceId),
		)
		.innerJoin(schema.event, eq(schema.event.id, schema.workflowInstance.eventId))
		.where(
			and(
				eq(schema.userRole.userId, userId), // for the given user, find all...
				// eq(schema.workflowInstanceStepAssignment.status, "pending"), // ...pending assignments... (for now, fetch all)
				eq(schema.workflowInstance.status, "active"), // ...under the active workflow instance...
				eq(schema.event.id, eventId), // ...of the given event.

				// and let's just make sure the variables aren't deleted yet
				isNull(schema.workflowInstanceStepAssignment.deletedAt),
				isNull(schema.workflowInstanceStepTargetGroup.deletedAt),
				isNull(schema.userRole.deletedAt),
			),
		);
});

export const respondToAssignments = dbAction(
	async (
		assignmentIds: number[],
		activeStepId: number,
		data: { status: "approved" | "denied"; remarks?: string | undefined },
	) => {
		await db.transaction(async (tx) => {
			await tx
				.update(schema.workflowInstanceStepAssignment)
				.set({
					status: data.status,
					remarks: data.remarks ?? null,
					completedAt: sql`now()`,
				})
				.where(inArray(schema.workflowInstanceStepAssignment.id, assignmentIds));

			await resolveStep(tx, activeStepId);
		});
	},
);

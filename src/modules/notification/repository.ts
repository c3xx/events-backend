import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction } from "@/lib/helpers.js";

/**
 * Returns the email and full name of all users who have the `event:manage`
 * permission in any of the event's organizer organizations.
 */
export const findOrganizerEmails = dbAction(async (eventId: number) => {
	return await db
		.selectDistinct({
			email: schema.user.email,
			fullName: schema.user.fullName,
		})
		.from(schema.eventOrganizer)
		.innerJoin(
			schema.managedEntity,
			and(
				eq(schema.managedEntity.refId, schema.eventOrganizer.organizationId),
				eq(schema.managedEntity.managedEntityType, "organization"),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.innerJoin(
			schema.userRole,
			and(
				eq(schema.userRole.managedEntityId, schema.managedEntity.id),
				eq(schema.userRole.isActive, true),
				isNull(schema.userRole.deletedAt),
			),
		)
		.innerJoin(schema.rolePermission, eq(schema.rolePermission.roleId, schema.userRole.roleId))
		.innerJoin(
			schema.permission,
			and(
				eq(schema.permission.id, schema.rolePermission.permissionId),
				eq(schema.permission.code, "event:manage"),
			),
		)
		.innerJoin(
			schema.user,
			and(
				eq(schema.user.id, schema.userRole.userId),
				eq(schema.user.isActive, true),
				isNull(schema.user.deletedAt),
			),
		)
		.where(
			and(eq(schema.eventOrganizer.eventId, eventId), isNull(schema.eventOrganizer.deletedAt)),
		);
});

/**
 * Returns the email, full name, role name, and resolved entity name of all
 * users who have a pending assignment on the given workflow instance step.
 */
export const findPendingApproverEmailsForStep = dbAction(async (stepId: number) => {
	return await db
		.selectDistinct({
			email: schema.user.email,
			fullName: schema.user.fullName,
			roleName: schema.role.name,
			scopeName: sql<string>`case
				when ${schema.managedEntity.managedEntityType} = 'organization' then (
					select o.name from organization o where o.id = ${schema.managedEntity.refId} limit 1
				)
				when ${schema.managedEntity.managedEntityType} = 'venue' then (
					select v.name from venue v where v.id = ${schema.managedEntity.refId} limit 1
				)
				when ${schema.managedEntity.managedEntityType} = 'facility' then (
					select f.name from facility f where f.id = ${schema.managedEntity.refId} limit 1
				)
				else null
			end`.as("scope_name"),
		})
		.from(schema.workflowInstanceStepAssignment)
		.innerJoin(
			schema.userRole,
			and(
				eq(schema.userRole.id, schema.workflowInstanceStepAssignment.userRoleId),
				eq(schema.userRole.isActive, true),
				isNull(schema.userRole.deletedAt),
			),
		)
		.innerJoin(
			schema.user,
			and(
				eq(schema.user.id, schema.userRole.userId),
				eq(schema.user.isActive, true),
				isNull(schema.user.deletedAt),
			),
		)
		.innerJoin(
			schema.workflowInstanceStepTargetGroup,
			and(
				eq(
					schema.workflowInstanceStepTargetGroup.id,
					schema.workflowInstanceStepAssignment.targetGroupId,
				),
				isNull(schema.workflowInstanceStepTargetGroup.deletedAt),
			),
		)
		.innerJoin(
			schema.workflowInstanceStepRole,
			and(
				eq(schema.workflowInstanceStepRole.id, schema.workflowInstanceStepTargetGroup.stepRoleId),
				eq(schema.workflowInstanceStepRole.stepId, stepId),
				isNull(schema.workflowInstanceStepRole.deletedAt),
			),
		)
		.innerJoin(schema.role, eq(schema.role.id, schema.workflowInstanceStepRole.roleId))
		.innerJoin(
			schema.managedEntity,
			and(
				eq(schema.managedEntity.id, schema.workflowInstanceStepTargetGroup.managedEntityId),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.where(
			and(
				eq(schema.workflowInstanceStepAssignment.status, "pending"),
				isNull(schema.workflowInstanceStepAssignment.deletedAt),
			),
		);
});

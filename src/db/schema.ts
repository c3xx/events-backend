import { type HasDefault, isNull, type NotNull, relations, sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	bigint,
	boolean,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp,
	unique,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import {
	EVENT_ORGANIZER_INVITATION_STATUS,
	EVENT_ORGANIZER_ROLES,
	EVENT_STATUS,
	EVENT_TYPE_COLLABORATION_POLICY,
	EVENT_TYPE_VENUE_POLICY,
	INSTITUTION_DOMAIN,
	MANAGED_ENTITY_TYPES,
	USER_TYPES,
	VENUE_ACCESS_LEVELS,
	WORKFLOW_INSTANCE_STATUS,
	WORKFLOW_INSTANCE_STEP_ASSIGNMENT_STATUS,
	WORKFLOW_INSTANCE_STEP_STATUS,
	WORKFLOW_TARGET_GROUP_APPROVAL_CRITERIA,
} from "@/lib/constants.js";
import { buildCheck } from "./checks.js";

// todo: how about switching to string based ids?

// === Enums
export const userTypeEnum = pgEnum("user_type", USER_TYPES);
export const managedEntityTypeEnum = pgEnum("managed_entity_type", MANAGED_ENTITY_TYPES);
export const venueAccessLevelEnum = pgEnum("venue_access_level", VENUE_ACCESS_LEVELS);
export const eventTypeVenuePolicyEnum = pgEnum("event_type_venue_policy", EVENT_TYPE_VENUE_POLICY);
export const eventTypeCollaborationPolicyEnum = pgEnum(
	"event_type_collaboration_policy",
	EVENT_TYPE_COLLABORATION_POLICY,
);
export const eventStatusEnum = pgEnum("event_status", EVENT_STATUS);
export const eventOrganizerRoleEnum = pgEnum("event_organizer_role", EVENT_ORGANIZER_ROLES);
export const eventOrganizerInvitationStatusEnum = pgEnum(
	"event_organizer_invitation_status",
	EVENT_ORGANIZER_INVITATION_STATUS,
);
export const workflowInstanceStatusEnum = pgEnum(
	"workflow_instance_status",
	WORKFLOW_INSTANCE_STATUS,
);
export const workflowInstanceStepStatusEnum = pgEnum(
	"workflow_instance_step_status",
	WORKFLOW_INSTANCE_STEP_STATUS,
);
export const workflowInstanceStepAssignmentStatusEnum = pgEnum(
	"workflow_instance_step_assignment_status",
	WORKFLOW_INSTANCE_STEP_ASSIGNMENT_STATUS,
);
export const workflowTargetGroupApprovalCriteriaEnum = pgEnum(
	"workflow_target_group_approval_criteria",
	WORKFLOW_TARGET_GROUP_APPROVAL_CRITERIA,
);

// === Tables
export const managedEntity = pgTable(
	"managed_entity",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		managedEntityType: managedEntityTypeEnum().notNull(),
		refId: integer().notNull(),
		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.managedEntityType, t.refId).where(isNull(t.deletedAt))],
	// soft-fk(ref_id) -> organization, venue
);

export const managedEntityRelations = relations(managedEntity, (r) => ({
	members: r.many(userRole),
}));

export const user = pgTable(
	"user",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		type: userTypeEnum().notNull(),
		fullName: text().notNull(),
		email: text().notNull(),
		passwordHash: text().notNull(),
		isActive: boolean().notNull().default(true),
		...fields("common", "soft-delete"),
	},
	(t) => [
		uniqueIndex().on(t.email).where(isNull(t.deletedAt)),
		buildCheck(
			"user:email_must_belong_to_institution",
			sql`${t.email} LIKE '%@${sql.raw(INSTITUTION_DOMAIN)}'`,
		),
	],
);

export const userRelations = relations(user, (r) => ({
	roles: r.many(userRole),
	createdEvents: r.many(event),
}));

export const role = pgTable(
	"role",
	{
		id: smallint().primaryKey().generatedAlwaysAsIdentity(),
		name: text().notNull(),
		managedEntityType:
			managedEntityTypeEnum() // to which type of managed entity this role belongs to.
				.notNull(),
		typeRefId: integer().notNull(), // soft-fk(organizationType, venueType), since roles belong under institution, dept, lab, hall, etc.
		...fields("common", "soft-delete"),
	},
	(t) => [
		uniqueIndex().on(t.name, t.managedEntityType, t.typeRefId).where(isNull(t.deletedAt)),
		// uniqueIndex()
		// 	.on(t.code, t.managedEntityType, t.typeRefId)
		// 	.where(isNull(t.deletedAt)),
		// // check trigger to restrict updating 'code'.
	],
);

export const roleRelations = relations(role, (r) => ({
	users: r.many(userRole),
	permissions: r.many(rolePermission),
}));

export const userRole = pgTable(
	"user_role",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		userId: bigint({ mode: "number" })
			.references(() => user.id)
			.notNull(),
		roleId: smallint()
			.references(() => role.id)
			.notNull(),
		managedEntityId: bigint({ mode: "number" })
			.references(() => managedEntity.id)
			.notNull(),
		isActive: boolean().notNull().default(true),
		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.userId, t.roleId, t.managedEntityId).where(isNull(t.deletedAt))],
);

export const userRoleRelations = relations(userRole, (r) => ({
	user: r.one(user, {
		fields: [userRole.userId],
		references: [user.id],
	}),
	role: r.one(role, {
		fields: [userRole.roleId],
		references: [role.id],
	}),
	managedEntity: r.one(managedEntity, {
		fields: [userRole.managedEntityId],
		references: [managedEntity.id],
	}),
	workflowAssignments: r.many(workflowInstanceStepAssignment),
}));

export const permission = pgTable(
	"permission",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		code: text().$type<PermissionCode>().notNull(),
		description: text().notNull(),
		...fields("common"), // hard delete
	},
	(t) => [unique().on(t.code)],
);

export const permissionRelations = relations(permission, (r) => ({
	associatedRoles: r.many(rolePermission),
}));

export const rolePermission = pgTable(
	"role_permission",
	{
		permissionId: integer()
			.references(() => permission.id, { onDelete: "cascade" })
			.notNull(),
		roleId: smallint()
			.references(() => role.id, { onDelete: "cascade" }) // note: but roles can be soft-deleted, so, will need to handle it there.
			.notNull(),
		...fields("common"), // goes hard
	},
	(t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const rolePermissionRelations = relations(rolePermission, (r) => ({
	permission: r.one(permission, {
		fields: [rolePermission.permissionId],
		references: [permission.id],
	}),
	role: r.one(role, {
		fields: [rolePermission.roleId],
		references: [role.id],
	}),
}));

export const organizationType = pgTable(
	"organization_type",
	{
		id: smallint().primaryKey().generatedAlwaysAsIdentity(),
		name: text().notNull(), // institution, department, club, cgpu
		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.name).where(isNull(t.deletedAt))],
);

export const organizationTypeRelations = relations(organizationType, (r) => ({
	organizations: r.many(organization),
	parents: r.many(organizationTypeAllowedParent, {
		relationName: "as_child",
	}),
	children: r.many(organizationTypeAllowedParent, {
		relationName: "as_parent",
	}),
	// soft-fk(roles), roles that comes under this type of organization
}));

export const organizationTypeAllowedParent = pgTable(
	"organization_type_allowed_parent",
	{
		childTypeId: smallint()
			.references(() => organizationType.id)
			.notNull(),
		parentTypeId: smallint()
			.references(() => organizationType.id)
			.notNull(),
		...fields("common"), // no soft-deletes :)
	},
	(t) => [primaryKey({ columns: [t.childTypeId, t.parentTypeId] })],
);

export const organizationTypeAllowedParentRelations = relations(
	organizationTypeAllowedParent,
	(r) => ({
		childType: r.one(organizationType, {
			fields: [organizationTypeAllowedParent.childTypeId],
			references: [organizationType.id],
			relationName: "as_child",
		}),
		parentType: r.one(organizationType, {
			fields: [organizationTypeAllowedParent.parentTypeId],
			references: [organizationType.id],
			relationName: "as_parent",
		}),
	}),
);

export const organization = pgTable(
	"organization",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		name: text().notNull(),
		organizationTypeId: smallint()
			.references(() => organizationType.id)
			.notNull(),
		parentOrganizationId: integer().references((): AnyPgColumn => organization.id),
		isActive: boolean().notNull().default(true),
		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.organizationTypeId, t.name).where(isNull(t.deletedAt))],
);

export const organizationRelations = relations(organization, (r) => ({
	type: r.one(organizationType, {
		fields: [organization.organizationTypeId],
		references: [organizationType.id],
	}),
	parentOrganization: r.one(organization, {
		fields: [organization.parentOrganizationId],
		references: [organization.id],
		relationName: "parent",
	}),
	childOrganizations: r.many(organization, {
		relationName: "parent",
	}),
	// soft-fk(managed_entity)
}));

export const venueType = pgTable(
	"venue_type",
	{
		id: smallint().primaryKey().generatedAlwaysAsIdentity(),
		name: text().notNull(), // lab, hall, auditorium, seminar hall
		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.name).where(isNull(t.deletedAt))],
);

export const venueTypeRelations = relations(venueType, (r) => ({
	venues: r.many(venue),
	// soft-fk(roles), roles that comes under this type of venue
}));

export const venue = pgTable(
	"venue",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		name: text().notNull(),
		venueTypeId: smallint()
			.references(() => venueType.id)
			.notNull(),
		organizationId: integer().references(() => organization.id),
		accessLevel: venueAccessLevelEnum().notNull(),
		isAvailable: boolean().notNull(),
		unavailabilityReason: text(),
		maxCapacity: integer().notNull(),
		isActive: boolean().notNull().default(true),
		...fields("common", "soft-delete"),
	},
	(t) => [
		uniqueIndex().on(t.venueTypeId, t.name).where(isNull(t.deletedAt)),
		buildCheck(
			"venue:unavailability_reason_presence",
			sql`${t.isAvailable} = (NULLIF(${t.unavailabilityReason}, '') IS NULL)`,
		),
	],
);

export const venueRelations = relations(venue, (r) => ({
	type: r.one(venueType, {
		fields: [venue.venueTypeId],
		references: [venueType.id],
	}),
	organization: r.one(organization, {
		fields: [venue.organizationId],
		references: [organization.id],
	}),
	facilities: r.many(venueFacility),
	// soft-fk(managed_entity)
}));

export const facility = pgTable(
	"facility",
	{
		id: smallint().primaryKey().generatedAlwaysAsIdentity(),
		name: text().notNull(),
		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.name).where(isNull(t.deletedAt))],
);

export const facilityRelations = relations(facility, (r) => ({
	venues: r.many(venueFacility),
}));

export const venueFacility = pgTable(
	"venue_facility",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		venueId: integer()
			.references(() => venue.id)
			.notNull(),
		facilityId: smallint()
			.references(() => facility.id)
			.notNull(),
		isActive: boolean().notNull().default(true),
		...fields("common"), // todo: soft-delete or no?
	},
	(t) => [unique().on(t.venueId, t.facilityId)],
);

export const venueFacilityRelations = relations(venueFacility, (r) => ({
	venue: r.one(venue, {
		fields: [venueFacility.venueId],
		references: [venue.id],
	}),
	facility: r.one(facility, {
		fields: [venueFacility.facilityId],
		references: [facility.id],
	}),
}));

export const eventType = pgTable(
	"event_type",
	{
		id: smallint().primaryKey().generatedAlwaysAsIdentity(),
		name: text().notNull(),
		workflowTemplateId: integer()
			.references(() => workflowTemplate.id)
			.notNull(),
		isActive: boolean().notNull().default(true),

		// attributes
		venuePolicy: eventTypeVenuePolicyEnum().notNull(),
		collaborationPolicy: eventTypeCollaborationPolicyEnum().notNull(),

		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.name).where(sql`${t.deletedAt} IS NULL AND ${t.isActive} = true`)],
);

export const eventTypeRelations = relations(eventType, (r) => ({
	workflowTemplate: r.one(workflowTemplate, {
		fields: [eventType.workflowTemplateId],
		references: [workflowTemplate.id],
	}),
	events: r.many(event),
	parents: r.many(eventTypeAllowedParent, { relationName: "as_child" }),
	children: r.many(eventTypeAllowedParent, { relationName: "as_parent" }),
}));

export const eventTypeAllowedParent = pgTable(
	"event_type_allowed_parent",
	{
		childTypeId: smallint()
			.references(() => eventType.id)
			.notNull(),
		parentTypeId: smallint()
			.references(() => eventType.id)
			.notNull(),
		...fields("common"),
	},
	(t) => [primaryKey({ columns: [t.childTypeId, t.parentTypeId] })],
);

export const eventTypeAllowedParentRelations = relations(eventTypeAllowedParent, (r) => ({
	childType: r.one(eventType, {
		fields: [eventTypeAllowedParent.childTypeId],
		references: [eventType.id],
		relationName: "as_child",
	}),
	parentType: r.one(eventType, {
		fields: [eventTypeAllowedParent.parentTypeId],
		references: [eventType.id],
		relationName: "as_parent",
	}),
}));

export const eventCategory = pgTable(
	"event_category",
	{
		id: smallint().primaryKey().generatedAlwaysAsIdentity(),
		name: text().notNull(),
		isActive: boolean().notNull().default(true),
		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.name).where(isNull(t.deletedAt))],
);

export const eventCategoryRelations = relations(eventCategory, (r) => ({
	events: r.many(event),
}));

export const event = pgTable(
	"event",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		title: text().notNull(),
		typeId: smallint()
			.references(() => eventType.id)
			.notNull(),
		categoryId: smallint()
			.references(() => eventCategory.id)
			.notNull(),
		expectedParticipants: integer().notNull(),
		requestDetails: text().notNull(),
		status: eventStatusEnum().notNull(),
		parentEventId: bigint({ mode: "number" }).references((): AnyPgColumn => event.id),
		startsAt: timestamp({ mode: "string", withTimezone: true }).notNull(),
		endsAt: timestamp({ mode: "string", withTimezone: true }).notNull(),
		createdBy: bigint({ mode: "number" })
			.references(() => user.id)
			.notNull(),
		...fields("common", "soft-delete"),
	},
	(t) => [
		buildCheck("event:ends_after_starts", sql`${t.endsAt} > ${t.startsAt}`),
		buildCheck("event:min_participants", sql`${t.expectedParticipants}>0`),
		buildCheck(
			"event:unique_to_program",
			sql`${t.parentEventId} IS NULL OR ${t.parentEventId} != ${t.id}`,
		),
	],
);

export const eventRelations = relations(event, (r) => ({
	type: r.one(eventType, {
		fields: [event.typeId],
		references: [eventType.id],
	}),
	category: r.one(eventCategory, {
		fields: [event.categoryId],
		references: [eventCategory.id],
	}),
	parentEvent: r.one(event, {
		fields: [event.parentEventId],
		references: [event.id],
		relationName: "parent_child",
	}),
	venueAllotments: r.many(venueAllotment),
	organizers: r.many(eventOrganizer),
	invitations: r.many(eventOrganizerInvitation),
	report: r.one(eventReport, {
		fields: [event.id],
		references: [eventReport.eventId],
	}),
	workflowInstances: r.many(workflowInstance),
	createdByUser: r.one(user, {
		fields: [event.createdBy],
		references: [user.id],
	}),
}));

export const venueAllotment = pgTable(
	"venue_allotment",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		venueId: integer()
			.references(() => venue.id, { onDelete: "cascade" })
			.notNull(),
		eventId: bigint({ mode: "number" })
			.references(() => event.id, { onDelete: "cascade" })
			.notNull(),
		startsAt: timestamp({ mode: "string", withTimezone: true }).notNull(),
		endsAt: timestamp({ mode: "string", withTimezone: true }).notNull(),
		...fields("common", "soft-delete"),
	},
	(t) => [buildCheck("venue_allotment:ends_after_starts", sql`${t.endsAt} > ${t.startsAt}`)],
);

export const venueAllotmentRelations = relations(venueAllotment, (r) => ({
	event: r.one(event, {
		fields: [venueAllotment.eventId],
		references: [event.id],
	}),
	venue: r.one(venue, {
		fields: [venueAllotment.venueId],
		references: [venue.id],
	}),
}));

export const eventOrganizer = pgTable(
	"event_organizer",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		eventId: bigint({ mode: "number" })
			.references(() => event.id, { onDelete: "cascade" })
			.notNull(),
		organizationId: integer()
			.references(() => organization.id, { onDelete: "cascade" })
			.notNull(),
		role: eventOrganizerRoleEnum().notNull(),
		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.eventId, t.organizationId).where(isNull(t.deletedAt))],
);

export const eventOrganizerRelations = relations(eventOrganizer, (r) => ({
	event: r.one(event, {
		fields: [eventOrganizer.eventId],
		references: [event.id],
	}),
	organization: r.one(organization, {
		fields: [eventOrganizer.organizationId],
		references: [organization.id],
	}),
}));

export const eventOrganizerInvitation = pgTable(
	"event_organizer_invitation",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		eventId: bigint({ mode: "number" })
			.references(() => event.id, { onDelete: "cascade" })
			.notNull(),
		invitedAt: timestamp({ mode: "string", withTimezone: true }).defaultNow(),
		invitedByUserId: bigint({ mode: "number" })
			.references(() => userRole.id, { onDelete: "cascade" })
			.notNull(),
		senderOrganizationId: integer()
			.references(() => organization.id, { onDelete: "cascade" })
			.notNull(),
		recipientOrganizationId: integer()
			.references(() => organization.id, { onDelete: "cascade" })
			.notNull(),
		respondedByUserId: bigint({ mode: "number" }).references(() => userRole.id, {
			onDelete: "cascade",
		}),
		status: eventOrganizerInvitationStatusEnum().default("pending").notNull(),
		closedAt: timestamp({ mode: "string", withTimezone: true }),
		...fields("common", "soft-delete"),
	},
	(t) => [
		uniqueIndex()
			.on(t.eventId, t.recipientOrganizationId)
			.where(sql`${t.closedAt} IS NULL AND ${t.deletedAt} IS NULL`),
		buildCheck(
			"event_organizer_invitation:to_self",
			sql`${t.senderOrganizationId} !=${t.recipientOrganizationId}`,
		),
		buildCheck(
			"event_organizer_invitation:status_update",
			sql`
			(${t.status} = 'pending' AND ${t.closedAt} is NULL)
			OR
			(${t.status} IN ('accepted', 'rejected', 'revoked', 'expired') AND ${t.closedAt} IS NOT NULL)`,
		),
	],
);

export const eventOrganizerInvitationRelations = relations(eventOrganizerInvitation, (r) => ({
	event: r.one(event, {
		fields: [eventOrganizerInvitation.eventId],
		references: [event.id],
	}),
	invitedByUser: r.one(userRole, {
		fields: [eventOrganizerInvitation.invitedByUserId],
		references: [userRole.id],
	}),
	senderOrganization: r.one(organization, {
		fields: [eventOrganizerInvitation.senderOrganizationId],
		references: [organization.id],
	}),
	recipientOrganization: r.one(organization, {
		fields: [eventOrganizerInvitation.recipientOrganizationId],
		references: [organization.id],
	}),
	respondedByUser: r.one(userRole, {
		fields: [eventOrganizerInvitation.respondedByUserId],
		references: [userRole.id],
	}),
}));

export const eventReport = pgTable(
	"event_report",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		eventId: bigint({ mode: "number" })
			.references(() => event.id, { onDelete: "cascade" })
			.notNull(),
		details: text().notNull(),
		submittedAt: timestamp({ mode: "string", withTimezone: true }).defaultNow().notNull(),
		...fields("common", "soft-delete"),
	},
	(t) => [unique().on(t.eventId)],
);

export const eventReportRelations = relations(eventReport, (r) => ({
	event: r.one(event, {
		fields: [eventReport.eventId],
		references: [event.id],
	}),
}));

// WORKFLOWS

// Workflow templates
export const workflowTemplate = pgTable(
	"workflow_template",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		name: text().notNull(),
		initialStepId: integer().references(() => workflowTemplateStep.id),

		...fields("common", "soft-delete"),
	},
	(t) => [
		uniqueIndex("workflow_template_unique_name")
			.on(sql`lower(${t.name})`)
			.where(sql`${t.deletedAt} IS NULL`),
		uniqueIndex().on(t.initialStepId).where(sql`${t.deletedAt} IS NULL`),
	],
);

export const workflowTemplateRelations = relations(workflowTemplate, (r) => ({
	initialStep: r.one(workflowTemplateStep, {
		fields: [workflowTemplate.initialStepId],
		references: [workflowTemplateStep.id],
		relationName: "initial_step",
	}),
	steps: r.many(workflowTemplateStep, { relationName: "steps" }),
	eventTypes: r.many(eventType),
}));

export const workflowTemplateStep = pgTable(
	"workflow_template_step",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		templateId: integer()
			.references((): AnyPgColumn => workflowTemplate.id)
			.notNull(),

		name: text().notNull(),
		nextStepId: integer().references((): AnyPgColumn => workflowTemplateStep.id),

		...fields("common", "soft-delete"),
	},
	(t) => [
		uniqueIndex("workflow_template_step_unique_name")
			.on(t.templateId, sql`lower(${t.name})`)
			.where(sql`${t.deletedAt} IS NULL`),
		uniqueIndex().on(t.templateId, t.nextStepId).where(sql`${t.deletedAt} IS NULL`),
	],
);

export const workflowTemplateStepRelations = relations(workflowTemplateStep, (r) => ({
	template: r.one(workflowTemplate, {
		fields: [workflowTemplateStep.templateId],
		references: [workflowTemplate.id],
	}),
	nextStep: r.one(workflowTemplateStep, {
		fields: [workflowTemplateStep.nextStepId],
		references: [workflowTemplateStep.id],
	}),
	stepRoles: r.many(workflowTemplateStepRole),
}));

export const workflowTemplateStepRole = pgTable(
	"workflow_template_step_role",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		stepId: integer()
			.references(() => workflowTemplateStep.id)
			.notNull(),

		roleId: smallint()
			.references(() => role.id)
			.notNull(),

		targetGroupApprovalCriteria: workflowTargetGroupApprovalCriteriaEnum().notNull(),

		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.stepId, t.roleId).where(sql`${t.deletedAt} IS NULL`)],
);

export const workflowTemplateStepRoleRelations = relations(workflowTemplateStepRole, (r) => ({
	step: r.one(workflowTemplateStep, {
		fields: [workflowTemplateStepRole.stepId],
		references: [workflowTemplateStep.id],
	}),
	role: r.one(role, {
		fields: [workflowTemplateStepRole.roleId],
		references: [role.id],
	}),
}));

// Workflow instances
export const workflowInstance = pgTable(
	"workflow_instance",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		eventId: bigint({ mode: "number" })
			.references(() => event.id)
			.notNull(),
		submittedBy: bigint({ mode: "number" })
			.references(() => user.id)
			.notNull(),

		initialStepId: bigint({ mode: "number" }).references(() => workflowInstanceStep.id),
		status: workflowInstanceStatusEnum().notNull(),

		completedAt: timestamp({ mode: "string", withTimezone: true }),
		...fields("common", "soft-delete"),
	},
	(t) => [
		// only one active instance per event
		uniqueIndex()
			.on(t.eventId, t.initialStepId)
			.where(sql`${t.deletedAt} IS NULL AND ${t.status} = 'active'`),
		// while generation, initialstepid can be null. so can't allow generating two active ones for an event.
		uniqueIndex()
			.on(t.eventId)
			.where(sql`${t.deletedAt} IS NULL AND ${t.status} = 'active' AND ${t.initialStepId} IS NULL`),
	],
);

export const workflowInstanceRelations = relations(workflowInstance, (r) => ({
	event: r.one(event, {
		fields: [workflowInstance.eventId],
		references: [event.id],
	}),
	submitter: r.one(user, {
		fields: [workflowInstance.submittedBy],
		references: [user.id],
	}),
	initialStep: r.one(workflowInstanceStep, {
		fields: [workflowInstance.initialStepId],
		references: [workflowInstanceStep.id],
		relationName: "initial_step",
	}),
	steps: r.many(workflowInstanceStep),
}));

export const workflowInstanceStep = pgTable(
	"workflow_instance_step",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		instanceId: bigint({ mode: "number" })
			.references((): AnyPgColumn => workflowInstance.id)
			.notNull(),

		nextStepId: bigint({ mode: "number" }).references((): AnyPgColumn => workflowInstanceStep.id),
		status: workflowInstanceStepStatusEnum().notNull(),
		name: text().notNull(),

		completedAt: timestamp({ mode: "string", withTimezone: true }),
		...fields("common", "soft-delete"),
	},
	(t) => [
		uniqueIndex("workflow_instance_step_unique_name")
			.on(t.instanceId, sql`lower(${t.name})`)
			.where(sql`${t.deletedAt} IS NULL`),
		uniqueIndex().on(t.instanceId, t.nextStepId).where(sql`${t.deletedAt} IS NULL`),
	],
);

export const workflowInstanceStepRelations = relations(workflowInstanceStep, (r) => ({
	instance: r.one(workflowInstance, {
		fields: [workflowInstanceStep.instanceId],
		references: [workflowInstance.id],
	}),
	nextStep: r.one(workflowInstanceStep, {
		fields: [workflowInstanceStep.nextStepId],
		references: [workflowInstanceStep.id],
	}),
	stepRoles: r.many(workflowInstanceStepRole),
}));

export const workflowInstanceStepRole = pgTable(
	"workflow_instance_step_role",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		stepId: bigint({ mode: "number" })
			.references(() => workflowInstanceStep.id)
			.notNull(),

		roleId: smallint()
			.references(() => role.id)
			.notNull(),

		targetGroupApprovalCriteria: workflowTargetGroupApprovalCriteriaEnum().notNull(),

		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.stepId, t.roleId).where(sql`${t.deletedAt} IS NULL`)],
);

export const workflowInstanceStepRoleRelations = relations(workflowInstanceStepRole, (r) => ({
	step: r.one(workflowInstanceStep, {
		fields: [workflowInstanceStepRole.stepId],
		references: [workflowInstanceStep.id],
	}),
	role: r.one(role, {
		fields: [workflowInstanceStepRole.roleId],
		references: [role.id],
	}),
	targetGroups: r.many(workflowInstanceStepTargetGroup),
}));

export const workflowInstanceStepTargetGroup = pgTable(
	"workflow_instance_step_target_group",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		stepRoleId: bigint({ mode: "number" })
			.references(() => workflowInstanceStepRole.id)
			.notNull(),

		managedEntityId: bigint({ mode: "number" })
			.references(() => managedEntity.id)
			.notNull(),

		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.stepRoleId, t.managedEntityId).where(sql`${t.deletedAt} IS NULL`)],
);

export const workflowInstanceStepTargetGroupRelations = relations(
	workflowInstanceStepTargetGroup,
	(r) => ({
		stepRole: r.one(workflowInstanceStepRole, {
			fields: [workflowInstanceStepTargetGroup.stepRoleId],
			references: [workflowInstanceStepRole.id],
		}),
		managedEntity: r.one(managedEntity, {
			fields: [workflowInstanceStepTargetGroup.managedEntityId],
			references: [managedEntity.id],
		}),
		assignments: r.many(workflowInstanceStepAssignment),
	}),
);

export const workflowInstanceStepAssignment = pgTable(
	"workflow_instance_step_assignment",
	{
		id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
		targetGroupId: bigint({ mode: "number" })
			.references(() => workflowInstanceStepTargetGroup.id)
			.notNull(),

		userRoleId: bigint({ mode: "number" })
			.references(() => userRole.id)
			.notNull(),
		status: workflowInstanceStepAssignmentStatusEnum().notNull(),
		remarks: text(),

		completedAt: timestamp({ mode: "string", withTimezone: true }),
		...fields("common", "soft-delete"),
	},
	(t) => [uniqueIndex().on(t.targetGroupId, t.userRoleId).where(sql`${t.deletedAt} IS NULL`)],
);

export const workflowInstanceStepAssignmentRelations = relations(
	workflowInstanceStepAssignment,
	(r) => ({
		targetGroup: r.one(workflowInstanceStepTargetGroup, {
			fields: [workflowInstanceStepAssignment.targetGroupId],
			references: [workflowInstanceStepTargetGroup.id],
		}),
		userRole: r.one(userRole, {
			fields: [workflowInstanceStepAssignment.userRoleId],
			references: [userRole.id],
		}),
	}),
);

// === Helpers
type PgStringTimestamp = ReturnType<typeof timestamp<"string">>;
type Scope = "common" | "soft-delete";
type CommonFields = {
	createdAt: NotNull<HasDefault<PgStringTimestamp>>;
	updatedAt: NotNull<HasDefault<PgStringTimestamp>>;
};
type SoftDeleteFields = {
	deletedAt: PgStringTimestamp;
};
type FieldsFor<T extends readonly Scope[]> = ("common" extends T[number]
	? CommonFields
	: Record<never, never>) &
	("soft-delete" extends T[number] ? SoftDeleteFields : Record<never, never>);

function fields<const T extends readonly Scope[]>(...scopes: T): FieldsFor<T> {
	return {
		...(scopes.includes("common") && {
			createdAt: timestamp({ mode: "string", withTimezone: true }).defaultNow().notNull(),
			updatedAt: timestamp({ mode: "string", withTimezone: true })
				.defaultNow()
				.$onUpdate(() => sql`now()`)
				.notNull(),
		}),
		...(scopes.includes("soft-delete") && {
			deletedAt: timestamp({
				mode: "string",
				withTimezone: true,
			}),
		}),
	} as FieldsFor<T>;
}

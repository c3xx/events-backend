import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/db/index.js";
import { hashPassword } from "@/lib/argon2.js";
import { createEvent } from "@/modules/event/service.js";

export async function createTestUser(data?: Partial<typeof schema.user.$inferInsert>) {
	const [user] = await db
		.insert(schema.user)
		.values({
			fullName: "Test User",
			email: `test-${nanoid()}@tkmce.ac.in`,
			passwordHash: await hashPassword("password123"),
			type: "admin",
			...data,
		})
		.returning();
	if (!user) throw new Error("Failed to create test user");
	return user;
}

export async function createTestOrganizationType(
	data?: Partial<typeof schema.organizationType.$inferInsert>,
) {
	const [orgType] = await db
		.insert(schema.organizationType)
		.values({
			name: `org-type-${nanoid()}`,
			...data,
		})
		.returning();
	if (!orgType) throw new Error("Failed to create test organization type");
	return orgType;
}

export async function createTestOrganization(data: {
	name?: string;
	organizationTypeId: number;
	parentOrganizationId?: number;
}) {
	const [org] = await db
		.insert(schema.organization)
		.values({
			name: data.name ?? `org-${nanoid()}`,
			organizationTypeId: data.organizationTypeId,
			parentOrganizationId: data.parentOrganizationId,
		})
		.returning();
	if (!org) throw new Error("Failed to create test organization");
	return org;
}

export async function getManagedEntityForOrganization(organizationId: number) {
	let managedentity = await db.query.managedEntity.findFirst({
		where: and(
			eq(schema.managedEntity.managedEntityType, "organization"),
			eq(schema.managedEntity.refId, organizationId),
		),
	});

	if (!managedentity) {
		[managedentity] = await db
			.insert(schema.managedEntity)
			.values({
				managedEntityType: "organization",
				refId: organizationId,
			})
			.returning();
	}

	if (!managedentity) throw new Error("Failed to create or find managed entity");
	return managedentity;
}

export async function createTestEventType(data: { name?: string; workflowTemplateId: number }) {
	const [eventType] = await db
		.insert(schema.eventType)
		.values({
			name: data.name ?? `event-type-${nanoid()}`,
			workflowTemplateId: data.workflowTemplateId,
			isActive: true,
			venuePolicy: "optional",
			collaborationPolicy: "optional",
		})
		.returning();
	if (!eventType) throw new Error("Failed to create test event type");
	return eventType;
}

export async function createTestEventCategory(
	data?: Partial<typeof schema.eventCategory.$inferInsert>,
) {
	const [category] = await db
		.insert(schema.eventCategory)
		.values({
			name: `category-${nanoid()}`,
			...data,
		})
		.returning();
	if (!category) throw new Error("Failed to create test event category");
	return category;
}

export async function createTestWorkflowTemplate(
	data?: Partial<typeof schema.workflowTemplate.$inferInsert>,
) {
	const [template] = await db
		.insert(schema.workflowTemplate)
		.values({
			name: `template-${nanoid()}`,
			...data,
		})
		.returning();
	if (!template) throw new Error("Failed to create test workflow template");
	return template;
}

export async function createTestWorkflowStep(data: {
	templateId: number;
	name?: string;
	nextStepId?: number;
}) {
	const [step] = await db
		.insert(schema.workflowTemplateStep)
		.values({
			templateId: data.templateId,
			name: data.name ?? `step-${nanoid()}`,
			nextStepId: data.nextStepId,
		})
		.returning();
	if (!step) throw new Error("Failed to create test workflow step");
	return step;
}

export async function createTestRole(data: {
	name?: string;
	managedEntityType: (typeof schema.managedEntityTypeEnum.enumValues)[number];
	typeRefId: number;
}) {
	const [newRole] = await db
		.insert(schema.role)
		.values({
			name: data.name ?? `role-${nanoid()}`,
			managedEntityType: data.managedEntityType,
			typeRefId: data.typeRefId,
		})
		.returning();
	if (!newRole) throw new Error("Failed to create test role");
	return newRole;
}

export async function createTestManagedEntity(data: {
	managedEntityType: (typeof schema.managedEntityTypeEnum.enumValues)[number];
	refId: number;
}) {
	const [entity] = await db
		.insert(schema.managedEntity)
		.values({
			managedEntityType: data.managedEntityType,
			refId: data.refId,
		})
		.returning();
	if (!entity) throw new Error("Failed to create test managed entity");
	return entity;
}

export async function createTestUserRole(data: {
	userId: number;
	roleId: number;
	managedEntityId: number;
}) {
	const [userRole] = await db
		.insert(schema.userRole)
		.values({
			userId: data.userId,
			roleId: data.roleId,
			managedEntityId: data.managedEntityId,
		})
		.returning();
	if (!userRole) throw new Error("Failed to create test user role");
	return userRole;
}

export async function grantPermissionToRole(roleId: number, permissionCode: PermissionCode) {
	let [perm] = await db
		.select()
		.from(schema.permission)
		.where(eq(schema.permission.code, permissionCode));

	if (!perm) {
		[perm] = await db
			.insert(schema.permission)
			.values({
				code: permissionCode,
				description: `Description for ${permissionCode}`,
			})
			.returning();
	}

	if (!perm) throw new Error(`Failed to ensure permission ${permissionCode} exists`);

	await db
		.insert(schema.rolePermission)
		.values({
			roleId,
			permissionId: perm.id,
		})
		.onConflictDoNothing();
}

export async function createTestWorkflowStepRole(data: {
	stepId: number;
	roleId: number;
	targetGroupApprovalCriteria?: (typeof schema.workflowTargetGroupApprovalCriteriaEnum.enumValues)[number];
}) {
	const [stepRole] = await db
		.insert(schema.workflowTemplateStepRole)
		.values({
			stepId: data.stepId,
			roleId: data.roleId,
			targetGroupApprovalCriteria: data.targetGroupApprovalCriteria ?? "all",
		})
		.returning();
	if (!stepRole) throw new Error("Failed to create test workflow step role");
	return stepRole;
}

export async function allowParentType(childTypeId: number, parentTypeId: number) {
	await db
		.insert(schema.organizationTypeAllowedParent)
		.values({
			childTypeId,
			parentTypeId,
		})
		.onConflictDoNothing();
}

export async function createBasicEventSetup() {
	const admin = await createTestUser({ type: "admin" });
	const orgType = await createTestOrganizationType();
	const hostOrg = await createTestOrganization({
		organizationTypeId: orgType.id,
	});

	const template = await createTestWorkflowTemplate();
	const initialStep = await createTestWorkflowStep({
		templateId: template.id,
		name: "Initial Step",
	});

	const role = await createTestRole({
		managedEntityType: "organization",
		typeRefId: orgType.id,
	});

	await createTestWorkflowStepRole({
		stepId: initialStep.id,
		roleId: role.id,
		targetGroupApprovalCriteria: "any",
	});

	await db
		.update(schema.workflowTemplate)
		.set({ initialStepId: initialStep.id })
		.where(eq(schema.workflowTemplate.id, template.id));

	const eventType = await createTestEventType({
		workflowTemplateId: template.id,
	});

	const category = await createTestEventCategory();

	return {
		admin,
		orgType,
		hostOrg,
		eventType,
		category,
	};
}

export async function createOrganizerTestSetup() {
	const setup = await createBasicEventSetup();

	const hostME = await getManagedEntityForOrganization(setup.hostOrg.id);

	const mockRole = await createTestRole({
		managedEntityType: "organization",
		typeRefId: setup.orgType.id,
	});

	await grantPermissionToRole(mockRole.id, "event_organizer_invitation:respond" as PermissionCode);
	await grantPermissionToRole(mockRole.id, "event_organizer:manage" as PermissionCode);

	const userRole = await createTestUserRole({
		userId: setup.admin.id,
		roleId: mockRole.id,
		managedEntityId: hostME.id,
	});

	const actor = {
		id: setup.admin.id,
		type: "admin" as UserType,
		permissions: [] as PermissionCode[],
	};

	const event = await createEvent(actor, {
		organizationId: setup.hostOrg.id,
		title: `Event-${nanoid()}`,
		typeId: setup.eventType.id,
		categoryId: setup.category.id,
		expectedParticipants: 10,
		requestDetails: "Setup event",
		startsAt: new Date(Date.now() + 86400000).toISOString(),
		endsAt: new Date(Date.now() + 172800000).toISOString(),
	});

	return {
		...setup,
		event,
		userRole,
		mockRole,
	};
}

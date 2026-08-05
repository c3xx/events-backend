import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const createOrganization = dbAction(
	async (data: {
		name: string;
		organizationTypeId: number;
		parentOrganizationId: number | null | undefined;
	}) => {
		const [inserted] = await db
			.insert(schema.organization)
			.values({
				name: data.name,
				organizationTypeId: data.organizationTypeId,
				parentOrganizationId: data.parentOrganizationId ?? null,
			})
			.returning({ id: schema.organization.id });

		if (inserted == null) unreachable();

		return inserted;
	},
);

export const getOrganizations = dbAction(async () => {
	return await db.query.organization.findMany({
		where: isNull(schema.organization.deletedAt),
		columns: {
			id: true,
			name: true,
			organizationTypeId: true,
			parentOrganizationId: true,
			isActive: true,
			createdAt: true,
		},
	});
});

export const getOrganization = dbAction(async (organizationId: number) => {
	return await db.query.organization.findFirst({
		where: and(eq(schema.organization.id, organizationId), isNull(schema.organization.deletedAt)),
		columns: {
			id: true,
			name: true,
			organizationTypeId: true,
			parentOrganizationId: true,
			isActive: true,
			createdAt: true,
		},
	});
});

export const findOrganizationManagedEntity = dbAction(async (organizationId: number) => {
	const [relatedManagedEntity] = await db
		.select({ id: schema.managedEntity.id })
		.from(schema.managedEntity)
		.where(
			and(
				eq(schema.managedEntity.managedEntityType, "organization"),
				eq(schema.managedEntity.refId, organizationId),
				isNull(schema.managedEntity.deletedAt),
			),
		)
		.limit(1);

	return relatedManagedEntity;
});

export const findChildOrganizations = dbAction(async (organizationId: number) => {
	return await db
		.select({ id: schema.organization.id })
		.from(schema.organization)
		.where(
			and(
				eq(schema.organization.parentOrganizationId, organizationId),
				isNull(schema.organization.deletedAt),
			),
		);
});

export const updateOrganization = dbAction(
	async (id: number, data: { name?: string | undefined; isActive?: boolean | undefined }) => {
		const [updated] = await db
			.update(schema.organization)
			.set(data)
			.where(and(eq(schema.organization.id, id), isNull(schema.organization.deletedAt)))
			.returning({ id: schema.organization.id });
		return updated;
	},
);

export const softDeleteOrganization = dbAction(async (id: number) => {
	return await db.transaction(async (tx) => {
		const [result] = await tx
			.update(schema.organization)
			.set({ deletedAt: sql`NOW()` })
			.where(and(eq(schema.organization.id, id), isNull(schema.organization.deletedAt)))
			.returning({ id: schema.organization.id });

		if (result == null) return null;

		const [managedEntity] = await tx
			.select({ id: schema.managedEntity.id })
			.from(schema.managedEntity)
			.where(
				and(
					eq(schema.managedEntity.managedEntityType, "organization"),
					eq(schema.managedEntity.refId, id),
					isNull(schema.managedEntity.deletedAt),
				),
			);

		if (managedEntity != null) {
			await tx
				.update(schema.managedEntity)
				.set({ deletedAt: sql`NOW()` })
				.where(eq(schema.managedEntity.id, managedEntity.id));

			await tx
				.update(schema.userRole)
				.set({ deletedAt: sql`NOW()` })
				.where(
					and(
						eq(schema.userRole.managedEntityId, managedEntity.id),
						isNull(schema.userRole.deletedAt),
					),
				);
		}

		await tx
			.update(schema.eventOrganizerInvitation)
			.set({
				status: "revoked",
				closedAt: sql`NOW()`,
				deletedAt: sql`NOW()`,
			})
			.where(
				and(
					or(
						eq(schema.eventOrganizerInvitation.senderOrganizationId, id),
						eq(schema.eventOrganizerInvitation.recipientOrganizationId, id),
					),
					eq(schema.eventOrganizerInvitation.status, "pending"),
					isNull(schema.eventOrganizerInvitation.deletedAt),
				),
			);

		const hostEvents = await tx
			.select({ eventId: schema.eventOrganizer.eventId })
			.from(schema.eventOrganizer)
			.where(
				and(
					eq(schema.eventOrganizer.organizationId, id),
					eq(schema.eventOrganizer.role, "host"),
					isNull(schema.eventOrganizer.deletedAt),
				),
			);

		const hostEventIds = hostEvents.map((e) => e.eventId);
		if (hostEventIds.length > 0) {
			await tx
				.update(schema.event)
				.set({ deletedAt: sql`NOW()` })
				.where(
					and(
						inArray(schema.event.id, hostEventIds),
						inArray(schema.event.status, ["draft", "pending"]),
						isNull(schema.event.deletedAt),
					),
				);
		}

		return result;
    });
});

export const getOrganizationsByIds = dbAction(async (organizationIds: number[]) => {
	return await db.query.organization.findMany({
		where: and(
			inArray(schema.organization.id, organizationIds),
			isNull(schema.organization.deletedAt),
		),
		columns: {
			id: true,
			isActive: true,
		},
	});
});

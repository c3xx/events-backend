import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";

export const getEventTypeChildTypes = dbAction(async (parentEventId: number) => {
	return await db
		.select({ id: schema.eventTypeAllowedParent.childTypeId, name: schema.eventType.name })
		.from(schema.eventTypeAllowedParent)
		.innerJoin(schema.eventType, eq(schema.eventTypeAllowedParent.childTypeId, schema.eventType.id))
		.where(eq(schema.eventTypeAllowedParent.parentTypeId, parentEventId))
		.orderBy(schema.eventTypeAllowedParent.createdAt);
});

export const addAllowedChildType = dbAction(
	async (data: { parentTypeId: number; childTypeId: number }) => {
		const [inserted] = await db
			.insert(schema.eventTypeAllowedParent)
			.values({
				parentTypeId: data.parentTypeId,
				childTypeId: data.childTypeId,
			})
			.returning({
				parentTypeId: schema.eventTypeAllowedParent.parentTypeId,
				childTypeId: schema.eventTypeAllowedParent.childTypeId,
			});

		if (inserted == null) return unreachable();

		return inserted;
	},
);

export const removeAllowedChildType = dbAction(
	async (data: { parentTypeId: number; childTypeId: number }) => {
		await db
			.delete(schema.eventTypeAllowedParent)
			.where(
				and(
					eq(schema.eventTypeAllowedParent.parentTypeId, data.parentTypeId),
					eq(schema.eventTypeAllowedParent.childTypeId, data.childTypeId),
				),
			);
	},
);

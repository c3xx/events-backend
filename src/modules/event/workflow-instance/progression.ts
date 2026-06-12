import type { ExtractTablesWithRelations } from "drizzle-orm";
import { eq, inArray, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { type db, schema } from "@/db/index.js";
import { unreachable } from "@/lib/helpers.js";

type DbOrTx =
	| typeof db
	| PgTransaction<any, typeof schema, ExtractTablesWithRelations<typeof schema>>;

export async function resolveStep(tx: DbOrTx, stepId: number): Promise<void> {
	const step = await tx.query.workflowInstanceStep.findFirst({
		where: eq(schema.workflowInstanceStep.id, stepId),
		columns: { id: true, instanceId: true, nextStepId: true, status: true },
		with: {
			stepRoles: {
				columns: { id: true, targetGroupApprovalCriteria: true },
				where: (t, { isNull }) => isNull(t.deletedAt),
				with: {
					targetGroups: {
						columns: { id: true },
						where: (t, { isNull }) => isNull(t.deletedAt),
						with: {
							assignments: {
								columns: { id: true, status: true },
								where: (t, { isNull }) => isNull(t.deletedAt),
							},
						},
					},
				},
			},
		},
	});
	if (step == null) unreachable();

	if (step.status !== "active" && step.status !== "pending" && step.status !== "blocked") return;

	const allGroups = step.stepRoles.flatMap((stepRole) => stepRole.targetGroups);

	if (allGroups.length === 0) {
		await advance(tx, step, "skipped");
		return;
	}

	// Update sibling assignments for roles with "any" criteria if one assignment was approved
	for (const stepRole of step.stepRoles) {
		if (stepRole.targetGroupApprovalCriteria === "any") {
			for (const group of stepRole.targetGroups) {
				const hasApproved = group.assignments.some((a) => a.status === "approved");
				if (hasApproved) {
					const pendingSiblingIds = group.assignments
						.filter((a) => a.status === "pending")
						.map((a) => a.id);
					if (pendingSiblingIds.length > 0) {
						await tx
							.update(schema.workflowInstanceStepAssignment)
							.set({ status: "skipped", completedAt: sql`now()` })
							.where(inArray(schema.workflowInstanceStepAssignment.id, pendingSiblingIds));

						// Update in-memory statuses so the checks below see them as skipped
						for (const a of group.assignments) {
							if (a.status === "pending") {
								a.status = "skipped";
							}
						}
					}
				}
			}
		}
	}

	let anyRoleDenied = false;
	let anyRolePending = false;
	let anyRoleBlocked = false;

	for (const stepRole of step.stepRoles) {
		if (stepRole.targetGroups.length === 0) {
			continue; // skipped
		}

		let roleDenied = false;
		let rolePending = false;
		let roleBlocked = false;

		const groupStatuses = stepRole.targetGroups.map((group) => {
			if (group.assignments.length === 0) {
				return "empty";
			}

			const statuses = group.assignments.map((a) => a.status);

			if (stepRole.targetGroupApprovalCriteria === "all") {
				if (statuses.includes("denied")) return "denied";
				if (statuses.includes("pending")) return "pending";
				return "approved";
			} else {
				if (statuses.includes("approved")) return "approved";
				if (statuses.every((s) => s === "denied")) return "denied";
				if (statuses.includes("pending")) return "pending";
				return "approved"; // If no pending, no approved, and not all denied, it's resolved/skipped
			}
		});

		if (groupStatuses.includes("denied")) {
			roleDenied = true;
		} else if (groupStatuses.includes("pending")) {
			rolePending = true;
		} else if (groupStatuses.includes("empty")) {
			roleBlocked = true;
		}

		if (roleDenied) {
			anyRoleDenied = true;
		} else if (rolePending) {
			anyRolePending = true;
		} else if (roleBlocked) {
			anyRoleBlocked = true;
		}
	}

	if (anyRoleDenied) {
		await advance(tx, step, "denied");
		return;
	}

	if (anyRolePending) {
		if (step.status !== "active") {
			await tx
				.update(schema.workflowInstanceStep)
				.set({ status: "active" })
				.where(eq(schema.workflowInstanceStep.id, step.id));
		}
		return;
	}

	if (anyRoleBlocked) {
		if (step.status !== "blocked") {
			await tx
				.update(schema.workflowInstanceStep)
				.set({ status: "blocked" })
				.where(eq(schema.workflowInstanceStep.id, step.id));
		}
		return;
	}

	await advance(tx, step, "completed");
}

async function advance(
	tx: DbOrTx,
	step: { id: number; instanceId: number; nextStepId: number | null },
	outcome: "completed" | "skipped" | "denied",
): Promise<void> {
	await tx
		.update(schema.workflowInstanceStep)
		.set({ status: outcome, completedAt: sql`now()` })
		.where(eq(schema.workflowInstanceStep.id, step.id));

	const instance = await tx.query.workflowInstance.findFirst({
		where: eq(schema.workflowInstance.id, step.instanceId),
		columns: { eventId: true },
	});
	if (instance == null) unreachable();

	if (outcome === "denied") {
		await tx
			.update(schema.workflowInstance)
			.set({ status: "denied", completedAt: sql`now()` })
			.where(eq(schema.workflowInstance.id, step.instanceId));

		await tx
			.update(schema.event)
			.set({ status: "draft" })
			.where(eq(schema.event.id, instance.eventId));
		return;
	}

	if (step.nextStepId == null) {
		await tx
			.update(schema.workflowInstance)
			.set({ status: "completed", completedAt: sql`now()` })
			.where(eq(schema.workflowInstance.id, step.instanceId));

		await tx
			.update(schema.event)
			.set({ status: "approved" })
			.where(eq(schema.event.id, instance.eventId));
		return;
	}

	await tx
		.update(schema.workflowInstanceStep)
		.set({ status: "active" })
		.where(eq(schema.workflowInstanceStep.id, step.nextStepId));

	await resolveStep(tx, step.nextStepId);
}

import { describe, expect, it } from "vitest";
import { orderWorkflowSteps } from "@/lib/helpers.js";

type Step = { id: number; nextStepId: number | null };

describe("orderWorkflowSteps", () => {
	it("returns empty array when no steps provided", () => {
		expect(orderWorkflowSteps([], null)).toEqual([]);
		expect(orderWorkflowSteps([], 1)).toEqual([]);
	});

	it("throws when steps exist but initialStepId is null", () => {
		const steps: Step[] = [{ id: 1, nextStepId: null }];
		expect(() => orderWorkflowSteps(steps, null)).toThrow(
			"Initial step ID is required for ordering steps",
		);
	});

	it("orders a single step with no next", () => {
		const steps: Step[] = [{ id: 1, nextStepId: null }];
		expect(orderWorkflowSteps(steps, 1)).toEqual([{ id: 1, nextStepId: null }]);
	});

	it("orders a simple chain regardless of input order", () => {
		const steps: Step[] = [
			{ id: 3, nextStepId: null },
			{ id: 1, nextStepId: 2 },
			{ id: 2, nextStepId: 3 },
		];
		const result = orderWorkflowSteps(steps, 1);
		expect(result.map((s) => s.id)).toEqual([1, 2, 3]);
	});

	it("preserves full object shape, not just id", () => {
		const steps = [
			{ id: 1, nextStepId: 2, name: "Review" },
			{ id: 2, nextStepId: null, name: "Approve" },
		];
		const result = orderWorkflowSteps(steps, 1);
		expect(result).toEqual([
			{ id: 1, nextStepId: 2, name: "Review" },
			{ id: 2, nextStepId: null, name: "Approve" },
		]);
	});

	it("throws (unreachable) when initialStepId points to a step not in the list", () => {
		const steps: Step[] = [{ id: 2, nextStepId: null }];
		expect(() => orderWorkflowSteps(steps, 1)).toThrow();
	});

	it("throws (unreachable) when nextStepId points to a missing step", () => {
		const steps: Step[] = [{ id: 1, nextStepId: 99 }];
		expect(() => orderWorkflowSteps(steps, 1)).toThrow();
	});

	it("throws (unreachable) on a cycle", () => {
		const steps: Step[] = [
			{ id: 1, nextStepId: 2 },
			{ id: 2, nextStepId: 1 },
		];
		expect(() => orderWorkflowSteps(steps, 1)).toThrow();
	});

	it("throws (unreachable) on a self-referencing cycle", () => {
		const steps: Step[] = [{ id: 1, nextStepId: 1 }];
		expect(() => orderWorkflowSteps(steps, 1)).toThrow();
	});

	it("ignores steps unreachable from initialStepId (does not error, just excludes them)", () => {
		const steps: Step[] = [
			{ id: 1, nextStepId: null },
			{ id: 2, nextStepId: null }, // orphan, not linked from 1
		];
		const result = orderWorkflowSteps(steps, 1);
		expect(result.map((s) => s.id)).toEqual([1]);
	});

	it("does not mutate the input array", () => {
		const steps: Step[] = [
			{ id: 1, nextStepId: 2 },
			{ id: 2, nextStepId: null },
		];
		const snapshot = JSON.parse(JSON.stringify(steps));
		orderWorkflowSteps(steps, 1);
		expect(steps).toEqual(snapshot);
	});
});

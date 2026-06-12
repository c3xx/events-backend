import z from "zod";
import { idLike } from "@/lib/helpers.js";

export const respondToAssignmentsSchema = z
	.object({
		assignmentIds: z
			.array(idLike("Invalid assignment ID"))
			.nonempty({ error: "Expected at least one assignment ID" }),
		decision: z.enum(["approved", "denied"], {
			error: "Decision must be either approved or denied",
		}),
		remarks: z.string({ error: "Invalid remarks" }).trim(),
	})
	.strict();

export type RespondToAssignmentsSchema = z.output<typeof respondToAssignmentsSchema>;

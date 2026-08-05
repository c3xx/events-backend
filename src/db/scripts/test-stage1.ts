import { eq } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import {
	findOrganizerEmails,
	findPendingApproverEmailsForStep,
} from "@/modules/notification/repository.js";

async function main() {
	console.log("=== STAGE 1 NOTIFICATION RECIPIENT RESOLUTION TEST ===");

	const activeInstance = await db.query.workflowInstance.findFirst({
		where: eq(schema.workflowInstance.status, "active"),
		with: {
			event: true,
			steps: true,
		},
	});

	if (!activeInstance) {
		console.log("No active workflow instance found in database.");
		return;
	}

	console.log(`\nTesting Event #${activeInstance.eventId}: "${activeInstance.event.title}"`);

	// 1. Organizer Recipients (O1)
	const organizers = await findOrganizerEmails(activeInstance.eventId);
	console.log("\n[O1] Organizer Recipients (Event Submitted Email):");
	console.table(organizers);

	// 2. Approver Recipients (F1)
	const activeStep = activeInstance.steps.find((s) => s.status === "active");
	if (activeStep) {
		const approvers = await findPendingApproverEmailsForStep(activeStep.id);
		console.log(
			`\n[F1] Pending Approver Recipients for Step "${activeStep.name}" (ID: ${activeStep.id}):`,
		);
		console.table(approvers);
	} else {
		console.log("\nNo active step found for instance:", activeInstance.id);
	}
}

main().catch(console.error);

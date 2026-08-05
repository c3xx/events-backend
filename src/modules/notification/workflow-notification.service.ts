import { sendEmail } from "@/lib/email.js";
import { env } from "@/lib/env.js";
import {
	getStepActivatedContent,
	getWorkflowSubmittedContent,
} from "@/lib/workflow-email-templates.js";
import * as repository from "./workflow-notification.repository.js";

const APPROVALS_URL = `${env.FRONTEND_ORIGIN}/approvals`;

/**
 * O1 — Notify organizers when the event is submitted.
 * Includes the name of the first step that is now active.
 */
export async function sendWorkflowSubmittedNotification(
	eventId: number,
	eventTitle: string,
	firstStepName: string,
	startsAt: string,
	endsAt: string,
) {
	const recipients = await repository.findOrganizerEmails(eventId);
	if (recipients.length === 0) return;

	await sendEmail({
		to: recipients.map((r) => r.email),
		subject: `Event Submitted for Approval — ${eventTitle}`,
		html: getWorkflowSubmittedContent(eventTitle, firstStepName, startsAt, endsAt),
	}).catch((err) => {
		console.error("[workflow-notification] Failed to send workflow submitted email:", err);
	});
}

/**
 * F1 — Notify each pending approver on a newly activated step.
 * Each approver gets a separate email that includes their specific role and scope.
 */
export async function sendStepActivatedNotification(
	stepId: number,
	eventTitle: string,
	stepName: string,
	startsAt: string,
	endsAt: string,
) {
	const recipients = await repository.findPendingApproverEmailsForStep(stepId);
	if (recipients.length === 0) return;

	await Promise.all(
		recipients.map((recipient) =>
			sendEmail({
				to: [recipient.email],
				subject: `Approval Required — ${eventTitle} (${stepName})`,
				html: getStepActivatedContent(
					eventTitle,
					stepName,
					recipient.roleName,
					recipient.scopeName ?? "your organization",
					startsAt,
					endsAt,
					APPROVALS_URL,
				),
			}).catch((err) => {
				console.error(
					`[workflow-notification] Failed to send step activated email to ${recipient.email}:`,
					err,
				);
			}),
		),
	);
}

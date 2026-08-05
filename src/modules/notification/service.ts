import { sendEmail } from "@/lib/email/index.js";
import { env } from "@/lib/env.js";
import {
	getStepActivatedContent,
	getStepTransitionContent,
	getWorkflowApprovedContent,
	getWorkflowDeniedContent,
	getWorkflowSubmittedContent,
} from "@/lib/email/workflow-email-templates.js";
import * as repository from "./repository.js";

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
 * Each approver gets a separate email detailing their specific role and scope.
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

/**
 * O2 + F1 — Notify organizers when Stage N clears and Stage N+1 begins,
 * AND notify Stage N+1's approvers in a single step.
 */
export async function sendStepTransitionNotification(
	eventId: number,
	eventTitle: string,
	clearedStepName: string,
	nextStepName: string,
	nextStepId: number,
	startsAt: string,
	endsAt: string,
) {
	// 1. Notify organizers of transition (O2)
	const organizers = await repository.findOrganizerEmails(eventId);
	if (organizers.length > 0) {
		await sendEmail({
			to: organizers.map((r) => r.email),
			subject: `Stage Approved — ${eventTitle}`,
			html: getStepTransitionContent(eventTitle, clearedStepName, nextStepName),
		}).catch((err) => {
			console.error("[workflow-notification] Failed to send step transition email:", err);
		});
	}

	// 2. Notify next step approvers (F1 for next step)
	await sendStepActivatedNotification(nextStepId, eventTitle, nextStepName, startsAt, endsAt);
}

/**
 * O3 — Notify organizers when the workflow is fully approved through all stages.
 */
export async function sendWorkflowApprovedNotification(
	eventId: number,
	eventTitle: string,
	startsAt: string,
	endsAt: string,
) {
	const recipients = await repository.findOrganizerEmails(eventId);
	if (recipients.length === 0) return;

	await sendEmail({
		to: recipients.map((r) => r.email),
		subject: `Event Approved — ${eventTitle}`,
		html: getWorkflowApprovedContent(eventTitle, startsAt, endsAt),
	}).catch((err) => {
		console.error("[workflow-notification] Failed to send workflow approved email:", err);
	});
}

/**
 * O4 — Notify organizers when the event approval is rejected at any stage.
 */
export async function sendWorkflowDeniedNotification(
	eventId: number,
	eventTitle: string,
	stepName: string,
	remarks: string | null,
) {
	const recipients = await repository.findOrganizerEmails(eventId);
	if (recipients.length === 0) return;

	await sendEmail({
		to: recipients.map((r) => r.email),
		subject: `Event Approval Rejected — ${eventTitle}`,
		html: getWorkflowDeniedContent(eventTitle, stepName, remarks),
	}).catch((err) => {
		console.error("[workflow-notification] Failed to send workflow denied email:", err);
	});
}

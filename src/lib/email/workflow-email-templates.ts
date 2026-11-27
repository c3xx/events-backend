export function getWorkflowSubmittedContent(
	eventTitle: string,
	firstStepName: string,
	startsAt: string,
	endsAt: string,
) {
	return `
<p>Hello,</p>
<p>Your event <strong>${eventTitle}</strong> has been submitted for approval. The approval workflow has started.</p>
<p>Stage <strong>${firstStepName}</strong> is now active and pending review.</p>
<p>Event: ${eventTitle}</p>
<p>Starts: ${startsAt.slice(0, 10)}</p>
<p>Ends: ${endsAt.slice(0, 10)}</p>
<p>You will be notified as each stage progresses.</p>
<p>This is an automated message. Please do not reply.</p>
`;
}

export function getStepActivatedContent(
	eventTitle: string,
	stepName: string,
	roleName: string,
	scopeName: string,
	startsAt: string,
	endsAt: string,
	dashboardUrl: string,
) {
	return `
<p>Hello,</p>
<p>You are required to review an event approval request.</p>
<p>Event: <strong>${eventTitle}</strong></p>
<p>Stage: ${stepName}</p>
<p>Your role: ${roleName} at ${scopeName}</p>
<p>Event dates: ${startsAt.slice(0, 10)} to ${endsAt.slice(0, 10)}</p>
<p>Please log in to the portal to view the details and submit your decision:</p>
<p>${dashboardUrl}</p>
<p>This is an automated message. Please do not reply.</p>
`;
}

export function getStepTransitionContent(
	eventTitle: string,
	clearedStepName: string,
	nextStepName: string,
) {
	return `
<p>Hello,</p>
<p>Stage <strong>${clearedStepName}</strong> for event <strong>${eventTitle}</strong> has been approved.</p>
<p>The workflow has moved to the next stage: <strong>${nextStepName}</strong>.</p>
<p>You will be notified as each stage progresses.</p>
<p>This is an automated message. Please do not reply.</p>
`;
}

export function getWorkflowApprovedContent(eventTitle: string, startsAt: string, endsAt: string) {
	return `
<p>Hello,</p>
<p>Your event <strong>${eventTitle}</strong> has been approved through all workflow stages.</p>
<p>Event: ${eventTitle}</p>
<p>Starts: ${startsAt.slice(0, 10)}</p>
<p>Ends: ${endsAt.slice(0, 10)}</p>
<p>This is an automated message. Please do not reply.</p>
`;
}

export function getWorkflowDeniedContent(
	eventTitle: string,
	stepName: string,
	remarks: string | null,
) {
	return `
<p>Hello,</p>
<p>The approval for event <strong>${eventTitle}</strong> was rejected at stage <strong>${stepName}</strong>.</p>
<p>Remarks: ${remarks ?? "No remarks provided."}</p>
<p>You may update the event details and resubmit for approval.</p>
<p>This is an automated message. Please do not reply.</p>
`;
}

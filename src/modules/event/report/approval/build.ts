import {
	buildFacilities,
	buildOrganizers,
	buildReferenceNumber,
	buildVenues,
	type EventReportData,
	INSTITUTION,
} from "../shared/build.js";
import { formatDateTime } from "../shared/format.js";
import type { ApprovalEntry, ApprovalReport } from "../shared/types.js";

function buildApprovalHistory(approvedSteps: EventReportData["approvedSteps"]): ApprovalEntry[] {
	if (!approvedSteps || approvedSteps.length === 0) {
		return [];
	}

	const sortedSteps = [...approvedSteps].sort((a, b) => {
		const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
		const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
		return aTime - bTime;
	});

	return sortedSteps.map((step) => ({
		roleName: step.roleName,
		approverName: step.approverName,
	}));
}

export function buildApprovalReport(event: EventReportData): ApprovalReport {
	const approvalHistory = buildApprovalHistory(event.approvedSteps);
	const refNo = buildReferenceNumber(event);
	const venues = buildVenues(event.venueAllotments ?? []);
	const facilities = buildFacilities(event.venueAllotments ?? []);
	const organizers = buildOrganizers(event);

	return {
		title: "Event Approval Report",
		generatedAt: new Date().toISOString(),
		institution: INSTITUTION,
		referenceNumber: refNo,
		eventName: event.title,
		description: event.requestDetails.trim() || "-",
		dateTimeRange: `${formatDateTime(event.startsAt)} to ${formatDateTime(event.endsAt)}`,
		venues,
		facilities,
		organizers,
		...(approvalHistory.length > 0 ? { approvalHistory } : {}),
		...(event.category?.name ? { eventCategory: event.category.name } : {}),
	};
}

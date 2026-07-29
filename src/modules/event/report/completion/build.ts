import {
	buildOrganizers,
	buildReferenceNumber,
	buildVenues,
	type EventReportData,
	INSTITUTION,
} from "../shared/build.js";
import { formatDateTime } from "../shared/format.js";
import type { CompletionReport } from "../shared/types.js";

export function buildCompletionReport(event: EventReportData): CompletionReport {
	const refNo = buildReferenceNumber(event);
	const venues = buildVenues(event.venueAllotments ?? []);
	const organizers = buildOrganizers(event);

	return {
		title: "Event Completion Report",
		generatedAt: new Date().toISOString(),
		institution: INSTITUTION,
		referenceNumber: refNo,
		eventName: event.title,
		dateTimeRange: `${formatDateTime(event.startsAt)} to ${formatDateTime(event.endsAt)}`,
		venues,
		organizers,
		participantsCount: event.report?.participantsCount ?? 0,
		description: event.report?.details ?? "-",
		imageUrls: event.report?.images?.map((i) => i.imageUrl) ?? [],
	};
}

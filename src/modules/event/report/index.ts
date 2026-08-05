import { buildApprovalReport } from "./approval/build.js";
import { renderApprovalReportPdf } from "./approval/render.js";
import { buildCompletionReport } from "./completion/build.js";
import { renderCompletionReportPdf } from "./completion/render.js";
import type { EventReportData } from "./shared/build.js";

export type { EventReportData } from "./shared/build.js";

export async function generateApprovalReportPdf(event: EventReportData): Promise<Buffer> {
	const report = buildApprovalReport(event);
	return await renderApprovalReportPdf(report);
}

export async function generateCompletionReportPdf(event: EventReportData): Promise<Buffer> {
	const report = buildCompletionReport(event);
	return await renderCompletionReportPdf(report);
}

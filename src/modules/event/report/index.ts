import type { EventReportData } from "./build.js";
import { buildApprovalReport } from "./build.js";
import { renderReportPdf } from "./render.js";

export type { EventReportData } from "./build.js";
export type { ApprovalReport } from "./types.js";

export async function generateApprovalReportPdf(event: EventReportData): Promise<Buffer> {
	const report = buildApprovalReport(event);
	return await renderReportPdf(report);
}

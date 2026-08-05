import PDFDocument from "pdfkit";
import {
	applyStyle,
	ensureSpace,
	type Field,
	LAYOUT,
	PAGE_MARGIN,
	renderColumn,
	renderFacilities,
	renderFooters,
	renderLetterhead,
	renderOrganizers,
	renderRunningHeader,
	renderVenues,
	simpleValue,
} from "../shared/render.js";
import type { ApprovalReport } from "../shared/types.js";

type Signatory = { name: string; role?: string };

function dedupeApprovers(history: ApprovalReport["approvalHistory"]): Signatory[] {
	if (!history || history.length === 0) return [];

	const reversed = [...history].reverse();
	const seen = new Set<string>();
	const signatories: Signatory[] = [];

	for (const step of reversed) {
		if (step && !seen.has(step.approverName)) {
			seen.add(step.approverName);
			signatories.push({
				name: step.approverName,
				...(signatories.length === 0 ? { role: step.roleName } : {}),
			});
		}
	}
	return signatories;
}

function renderSignaturesAndStamp(doc: PDFKit.PDFDocument, report: ApprovalReport): void {
	doc.y = ensureSpace(doc, LAYOUT.beforeSignatures, doc.y);
	doc.moveDown(0.6);

	const blockY = doc.y;
	const rightX = doc.page.width - PAGE_MARGIN - LAYOUT.signatureBlockWidth;

	applyStyle(doc, "verifiedByLabel").text("Verified By:", rightX, blockY);

	const signatories: Signatory[] =
		report.approvalHistory && report.approvalHistory.length > 0
			? dedupeApprovers(report.approvalHistory)
			: [];

	let cursorY = doc.y + LAYOUT.afterFirstSignatory;
	signatories.forEach((sig, i) => {
		const line = sig.role ? `${i + 1}. ${sig.name} (${sig.role})` : `${i + 1}. ${sig.name}`;
		applyStyle(doc, "signatory").text(line, rightX, cursorY, {
			width: LAYOUT.signatureBlockWidth,
		});
		cursorY = doc.y + (i === 0 ? LAYOUT.afterFirstSignatory : LAYOUT.afterSignatory);
	});

	if (signatories.length > 0) doc.y = cursorY + LAYOUT.afterSignatureBlock;
}

export function renderApprovalReportPdf(report: ApprovalReport): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
		const chunks: Buffer[] = [];

		doc.on("data", (chunk: Buffer) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		let isFirstPage = true;
		doc.on("pageAdded", () => {
			if (isFirstPage) {
				isFirstPage = false;
				return;
			}
			renderRunningHeader(doc, report.institution?.name, report.title);
		});

		renderLetterhead(doc, report.institution);

		const metaY = doc.y;
		if (report.referenceNumber) {
			applyStyle(doc, "referenceNumber").text(report.referenceNumber, PAGE_MARGIN, metaY, {
				align: "left",
			});
		}
		const dateStr = new Date(report.generatedAt).toLocaleDateString("en-IN", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
		applyStyle(doc, "dateMeta").text(dateStr, doc.page.width - PAGE_MARGIN - 150, metaY, {
			width: 150,
			align: "right",
		});
		doc.moveDown(1.7);

		const colWidth = (doc.page.width - PAGE_MARGIN * 2 - LAYOUT.columnGap) / 2;
		const col1X = PAGE_MARGIN;
		const col2X = PAGE_MARGIN + colWidth + LAYOUT.columnGap;
		const startY = doc.y;

		const categoryStr = report.eventCategory ? ` : ${report.eventCategory}` : "";

		const leftFields: Field[] = [
			{ label: "EVENT NAME", renderValue: simpleValue(`${report.eventName}${categoryStr}`) },
			{ label: "DATE & TIME", renderValue: simpleValue(report.dateTimeRange) },
			{
				label: "ORGANIZED BY",
				renderValue: (d, x, y, w) => renderOrganizers(d, x, y, w, report.organizers),
			},
		];

		const rightFields: Field[] = [
			{
				label: "VENUE(S)",
				renderValue: (d, x, y, w) => renderVenues(d, x, y, w, report.venues),
			},
			{
				label: "FACILITIES",
				renderValue: (d, x, y, w) => renderFacilities(d, x, y, w, report.facilities),
			},
		];

		const leftY = renderColumn(doc, leftFields, col1X, startY, colWidth);
		const rightY = renderColumn(doc, rightFields, col2X, startY, colWidth);

		// ================= FULL WIDTH =================
		const row3Y = Math.max(leftY, rightY) + LAYOUT.sectionGap;

		const descriptionY = ensureSpace(doc, LAYOUT.beforeSection, row3Y);
		applyStyle(doc, "label").text("DESCRIPTION", col1X, descriptionY);
		applyStyle(doc, "value").text(report.description, col1X, doc.y + LAYOUT.afterLabel, {
			width: doc.page.width - PAGE_MARGIN * 2,
			align: "justify",
			lineGap: 4,
		});
		doc.moveDown(0.5);

		renderSignaturesAndStamp(doc, report);
		renderFooters(doc, report.generatedAt);
		doc.end();
	});
}

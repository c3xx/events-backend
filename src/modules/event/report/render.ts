import PDFDocument from "pdfkit";
import { formatDateTime } from "./format.js";
import type { ApprovalReport, ReportInstitution } from "./types.js";

const PAGE_MARGIN = 45;
const LOGO_SIZE = 60;
const COLOR_PRIMARY = "#1a3c6e";
const COLOR_TEXT = "#000000";
const COLOR_MUTED = "#475569";
const COLOR_RULE = "#cbd5e1";
const FOOTER_HEIGHT = 40;

const LAYOUT = {
	columnGap: 30,
	afterLabel: 6,
	afterField: 16,
	sectionGap: 12,
	beforeSection: 100,
	beforeSignatures: 130,
	signatureBlockWidth: 220,
	afterOrgName: 2,
	afterCoordinator: 3,
	afterVenueEntry: 4,
	afterFacilityLine: 2,
	afterFirstSignatory: 6,
	afterSignatory: 4,
	afterSignatureBlock: 15,
};

const STYLE = {
	institutionName: { font: "Times-Bold", size: 18, color: COLOR_PRIMARY },
	subtitle: { font: "Times-Roman", size: 10, color: COLOR_MUTED },
	logoPlaceholder: { font: "Times-Bold", size: 6, color: "#94a3b8" },
	runningHeader: { font: "Times-Roman", size: 8, color: COLOR_MUTED },
	footerText: { font: "Times-Roman", size: 8, color: COLOR_MUTED },
	referenceNumber: { font: "Times-Bold", size: 12, color: COLOR_PRIMARY },
	dateMeta: { font: "Times-Roman", size: 12, color: COLOR_MUTED },
	label: { font: "Times-Bold", size: 11, color: COLOR_MUTED },
	value: { font: "Times-Roman", size: 12, color: COLOR_TEXT },
	orgName: { font: "Times-Bold", size: 12, color: COLOR_TEXT },
	coordinator: { font: "Times-Roman", size: 12, color: COLOR_MUTED },
	venueName: { font: "Times-Bold", size: 12, color: COLOR_TEXT },
	verifiedByLabel: { font: "Times-Bold", size: 12, color: COLOR_MUTED },
	signatory: { font: "Times-Bold", size: 14, color: COLOR_TEXT },
} as const;

type StyleKey = keyof typeof STYLE;

// Applies a named style's font, size, and color to the document in one call.
function applyStyle(doc: PDFKit.PDFDocument, key: StyleKey): PDFKit.PDFDocument {
	const s = STYLE[key];
	return doc.font(s.font).fontSize(s.size).fillColor(s.color);
}

function pageBottom(doc: PDFKit.PDFDocument): number {
	return doc.page.height - doc.page.margins.bottom - FOOTER_HEIGHT;
}

function ensureSpace(doc: PDFKit.PDFDocument, minSpace: number, y: number): number {
	if (y + minSpace > pageBottom(doc)) {
		doc.addPage();
		return doc.y;
	}
	return y;
}

function drawLogoPlaceholder(doc: PDFKit.PDFDocument, x: number, y: number): void {
	doc.save();
	doc.rect(x, y, LOGO_SIZE, LOGO_SIZE).fillColor("#f1f5f9").fill();
	doc.rect(x, y, LOGO_SIZE, LOGO_SIZE).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
	applyStyle(doc, "logoPlaceholder").text("LOGO PLACEHOLDER", x, y + LOGO_SIZE / 2 - 3, {
		width: LOGO_SIZE,
		align: "center",
	});
	doc.restore();
}

type Field = {
	label: string;
	/** Draws the value content and returns the y-coordinate after it. */
	renderValue: (doc: PDFKit.PDFDocument, x: number, y: number, width: number) => number;
};

//  A field renderer for a plain single-line value (e.g. EVENT NAME, DATE & TIME).
function simpleValue(value: string): Field["renderValue"] {
	return (doc, x, y, width) => {
		applyStyle(doc, "value").text(value, x, y, { width });
		return doc.y;
	};
}

// Draws a labeled field, then hands off to its value renderer. Returns the next field's start y.
function renderField(
	doc: PDFKit.PDFDocument,
	field: Field,
	x: number,
	y: number,
	width: number,
): number {
	y = ensureSpace(doc, LAYOUT.beforeSection, y);
	applyStyle(doc, "label").text(field.label, x, y);
	const valueBottom = field.renderValue(doc, x, doc.y + LAYOUT.afterLabel, width);
	return valueBottom + LAYOUT.afterField;
}

// Renders a vertical stack of fields in one column, returning the final y.
function renderColumn(
	doc: PDFKit.PDFDocument,
	fields: Field[],
	x: number,
	y: number,
	width: number,
): number {
	let cursorY = y;
	for (const field of fields) {
		cursorY = renderField(doc, field, x, cursorY, width);
	}
	return cursorY - LAYOUT.afterField;
}

function renderOrganizers(
	doc: PDFKit.PDFDocument,
	x: number,
	y: number,
	width: number,
	organizers: ApprovalReport["organizers"],
): number {
	let cursorY = y;
	organizers.forEach((org, i) => {
		applyStyle(doc, "orgName").text(`${i + 1}. ${org.name}`, x, cursorY, { width });
		cursorY = doc.y + LAYOUT.afterOrgName;

		if (org.coordinator) {
			applyStyle(doc, "coordinator").text(
				`    ${org.coordinator.name} (${org.coordinator.email})`,
				x,
				cursorY,
				{ width },
			);
			cursorY = doc.y + LAYOUT.afterCoordinator;
		}
	});
	return cursorY;
}

function renderVenues(
	doc: PDFKit.PDFDocument,
	x: number,
	y: number,
	width: number,
	venues: ApprovalReport["venues"],
): number {
	let cursorY = y;
	for (const v of venues) {
		applyStyle(doc, "venueName").text(v.name, x, cursorY, { width });
		applyStyle(doc, "value").text(v.timeRange, x, doc.y + 1, { width });
		cursorY = doc.y + LAYOUT.afterVenueEntry;
	}
	return cursorY;
}

function renderFacilities(
	doc: PDFKit.PDFDocument,
	x: number,
	y: number,
	width: number,
	facilities: string[],
): number {
	let cursorY = y;
	for (const f of facilities) {
		applyStyle(doc, "value").text(`•  ${f}`, x, cursorY, { width });
		cursorY = doc.y + LAYOUT.afterFacilityLine;
	}
	return cursorY;
}

function renderLetterhead(
	doc: PDFKit.PDFDocument,
	institution: ReportInstitution | undefined,
): void {
	if (!institution) return;

	const startY = doc.y - 12;
	const logoX = PAGE_MARGIN;

	if (institution.logoPath) {
		try {
			doc.image(institution.logoPath, logoX, startY, { width: LOGO_SIZE, height: LOGO_SIZE });
		} catch {
			drawLogoPlaceholder(doc, logoX, startY);
		}
	} else {
		drawLogoPlaceholder(doc, logoX, startY);
	}

	doc.y = startY;

	const drawCenteredLine = (text: string, style: StyleKey) => {
		applyStyle(doc, style);
		const w = doc.widthOfString(text);
		doc.text(text, (doc.page.width - w) / 2 + 20, doc.y);
	};

	drawCenteredLine(institution.name, "institutionName");
	if (institution.tagline) drawCenteredLine(institution.tagline, "subtitle");
	if (institution.address) drawCenteredLine(institution.address, "subtitle");
	if (institution.accreditation) drawCenteredLine(institution.accreditation, "subtitle");

	const contactLine = [institution.phone, institution.fax].filter(Boolean).join("   ");
	if (contactLine) drawCenteredLine(contactLine, "subtitle");

	const webLine = [institution.email, institution.website].filter(Boolean).join("   ");
	if (webLine) drawCenteredLine(webLine, "subtitle");

	doc.y = Math.max(doc.y, startY + LOGO_SIZE) + 8;

	const ruleY = doc.y;
	doc
		.moveTo(PAGE_MARGIN, ruleY)
		.lineTo(doc.page.width - PAGE_MARGIN, ruleY)
		.lineWidth(1.2)
		.strokeColor(COLOR_PRIMARY)
		.stroke();
	doc.moveDown(0.8);
}

function renderRunningHeader(doc: PDFKit.PDFDocument, report: ApprovalReport): void {
	const y = doc.page.margins.top;
	const w = doc.page.width - PAGE_MARGIN * 2;
	applyStyle(doc, "runningHeader");
	doc.text(report.institution?.name ?? report.title, PAGE_MARGIN, y, { width: w, align: "left" });
	doc.text(report.title, PAGE_MARGIN, y, { width: w, align: "right" });

	const ruleY = y + 14;
	doc
		.moveTo(PAGE_MARGIN, ruleY)
		.lineTo(doc.page.width - PAGE_MARGIN, ruleY)
		.lineWidth(0.5)
		.strokeColor(COLOR_RULE)
		.stroke();
	doc.y = ruleY + 14;
}

function renderFooters(doc: PDFKit.PDFDocument, generatedAt: string): void {
	const range = doc.bufferedPageRange();
	const w = doc.page.width - PAGE_MARGIN * 2;
	for (let i = range.start; i < range.start + range.count; i++) {
		doc.switchToPage(i);
		const y = doc.page.height - doc.page.margins.bottom - 20;
		doc
			.moveTo(PAGE_MARGIN, y)
			.lineTo(doc.page.width - PAGE_MARGIN, y)
			.lineWidth(0.5)
			.strokeColor(COLOR_RULE)
			.stroke();

		applyStyle(doc, "footerText").text(`${formatDateTime(generatedAt)}`, PAGE_MARGIN, y + 6, {
			width: w - 80,
			align: "left",
		});
		applyStyle(doc, "footerText").text(
			`Page ${i - range.start + 1} of ${range.count}`,
			doc.page.width - PAGE_MARGIN - 80,
			y + 6,
			{ width: 80, align: "right" },
		);
	}
}

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
			: report.signerName && report.signerTitle
				? [{ name: report.signerName, role: report.signerTitle }]
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

export function renderReportPdf(report: ApprovalReport): Promise<Buffer> {
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
			renderRunningHeader(doc, report);
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

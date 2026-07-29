import { formatDateTime } from "./format.js";
import type { ReportInstitution } from "./types.js";

export const PAGE_MARGIN = 45;
export const LOGO_SIZE = 60;
export const COLOR_PRIMARY = "#1a3c6e";
export const COLOR_TEXT = "#000000";
export const COLOR_MUTED = "#475569";
export const COLOR_RULE = "#cbd5e1";
export const FOOTER_HEIGHT = 40;

export const LAYOUT = {
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

export const STYLE = {
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

export type StyleKey = keyof typeof STYLE;

export function applyStyle(doc: PDFKit.PDFDocument, key: StyleKey): PDFKit.PDFDocument {
	const s = STYLE[key];
	return doc.font(s.font).fontSize(s.size).fillColor(s.color);
}

export function pageBottom(doc: PDFKit.PDFDocument): number {
	return doc.page.height - doc.page.margins.bottom - FOOTER_HEIGHT;
}

export function ensureSpace(doc: PDFKit.PDFDocument, minSpace: number, y: number): number {
	if (y + minSpace > pageBottom(doc)) {
		doc.addPage();
		return doc.y;
	}
	return y;
}

export function drawLogoPlaceholder(doc: PDFKit.PDFDocument, x: number, y: number): void {
	doc.save();
	doc.rect(x, y, LOGO_SIZE, LOGO_SIZE).fillColor("#f1f5f9").fill();
	doc.rect(x, y, LOGO_SIZE, LOGO_SIZE).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
	applyStyle(doc, "logoPlaceholder").text("LOGO PLACEHOLDER", x, y + LOGO_SIZE / 2 - 3, {
		width: LOGO_SIZE,
		align: "center",
	});
	doc.restore();
}

export type Field = {
	label: string;
	renderValue: (doc: PDFKit.PDFDocument, x: number, y: number, width: number) => number;
};

export function simpleValue(value: string): Field["renderValue"] {
	return (doc, x, y, width) => {
		applyStyle(doc, "value").text(value, x, y, { width });
		return doc.y;
	};
}

export function renderField(
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

export function renderColumn(
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

export function renderOrganizers(
	doc: PDFKit.PDFDocument,
	x: number,
	y: number,
	width: number,
	organizers: { name: string; coordinator?: { name: string; email: string } }[],
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

export function renderVenues(
	doc: PDFKit.PDFDocument,
	x: number,
	y: number,
	width: number,
	venues: { name: string; timeRange: string }[],
): number {
	let cursorY = y;
	for (const v of venues) {
		applyStyle(doc, "venueName").text(v.name, x, cursorY, { width });
		applyStyle(doc, "value").text(v.timeRange, x, doc.y + 1, { width });
		cursorY = doc.y + LAYOUT.afterVenueEntry;
	}
	return cursorY;
}

export function renderFacilities(
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

export function renderLetterhead(
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

export function renderRunningHeader(
	doc: PDFKit.PDFDocument,
	institutionName: string | undefined,
	reportTitle: string,
): void {
	const y = doc.page.margins.top;
	const w = doc.page.width - PAGE_MARGIN * 2;
	applyStyle(doc, "runningHeader");
	doc.text(institutionName ?? reportTitle, PAGE_MARGIN, y, { width: w, align: "left" });
	doc.text(reportTitle, PAGE_MARGIN, y, { width: w, align: "right" });

	const ruleY = y + 14;
	doc
		.moveTo(PAGE_MARGIN, ruleY)
		.lineTo(doc.page.width - PAGE_MARGIN, ruleY)
		.lineWidth(0.5)
		.strokeColor(COLOR_RULE)
		.stroke();
	doc.y = ruleY + 14;
}

export function renderFooters(doc: PDFKit.PDFDocument, generatedAt: string): void {
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

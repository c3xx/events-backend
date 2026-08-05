import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import {
	applyStyle,
	ensureSpace,
	type Field,
	LAYOUT,
	PAGE_MARGIN,
	renderColumn,
	renderFooters,
	renderLetterhead,
	renderOrganizers,
	renderRunningHeader,
	renderVenues,
	simpleValue,
} from "../shared/render.js";
import type { CompletionReport } from "../shared/types.js";

export function renderCompletionReportPdf(report: CompletionReport): Promise<Buffer> {
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

		const leftFields: Field[] = [
			{ label: "EVENT NAME", renderValue: simpleValue(report.eventName) },
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
				label: "PARTICIPANT COUNT",
				renderValue: simpleValue(report.participantsCount.toString()),
			},
		];

		const leftY = renderColumn(doc, leftFields, col1X, startY, colWidth);
		const rightY = renderColumn(doc, rightFields, col2X, startY, colWidth);

		// ================= FULL WIDTH =================
		const row3Y = Math.max(leftY, rightY) + LAYOUT.sectionGap;

		const descriptionY = ensureSpace(doc, LAYOUT.beforeSection, row3Y);
		applyStyle(doc, "label").text("EVENT DESCRIPTION", col1X, descriptionY);
		applyStyle(doc, "value").text(report.description, col1X, doc.y + LAYOUT.afterLabel, {
			width: doc.page.width - PAGE_MARGIN * 2,
			align: "justify",
			lineGap: 4,
		});
		doc.moveDown(0.5);

		// Images
		doc.addPage();
		applyStyle(doc, "label");

		if (!report.imageUrls || report.imageUrls.length === 0) {
			applyStyle(doc, "value").text("No images attached.", col1X, doc.y + LAYOUT.afterLabel);
			renderFooters(doc, report.generatedAt);
			doc.end();
		} else {
			applyStyle(doc, "value");

			(async () => {
				const COL_WIDTH = 220;
				const MAX_ROW_HEIGHT = 600;
				const GAP_X = 20;
				const GAP_Y = 20;
				const GRID_MARGIN = (doc.page.width - (COL_WIDTH * 2 + GAP_X)) / 2;

				let imagesOnCurrentPage = 0;
				const colY: [number, number] = [doc.y + LAYOUT.afterLabel, doc.y + LAYOUT.afterLabel];

				const urls = report.imageUrls || [];
				for (const imgUrl of urls) {
					try {
						// Treat as local file path, remove leading slash if any
						const safePath = imgUrl.startsWith("/") ? imgUrl.substring(1) : imgUrl;
						const finalPath = safePath.startsWith(".temp/data/images")
							? safePath
							: path.join("src/assets", safePath);
						const inputBuffer = fs.readFileSync(path.resolve(process.cwd(), finalPath));
						// Compress the image and auto-orient based on EXIF
						const compressedBuffer = await sharp(inputBuffer)
							.rotate() // Auto-orient based on EXIF data
							.resize({ width: 500, withoutEnlargement: true }) // reasonable size for a PDF half-page width
							.jpeg({ quality: 75 })
							.toBuffer();

						// Get final dimensions to calculate precise aspect ratio mapping
						const metadata = await sharp(compressedBuffer).metadata();
						const imgW = metadata.width || 1;
						const imgH = metadata.height || 1;

						if (imagesOnCurrentPage >= 6) {
							doc.addPage();
							colY[0] = PAGE_MARGIN;
							colY[1] = PAGE_MARGIN;
							imagesOnCurrentPage = 0;
						}

						const colIndex = colY[0] <= colY[1] ? 0 : 1;
						const currentY = colY[colIndex];

						// Fit within a bounding box
						const scale = Math.min(COL_WIDTH / imgW, MAX_ROW_HEIGHT / imgH);
						const renderW = imgW * scale;
						const renderH = imgH * scale;

						const finalY = ensureSpace(doc, renderH + GAP_Y, currentY);

						// If ensureSpace added a page due to height, reset columns and counter
						if (finalY !== currentY) {
							colY[0] = finalY;
							colY[1] = finalY;
							imagesOnCurrentPage = 0;
						}

						const cellX = GRID_MARGIN + colIndex * (COL_WIDTH + GAP_X);
						const xOffset = (COL_WIDTH - renderW) / 2;

						doc.image(compressedBuffer, cellX + xOffset, finalY, {
							width: renderW,
							height: renderH,
						});

						colY[colIndex] = finalY + renderH + GAP_Y;
						imagesOnCurrentPage++;
					} catch (_err) {
						if (imagesOnCurrentPage >= 6) {
							doc.addPage();
							colY[0] = PAGE_MARGIN;
							colY[1] = PAGE_MARGIN;
							imagesOnCurrentPage = 0;
						}

						const colIndex = colY[0] <= colY[1] ? 0 : 1;
						const currentY = colY[colIndex];

						const finalY = ensureSpace(doc, 150 + GAP_Y, currentY);

						if (finalY !== currentY) {
							colY[0] = finalY;
							colY[1] = finalY;
							imagesOnCurrentPage = 0;
						}

						const cellX = GRID_MARGIN + colIndex * (COL_WIDTH + GAP_X);

						// Fallback if image path is invalid
						doc.rect(cellX, finalY, COL_WIDTH, 150).lineWidth(1).strokeColor("#cbd5e1").stroke();
						applyStyle(doc, "subtitle").text(
							`[Image Placeholder: ${imgUrl}]`,
							cellX,
							finalY + 150 / 2 - 10,
							{
								width: COL_WIDTH,
								align: "center",
							},
						);

						colY[colIndex] = finalY + 150 + GAP_Y;
						imagesOnCurrentPage++;
					}
				}

				doc.y = Math.max(colY[0], colY[1]);

				renderFooters(doc, report.generatedAt);
				doc.end();
			})().catch(reject);
		}
	});
}

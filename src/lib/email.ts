import { Resend } from "resend";
import { AppError, ERROR_CODES } from "./errors.js";
import { quickEnv } from "./helpers.js";

const RESEND_API_TOKEN = quickEnv("RESEND_API_TOKEN", true);
const EMAIL_FROM = quickEnv("EMAIL_FROM", true);

const resend = new Resend(RESEND_API_TOKEN);

export async function sendEmail(details: {
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	html: string;
}) {
	const result = await resend.emails.send({
		from: EMAIL_FROM,
		to: details.to,
		subject: details.subject,
		html: details.html,
		...(details.cc != null ? { cc: details.cc } : {}),
		...(details.bcc != null ? { bcc: details.bcc } : {}),
	});
	if (result.error != null) {
		console.error("Failed to send email:", result);
		throw new AppError(500, ERROR_CODES.internal_server_error, "Failed to dispatch email");
	}
}

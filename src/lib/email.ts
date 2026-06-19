import { Resend } from "resend";
import { env } from "@/lib/env.js";
import { AppError, ERROR_CODES } from "./errors.js";

const resend = new Resend(env.RESEND_API_TOKEN);

export async function sendEmail(details: {
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	html: string;
}) {
	const result = await resend.emails.send({
		from: env.EMAIL_FROM,
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

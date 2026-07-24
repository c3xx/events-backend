import type { RequestHandler } from "express";

function getClientIp(req: Parameters<RequestHandler>[0]): string {
	const forwarded = req.headers["x-forwarded-for"];
	if (typeof forwarded === "string") {
		const first = forwarded.split(",")[0];
		if (first !== undefined) return first.trim();
	}
	return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function resolveKey(req: Parameters<RequestHandler>[0], prefix: string): string {
	if (req.user) {
		return `${prefix}:user:${req.user.id}`;
	}
	return `${prefix}:ip:${getClientIp(req)}`;
}

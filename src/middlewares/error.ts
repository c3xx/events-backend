import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, ERROR_CODES, UnreachableError } from "@/lib/errors.js";

export const errorHandler: ErrorRequestHandler = (error: Error, _req, res: ApiResponse, _next) => {
	if (error instanceof ZodError) {
		return res.status(422).json({
			success: false,
			code: ERROR_CODES.validation_error,
			message: "Validation failed",
			errors: error.issues.map((issue) => ({
				path: issue.path,
				message: issue.message,
				code: issue.code,
			})),
		});
	}

	if (error instanceof AppError) {
		//TODO: ConflictError details need to be sent in response.
		return res.status(error.statusCode).json({
			success: false,
			code: error.errorCode,
			message: error.message,
			errors: [],
		});
	}

	if (error instanceof UnreachableError) {
		console.error(
			"To have triggered this, that means something really horrible happened.",
			"Check into this and fix this and this has to be fixed application-wide.",
		);
		throw error;
	}

	console.error(error);

	return res.status(500).json({
		success: false,
		code: ERROR_CODES.internal_server_error,
		message: "Something went wrong",
		errors: [],
	});
};

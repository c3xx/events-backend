import { NeonDbError } from "@neondatabase/serverless";
import type { DrizzleQueryError } from "drizzle-orm";
import { CHECKS, type CustomCheckEntry, isCheckName, isTableName } from "@/db/checks.js";
import { snakeToNormalCase } from "./helpers.js";

export const ERROR_CODES = {
	validation_error: "VALIDATION_ERROR",
	invalid_credentials: "INVALID_CREDENTIALS",
	not_found: "NOT_FOUND",
	unauthorized: "UNAUTHORIZED",
	already_exists: "ALREADY_EXISTS",
	internal_server_error: "INTERNAL_SERVER_ERROR",
	forbidden: "FORBIDDEN",
	conflict: "CONFLICT",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class UnreachableError extends Error {
	constructor() {
		super("Unreachable");
	}
}

export class AppError extends Error {
	constructor(
		public statusCode: number,
		public errorCode: ErrorCode,
		message: string,
	) {
		super(message);
	}
}

export class NotFoundError extends AppError {
	constructor(message: string) {
		super(404, ERROR_CODES.not_found, message);
	}
}

export class ConflictError extends AppError {
	constructor(
		message: string,
		public details?: unknown, //TODO: define a type for details
	) {
		super(409, ERROR_CODES.conflict, message);
	}
}

export class ForbiddenError extends AppError {
	constructor(message: string) {
		super(403, ERROR_CODES.forbidden, message);
	}
}

export class UnauthorizedError extends AppError {
	constructor(message: string) {
		super(401, ERROR_CODES.unauthorized, message);
	}
}

export class ValidationError extends AppError {
	constructor(message: string) {
		super(422, ERROR_CODES.validation_error, message);
	}
}

export const POSTGRESQL_ERROR_CLASSES = {
	integrity_constraint_violation: "23",
	pl_pgsql_error: "P0",
};
export const POSTGRESQL_ERROR_CODES = {
	// Class P0 -- PL/pgSQL Error
	raise_exception: "P0001",

	// Class 23 -- Integrity Constraint Violation
	restrict_violation: "23001",
	not_null_violation: "23502",
	foreign_key_violation: "23503",
	unique_violation: "23505",
	check_violation: "23514",
} as const;

export function handleDbError(error: DrizzleQueryError): never {
	if (error.cause instanceof NeonDbError) {
		const neonError = error.cause;
		const pgErrorCode = neonError.code;
		const pgErrorClass = pgErrorCode?.slice(0, 2);

		if (pgErrorClass === POSTGRESQL_ERROR_CLASSES.integrity_constraint_violation) {
			switch (pgErrorCode) {
				case POSTGRESQL_ERROR_CODES.restrict_violation:
					// todo: no restrictions yet
					break;

				case POSTGRESQL_ERROR_CODES.not_null_violation:
					if (neonError.column == null)
						throw new Error("Expected column to be presented in NOT NULL violation");
					throw new ConflictError(`Value for ${snakeToNormalCase(neonError.column)} is missing`);

				case POSTGRESQL_ERROR_CODES.foreign_key_violation:
					throw new ConflictError(parseForeignKeyDetail(error.cause.detail));

				case POSTGRESQL_ERROR_CODES.unique_violation:
					throw new ConflictError(parseUniqueViolationDetail(error.cause.detail));

				case POSTGRESQL_ERROR_CODES.check_violation: {
					const constraint = neonError.constraint;
					if (constraint == null) throw new Error("Missing constraint name on check violation");

					const [scope, tableName, _sep, ...checkNameParts] = constraint.split("_");

					if (scope !== "chk" || tableName == null)
						throw new Error(`Unrecognized constraint format: ${constraint}`);

					if (!isTableName(tableName)) throw new Error(`Unknown table in constraint: ${tableName}`);

					const checkName = checkNameParts.join("_");

					if (!isCheckName(tableName, checkName))
						throw new Error(`Unknown check: ${checkName} on table: ${tableName}`);

					const check = CHECKS[tableName][checkName] as CustomCheckEntry;
					throw new ConflictError(check.error);
				}
				default:
					console.error(error, neonError);
					throw new ConflictError("Invalid input");
			}
		} else if (pgErrorClass === POSTGRESQL_ERROR_CLASSES.pl_pgsql_error) {
			switch (pgErrorCode) {
				case POSTGRESQL_ERROR_CODES.raise_exception:
					throw new ValidationError(neonError.message);
				default:
					console.error(error, neonError);
			}
		} else {
			console.error("Unsure about the error code/class.");
		}
	}

	console.error(error);
	throw new Error("Some other unhandled DrizzleQueryError!");
}

function parseUniqueViolationDetail(detail?: string): string {
	if (typeof detail !== "string") return "A record with this value already exists";
	const match = detail.match(/Key \((.+?)\)=\((.+?)\) already exists/);
	if (!match || typeof match[1] !== "string") return "A record with this value already exists";
	const field = match[1].replace(/_/g, " ");
	return `${snakeToNormalCase(field)} already exists`;
}

function parseForeignKeyDetail(detail?: string): string {
	if (typeof detail !== "string") return "Referenced record does not exist";
	const match = detail.match(/Key \((.+?)\)=\(.+?\) is not present in table "(.+?)"/);
	if (!match || typeof match[2] !== "string") return "Referenced record does not exist";
	const table = match[2].replace(/_/g, " ");
	return `Referenced ${snakeToNormalCase(table)} does not exist`;
}

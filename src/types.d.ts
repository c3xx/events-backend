import type * as express from "express";
import type { JWTPayload } from "jose";
import type { schema } from "./db/index.ts";
import type { PERMISSION } from "./lib/constants.ts";
import type { ErrorCode } from "./lib/errors.ts";

declare global {
	// schema types
	export type ManagedEntityType = (typeof schema.managedEntityTypeEnum.enumValues)[number];
	export type User = typeof schema.user.$inferSelect;
	export type UserType = (typeof schema.userTypeEnum.enumValues)[number];
	export type Role = typeof schema.role.$inferSelect;
	export type Permission = typeof schema.permission.$inferSelect;
	export type VenueAccessLevel = (typeof schema.venueAccessLevelEnum.enumValues)[number];
	export type EventStatus = (typeof schema.eventStatusEnum.enumValues)[number];
	export type EventOrganizerRole = (typeof schema.eventOrganizerRoleEnum.enumValues)[number];

	// system types
	export type PermissionScope = keyof typeof PERMISSION;
	export type PermissionCode =
		// | keyof typeof PERMISSION
		FlattenPermission<typeof PERMISSION>;

	export type IJWTPayload = JWTPayload & Pick<User, "id" | "type">;

	// frontend types:
	// types that are re-used in frontend.
	export namespace Frontend {
		export type AuthenticatedUser = Pick<User, "id" | "fullName" | "email" | "type"> & {
			permissions: PermissionCode[];
		};
	}

	// utility types
	export type MaybePromise<T> = T | Promise<T>;
	type FlattenPermission<T> = {
		[K in keyof T]: `${K & string}:${keyof T[K] & string}`;
	}[keyof T];

	export type ApiResponse<T = unknown> = express.Response<ApiError | ApiSuccess<T>>;
	export type ApiSuccess<T> = {
		success: true;
		data: T;
		// todo: meta and stuff
	};

	export type ApiError = {
		success: false;
		code: ErrorCode;
		message: string;
		errors: {
			path: PropertyKey[];
			message: string;
			code: string;
		}[];
	};

	export type ApiRequestHandler<T = unknown, P = unknown, B = unknown> = express.RequestHandler<
		P,
		ApiSuccess<T> | ApiError,
		B
	>;
}

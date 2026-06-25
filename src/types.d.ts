import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type * as express from "express";
import type { JWTPayload } from "jose";
import type { schema } from "@/db/index.ts";
import type { PERMISSION } from "@/lib/constants.ts";
import type { ErrorCode } from "@/lib/errors.ts";

declare global {
	// schema types
	export type ManagedEntityType = (typeof schema.managedEntityTypeEnum.enumValues)[number];
	export type User = typeof schema.user.$inferSelect;
	export type UserType = (typeof schema.userTypeEnum.enumValues)[number];
	export type Role = typeof schema.role.$inferSelect;
	export type Permission = typeof schema.permission.$inferSelect;
	export type VenueAccessLevel = (typeof schema.venueAccessLevelEnum.enumValues)[number];
	export type PasswordTokenType = (typeof schema.passwordTokenTypeEnum.enumValues)[number];

	// -- events
	export type EventStatus = (typeof schema.eventStatusEnum.enumValues)[number];
	export type EventOrganizerRole = (typeof schema.eventOrganizerRoleEnum.enumValues)[number];
	export type EventOrganizerInvitationRole =
		(typeof schema.eventOrganizerInvitationRoleEnum.enumValues)[number];
	export type EventOrganizerInvitationStatus =
		(typeof schema.eventOrganizerInvitationStatusEnum.enumValues)[number];

	export type EventTypeVenuePolicy = (typeof schema.eventTypeVenuePolicyEnum.enumValues)[number];
	export type EventTypeCollaborationPolicy =
		(typeof schema.eventTypeCollaborationPolicyEnum.enumValues)[number];

	// -- workflows
	export type WorkflowTargetGroupApprovalCriteria =
		(typeof schema.workflowTargetGroupApprovalCriteriaEnum.enumValues)[number];
	export type WorkflowInstanceStatus =
		(typeof schema.workflowInstanceStatusEnum.enumValues)[number];
	export type WorkflowInstanceStepStatus =
		(typeof schema.workflowInstanceStepStatusEnum.enumValues)[number];
	export type WorkflowInstanceStepAssignmentStatus =
		(typeof schema.workflowInstanceStepAssignmentStatusEnum.enumValues)[number];

	// system types

	export type WorkflowInstance = {
		id: number;
		createdAt: string;
		initialStepId: number | null;
		status: WorkflowInstanceStatus;
		completedAt: string | null;
		submitter: {
			id: number;
			fullName: string;
		};
		steps: {
			id: number;
			name: string;
			nextStepId: number | null;
			status: WorkflowInstanceStepStatus;
			completedAt: string | null;
			roles: {
				id: number;
				targetGroupApprovalCriteria: WorkflowTargetGroupApprovalCriteria;
				role: {
					id: number;
					name: string;
					scope: {
						type: ManagedEntityType;
						kindId: number;
						kindName: string;
					};
				};
				targetGroups: {
					id: number;
					scope: {
						type: ManagedEntityType;
						id: number;
						name: string;
					};
					assignments: {
						id: number;
						status: WorkflowInstanceStepAssignmentStatus;
						completedAt: string | null;
						remarks: string | null;
						userRole: {
							id: number;
							user: {
								id: number;
								fullName: string;
							};
						};
					}[];
				}[];
			}[];
		}[];
	};

	type AuthenticatedUser = Pick<User, "id" | "type">;

	export type PermissionScope = keyof typeof PERMISSION;
	export type PermissionCode =
		// | keyof typeof PERMISSION
		FlattenPermission<typeof PERMISSION>;

	export type IJWTPayload = JWTPayload & AuthenticatedUser;

	// frontend types:
	// types that are re-used in frontend.
	export namespace Frontend {
		export type AuthenticatedUser = {
			id: number;
			email: string;
			type: UserType;
			fullName: string;
			memberships: {
				id: number;
				type: ManagedEntityType;
				name: string;
				kind: {
					id: number;
					name: string;
				};
				roles: {
					id: number;
					name: string;
					permissions: string[];
				}[];
			}[];
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
		B,
		express.core.ParsedQs,
		never
	>;

	export type ScopedApiRequestHandler<
		S extends Record<string, unknown>,
		T = unknown,
		P = express.core.ParamsDictionary,
		B = unknown,
	> = express.RequestHandler<P, ApiSuccess<T> | ApiError, B, express.core.ParsedQs, S>;

	export type ApiRequestParamsHandler<T, S extends Record<string, unknown>> = (
		req: express.Request,
		res: express.Response<unknown, S>,
		next: express.NextFunction,
		value: T,
	) => void | Promise<void>;

	type DbTransaction = PgTransaction<
		NodePgQueryResultHKT,
		typeof schema,
		ExtractTablesWithRelations<typeof schema>
	>;
}

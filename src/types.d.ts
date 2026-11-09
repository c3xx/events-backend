import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgEnum, PgTransaction } from "drizzle-orm/pg-core";
import type * as express from "express";
import type { JWTPayload } from "jose";
import type { schema } from "@/db/index.ts";
import type { AUTHORITY_PERMISSIONS, USER_PERMISSIONS } from "@/lib/constants.ts";
import type { ErrorCode } from "@/lib/errors.ts";

type EValues<E extends PgEnum> = E["enumValues"][number];

declare global {
	// schema types
	export type ManagedEntityType = EValues<typeof schema.managedEntityTypeEnum>;
	export type User = typeof schema.user.$inferSelect;
	export type UserType = EValues<typeof schema.userTypeEnum>;
	export type Role = typeof schema.role.$inferSelect;
	export type Permission = typeof schema.permission.$inferSelect;
	export type PermissionType = EValues<typeof schema.permissionTypeEnum>;
	export type VenueAccessLevel = EValues<typeof schema.venueAccessLevelEnum>;
	export type FacilityProviderEntityType = EValues<typeof schema.facilityProviderEntityTypeEnum>;
	export type FacilityAssociationMethod = EValues<typeof schema.facilityAssociationMethodEnum>;
	export type FacilityOverlapPolicy = EValues<typeof schema.facilityOverlapPolicyEnum>;
	export type FacilityWorkflowParticipationPolicy = EValues<
		typeof schema.facilityWorkflowParticipationPolicyEnum
	>;
	export type PasswordTokenType = EValues<typeof schema.passwordTokenTypeEnum>;

	// -- events
	export type EventStatus = EValues<typeof schema.eventStatusEnum>;
	export type EventOrganizerRole = EValues<typeof schema.eventOrganizerRoleEnum>;
	export type EventOrganizerInvitationRole = EValues<
		typeof schema.eventOrganizerInvitationRoleEnum
	>;
	export type EventOrganizerInvitationStatus = EValues<
		typeof schema.eventOrganizerInvitationStatusEnum
	>;

	export type EventTypeVenuePolicy = EValues<typeof schema.eventTypeVenuePolicyEnum>;
	export type EventTypeCollaborationPolicy = EValues<
		typeof schema.eventTypeCollaborationPolicyEnum
	>;

	// -- workflows
	export type WorkflowTargetGroupApprovalCriteria = EValues<
		typeof schema.workflowTargetGroupApprovalCriteriaEnum
	>;
	export type WorkflowInstanceStatus = EValues<typeof schema.workflowInstanceStatusEnum>;
	export type WorkflowInstanceStepStatus = EValues<typeof schema.workflowInstanceStepStatusEnum>;
	export type WorkflowInstanceStepAssignmentStatus = EValues<
		typeof schema.workflowInstanceStepAssignmentStatusEnum
	>;

	// system types

	export type IdLike = number;

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

	export type UserPermissionCode = FlattenScopeObject<typeof USER_PERMISSIONS>;
	export type AuthorityPermissionCode = FlattenScopeObject<typeof AUTHORITY_PERMISSIONS>;

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
	type FlattenScopeObject<T> = {
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

	type ParsedDate = {
		date: number;
		month: number;
		year: number;
	};

	type CalculatedCalendarDayEvent = {
		id: number;
		title: string;
		status: "draft" | "pending" | "approved" | "cancelled" | "overridden";
		startsAt: string;
		endsAt: string;
		parentEvent: {
			id: number;
			title: string;
		} | null;
		hostOrganization: {
			id: number;
			name: string;
			type: {
				id: number;
				name: string;
			};
		};
		category: {
			id: number;
			name: string;
		};
		timings: {
			startsAt: string;
			endsAt: string;
		};
		venueAllotments: {
			id: number;
			venue: {
				id: number;
				name: string;
				type: {
					id: number;
					name: string;
				};
			};
			startsAt: string;
			endsAt: string;
			timings: {
				startsAt: string;
				endsAt: string;
			};
		}[];
		allVenueAllotments: {
			id: number;
			venue: {
				id: number;
				name: string;
			};
			startsAt: string;
			endsAt: string;
		}[];
	};
}

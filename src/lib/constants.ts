import { quickEnv } from "./helpers.js";

// === Application Level
export const IS_PROD = quickEnv("NODE_ENV") === "production";

export const INSTITUTION_NAME = "TKMCE";
export const INSTITUTION_DOMAIN = "tkmce.ac.in";

export const REFRESH_TOKEN_COOKIE_NAME = "refresh-token";

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

export const PASSWORD_TOKEN_EXPIRY = 15 * MINUTE;
export const PASSWORD_TOKEN_TYPES = ["SET_PASSWORD", "RESET_PASSWORD"] as const;

// === System Level
export const USER_TYPES = ["admin", "end_user"] as const;
export const MANAGED_ENTITY_TYPES = ["organization", "venue"] as const;
export const VENUE_ACCESS_LEVELS = ["public", "private"] as const;
export const EVENT_STATUS = [
	"draft",
	"awaiting_approval",
	"cancelled",
	"overridden",
	"completed",
] as const;
export const EVENT_ORGANIZER_ROLES = ["host", "co_host"] as const;
export const EVENT_ORGANIZER_INVITATION_STATUS = [
	"pending",
	"accepted",
	"rejected",
	"revoked",
	"expired",
] as const;
export const WORKFLOW_INSTANCE_STATUS = ["pending", "approved", "rejected", "revoked"] as const;
export const WORKFLOW_INSTANCE_STEP_STATUS = [
	"approved",
	"rejected",
	"skipped",
	"pending",
] as const;

// note: keep it sorted like the schema:
export const PERMISSION = {
	facility: {
		create: "Create facility",
	},
	organization: {
		create: "Create organizations",
		// get_members: "Get organization members", // todo: think hmmm
		add_member: "Add users to organizations", // todo: rename to manage_members
	},
	organization_type: {
		create: "Create organization types",
		modify_hierarchy: "Modify hierarchy of organization types",
		create_role: "Create roles under organization types",
	},
	role: {
		modify_permissions: "Modify permissions of roles",
	},
	user: {
		create: "Create users",
	},
	venue: {
		create: "Create venues",
		add_member: "Add users to organizations", // todo: rename to manage_members
		modify_facilities: "Modify facilities of venues",
	},
	venue_type: {
		create: "Create venue types",
		create_role: "Create roles under venue types",
	},
} as const;

export const PERMISSION_SCOPES = Object.keys(PERMISSION) as PermissionScope[];

export const FLATTENED_PERMISSIONS = Object.fromEntries(
	Object.entries(PERMISSION).flatMap(([scope, permissions]) => {
		return flattenPermissions(scope as PermissionScope, permissions);
	}),
) as Record<PermissionCode, string>;

function flattenPermissions<T extends keyof typeof PERMISSION>(
	scope: T,
	actions: (typeof PERMISSION)[T],
): [string, string][] {
	return Object.entries(actions).map(([action, description]) => [
		`${scope}:${action}`,
		description,
	]);
}

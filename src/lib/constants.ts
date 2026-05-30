import { quickEnv } from "./helpers.js";

// === Application Level
export const IS_PROD = quickEnv("NODE_ENV") === "production";

export const INSTITUTION_NAME = "TKMCE";
export const INSTITUTION_DOMAIN = "tkmce.ac.in";

export const REFRESH_TOKEN_COOKIE_NAME = "refresh-token";

// === System Level

// Users & organizations
export const USER_TYPES = ["admin", "end_user"] as const;
export const MANAGED_ENTITY_TYPES = ["organization", "venue"] as const;
export const VENUE_ACCESS_LEVELS = ["public", "private"] as const;

// Events
export const EVENT_TYPE_VENUE_POLICY = ["required", "optional", "forbidden"] as const;
export const EVENT_TYPE_COLLABORATION_POLICY = ["required", "optional", "forbidden"] as const;
export const EVENT_STATUS = ["draft", "pending", "approved", "cancelled", "overridden"] as const; // todo: an event should not get overridden by changing its status
export const EVENT_ORGANIZER_ROLES = ["host", "co_host"] as const;
export const EVENT_ORGANIZER_INVITATION_STATUS = [
	"pending",
	"accepted",
	"rejected",
	"revoked", // withdrawn
	"expired",
] as const;

// Workflows
export const WORKFLOW_INSTANCE_STATUS = [
	"active", // is running
	"completed", // completed successfully
	"denied", // denied somewhere, so stopped
	"aborted", // cancelled by the host
	"overridden", // overridden by higher authority
] as const;
export const WORKFLOW_INSTANCE_STEP_STATUS = [
	"pending", // yet to execute
	"active", // step is currently active & awaiting response
	"completed", // step completed!
	"skipped", // step was skipped because no such target groups can be created
	"blocked", // step cannot be skipped, because there are target groups, but at least one had no assignments
	"denied", // someone denied, so, the outcome is rejected.
	"overridden", // overridden by higher authority
] as const;
export const WORKFLOW_INSTANCE_STEP_ASSIGNMENT_STATUS = [
	"pending", // still waiting for response
	"approved", // approved!
	"denied", // denied
	"skipped", // if the criterias were met by someone else's approval, and yours got skipped
] as const;
export const WORKFLOW_TARGET_GROUP_APPROVAL_CRITERIA = ["all", "any"] as const;

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
	event_type: {
		create: "Create event types",
		delete: "Delete event types",
		modify_hierarchy: "Modify hierarchy of event types",
	},
	event_category: {
		create: "Create event categories",
	},
	event: {
		manage: "Manage events",
		view_own: "View own organization's events of all statuses",
		view_all_confirmed: "View all confirmed and upcoming events",
		view_all: "View all events of all statuses",
		view_all_non_draft: "View all events except drafts",
		allot_venue: "Allot and remove venues for events",
	},
	event_organizer: {
		add: "Add organizer to event",
		remove: "Remove organizer from event",
	},
	event_organizer_invitation: {
		send: "Send co_host invitation to another organization",
		respond: "Accept or reject a co_host invitation",
		view: "View organizer invitations for an event", //or can everyone view this?
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

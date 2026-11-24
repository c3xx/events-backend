import { env } from "@/lib/env.js";

// === Application Level
export const IS_PROD = env.NODE_ENV === "production";

export const INSTITUTION_NAME = "TKMCE";
export const INSTITUTION_DOMAIN = "tkmce.ac.in";

export const REFRESH_TOKEN_COOKIE_NAME = "refresh-token";

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

export const PASSWORD_TOKEN_EXPIRY = 15 * MINUTE;

// === System Level

// Users & organizations
export const USER_TYPES = ["admin", "end_user"] as const;
export const PASSWORD_TOKEN_TYPES = ["set_password", "reset_password"] as const;
export const MANAGED_ENTITY_TYPES = ["organization", "venue", "facility"] as const;
export const VENUE_ACCESS_LEVELS = ["public", "private"] as const;
export const PERMISSION_TYPES = ["user", "managed_entity_authority"] as const;
export const FACILITY_PROVIDER_ENTITY_TYPES = ["organization", "venue"] as const;
export const FACILITY_OVERLAP_POLICIES = ["shared", "exclusive"] as const;
export const FACILITY_WORKFLOW_PARTICIPATION_POLICIES = ["include", "exclude"] as const;
export const FACILITY_ASSOCIATION_METHODS = ["event", "venue_allotment"] as const;

// Events
export const EVENT_TYPE_VENUE_POLICY = ["required", "optional", "forbidden"] as const;
export const EVENT_TYPE_COLLABORATION_POLICY = ["required", "optional", "forbidden"] as const;
export const EVENT_STATUS = ["draft", "pending", "approved", "cancelled", "overridden"] as const; // todo: an event should not get overridden by changing its status
export const EVENT_ORGANIZER_ROLES = ["host", "co_host", "resource_provider"] as const; // note: keep in sync with EVENT_ORGANIZER_INVITABLE_ROLES
export const EVENT_ORGANIZER_INVITATION_ROLES = ["co_host"] as const; // note: keep in sync with EVENT_ORGANIZER_ROLES
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

// todo: consider splitting system vs. managed entity scoped.
// note: keep it sorted like the schema:
export const USER_PERMISSIONS = {
	facility: {
		create: { description: "Create facility" },
	},
	organization: {
		create: { description: "Create organizations" },
		// get_members: "Get organization members", // todo: think hmmm
		add_member: { description: "Add users to organizations" }, // todo: rename to manage_members
	},
	organization_type: {
		create: { description: "Create organization types" },
		modify_hierarchy: { description: "Modify hierarchy of organization types" },
		create_role: { description: "Create roles under organization types" },
	},
	role: {
		modify_permissions: { description: "Modify permissions of roles" },
	},
	user: {
		create: { description: "Create users" },
	},
	venue: {
		create: { description: "Create venues" },
		add_member: { description: "Add users to venues" }, // todo: rename to manage_members
		modify_facilities: { description: "Modify facilities of venues" },
	},
	venue_type: {
		create: { description: "Create venue types" },
		create_role: { description: "Create roles under venue types" },
	},
	event_type: {
		create: { description: "Create event types" },
		delete: { description: "Delete event types" },
		modify_hierarchy: { description: "Modify hierarchy of event types" },
	},
	event_category: {
		create: { description: "Create event categories" },
	},
	event: {
		manage: { description: "Manage events" }, // todo: split into, create, modify, cancel
		view_own: { description: "View own organization's events of all statuses" },
	},
	event_organizer_invitation: {
		respond: { description: "Accept or reject an organizer invitation" },
	},
	authority_organization: {
		view_organization_events: {
			description:
				"View events of a target organization, on which this organization has authority on",
		},
		cancel_organization_events: {
			description:
				"Cancel events of a target organization, on which this organization has authority on",
		},
	},
} satisfies PermissionSet<SimplePermissionSetOptions>;

export const AUTHORITY_PERMISSIONS = {
	event: {
		view: {
			subject: "organization",
			holder: "organization",
			description: "View events hosted by the organization who is subjected to the authority",
		},
		cancel: {
			subject: "organization",
			holder: "organization",
			description: "Cancel events hosted by the organization who is subjected to the authority",
		},
	},
	venue: {
		request: {
			subject: "organization",
			holder: "venue",
			description: "Request the venue which is subjected to the authority of the organization",
		},
	},
} satisfies PermissionSet<AuthorityPermissionSetOptions>;

export const FLATTENED_USER_PERMISSIONS: FlattenedPermissionSet<
	UserPermissionCode,
	SimplePermissionSetOptions
> = flattenPermissionSet(USER_PERMISSIONS);

export const FLATTENED_AUTHORITY_PERMISSIONS: FlattenedPermissionSet<
	AuthorityPermissionCode,
	AuthorityPermissionSetOptions
> = flattenPermissionSet(AUTHORITY_PERMISSIONS);

function flattenPermissionSet<
	PC extends string,
	O extends { description: string },
	T extends PermissionSet<O>,
>(permissionSet: T): Record<PC, O> {
	return Object.fromEntries(
		Object.entries(permissionSet).flatMap(([scope, actions]) =>
			Object.entries(actions).map(([action, description]) => [`${scope}:${action}`, description]),
		),
	) as Record<PC, O>;
}

import { z } from "zod";
import type { db } from "@/db/index.js";
import { MANAGED_ENTITY_TYPES, USER_TYPES, VENUE_ACCESS_LEVELS } from "@/lib/constants.js";

export const organizationTypeConfigSchema = z.object({
	name: z.string(),
	allowed_parents: z.array(z.string()).optional(),
});

export const organizationConfigSchema = z.object({
	name: z.string(),
	type: z.string(),
	parent: z.string().optional(),
});

export const venueConfigSchema = z
	.object({
		name: z.string(),
		type: z.string(),
		organization: z.string().optional(),
		access_level: z.enum(VENUE_ACCESS_LEVELS).optional(),
		is_available: z.boolean(),
		unavailability_reason: z.string().optional(),
		max_capacity: z.number().int().positive(),
		facilities: z.array(z.string()).optional(),
	})
	.refine(
		(data) => {
			if (
				!data.is_available &&
				(!data.unavailability_reason || data.unavailability_reason.trim() === "")
			) {
				return false;
			}
			if (
				data.is_available &&
				data.unavailability_reason &&
				data.unavailability_reason.trim() !== ""
			) {
				return false;
			}
			return true;
		},
		{
			message:
				"unavailability_reason is required when is_available is false, and must be empty/omitted when is_available is true",
			path: ["unavailability_reason"],
		},
	);

export const roleConfigSchema = z.object({
	name: z.string(),
	managed_entity_type: z.enum(MANAGED_ENTITY_TYPES),
	type_ref: z.string(),
	permissions: z.array(z.string()).optional(),
});

export const userRoleAssignmentConfigSchema = z.object({
	role: z.string(),
	managed_entity_type: z.enum(MANAGED_ENTITY_TYPES),
	entity_name: z.string(),
});

export const userConfigSchema = z.object({
	full_name: z.string(),
	email: z.string().email(),
	type: z.enum(USER_TYPES),
	roles: z.array(userRoleAssignmentConfigSchema).optional(),
});

export const nameObjectSchema = z
	.union([z.string(), z.object({ name: z.string() })])
	.transform((val) => (typeof val === "string" ? val : val.name));

export const seedConfigSchema = z.object({
	organization_types: z.array(organizationTypeConfigSchema).default([]),
	organizations: z.array(organizationConfigSchema).default([]),
	venue_types: z.array(nameObjectSchema).default([]),
	facilities: z.array(nameObjectSchema).default([]),
	venues: z.array(venueConfigSchema).default([]),
	roles: z.array(roleConfigSchema).default([]),
	users: z.array(userConfigSchema).default([]),
});

export type SeedConfig = z.infer<typeof seedConfigSchema>;
export type TxClient = typeof db | DbTransaction;

export interface ResolvedIds {
	orgTypes: Map<string, number>;
	orgs: Map<string, number>;
	venueTypes: Map<string, number>;
	facilities: Map<string, number>;
	venues: Map<string, number>;
	roles: Map<string, number>;
	users: Map<string, number>;
}

export interface PlannedUpdate {
	section: string;
	label: string;
	restore: boolean;
	changes: Array<{ field: string; from: unknown; to: unknown }>;
	apply: (tx: TxClient, resolvedIds: ResolvedIds) => Promise<void>;
}

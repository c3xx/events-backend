import { z } from "zod";
import { INSTITUTION_DOMAIN } from "@/lib/constants.js";

const nameObjectSchema = z
	.union([z.string(), z.object({ name: z.string() })])
	.transform((val) => (typeof val === "string" ? val : val.name));

export const organizationTypeSchema = z.object({
	name: z.string(),
	allowed_parents: z.array(z.string()).optional(),
});

export const organizationSchema = z.object({
	name: z.string(),
	type: z.string(),
	parent: z.string().optional(),
});

export const venueSchema = z
	.object({
		name: z.string(),
		type: z.string(),
		organization: z.string().optional(),
		access_level: z.enum(["public", "private"]).optional().default("public"),
		is_available: z.boolean(),
		unavailability_reason: z.string().optional(),
		max_capacity: z.number(),
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
			return true;
		},
		{
			message: "unavailability_reason is required and cannot be empty when is_available is false",
			path: ["unavailability_reason"],
		},
	);

export const roleSchema = z.object({
	name: z.string(),
	managed_entity_type: z.enum(["organization", "venue"]),
	type_ref: z.string(),
	permissions: z.array(z.string()).optional(),
});

const userRoleSchema = z.object({
	role: z.string(),
	managed_entity_type: z.enum(["organization", "venue"]),
	entity_name: z.string(),
});

export const userSchema = z.object({
	full_name: z.string(),
	email: z
		.string()
		.email()
		.refine((email) => email.endsWith(`@${INSTITUTION_DOMAIN}`), {
			message: `Email must belong to the institution domain: @${INSTITUTION_DOMAIN}`,
		}),
	type: z.enum(["admin", "end_user"]),
	roles: z.array(userRoleSchema).optional(),
});

export const seedConfigSchema = z.object({
	organization_types: z.array(organizationTypeSchema).optional(),
	organizations: z.array(organizationSchema).optional(),
	venue_types: z.array(nameObjectSchema).optional(),
	facilities: z.array(nameObjectSchema).optional(),
	venues: z.array(venueSchema).optional(),
	roles: z.array(roleSchema).optional(),
	users: z.array(userSchema).optional(),
});

export type SeedConfig = z.infer<typeof seedConfigSchema>;

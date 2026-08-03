import z from "zod";

const envSchema = z.object({
	// secrets
	DATABASE_URL: z.url(),
	ADMIN_LOGIN_EMAIL: z.email(),
	ADMIN_LOGIN_PASSWORD: z.string(),
	RESEND_API_TOKEN: z.string(),
	EMAIL_FROM: z.coerce
		.string()
		.trim()
		.refine(
			(value) => {
				const lastIndex = value.lastIndexOf("<");
				if (lastIndex === -1) return false;
				const name = z.string().trim().nonempty().safeParse(value.slice(0, lastIndex));
				const email = z
					.email()
					.trim()
					.nonempty()
					.safeParse(value.slice(lastIndex + 1, -1));
				return name.success && email.success;
			},
			{ error: "Invalid FROM email format" },
		),
	JWT_ACCESS_SECRET: z.string(),
	JWT_REFRESH_SECRET: z.string(),

	// application configuration
	ARGON2_TIME_COST: z.coerce
		.number()
		.int()
		.positive()
		.max(2 ** 32 - 1),

	// running setup
	FRONTEND_ORIGIN: z.url(),
	NODE_ENV: z.enum(["development", "production", "test"]),
	PORT: z.coerce.number().int().positive().max(65_535).optional(),
	HOSTNAME: z.xor([z.ipv4(), z.string()]).optional(),
	QUIET: z.transform((x) => (typeof x === "string" ? Boolean(x) : false)).optional(),
	UPSTASH_REDIS_REST_URL: z.url(),
	UPSTASH_REDIS_REST_TOKEN: z.string(),
	// debug stuff
	DEBUG_BYPASS_AUTH: z.coerce.boolean().optional(),
	DEBUG_BYPASS_PERMISSIONS: z.coerce.boolean().optional(),
});

export const env = envSchema.parse(process.env);

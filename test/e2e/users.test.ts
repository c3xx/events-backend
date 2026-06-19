import { and, eq, isNull } from "drizzle-orm";
import request from "supertest";
import { assert, describe, expect, it, vi } from "vitest";
import app from "@/app.js";
import { db, schema } from "@/db/index.js";
import { INSTITUTION_DOMAIN, REFRESH_TOKEN_COOKIE_NAME } from "@/lib/constants.js";
import { env } from "@/lib/env.js";
import { ERROR_CODES } from "@/lib/errors.js";

const prefixPlugin = (prefix: string) => {
	return (req: request.Request) => {
		const url = new URL(req.url);
		url.pathname = `${prefix}${url.pathname}`;
		req.url = url.href;
		return req;
	};
};

const adminAgent = request.agent(app, {}).use(prefixPlugin("")); // todo: to be used later with /api/v1

const bearer = (token: string) => `Bearer ${token}`;

vi.mock("@/lib/email.js", async (importOriginal) => ({
	...(await importOriginal()),
	sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/helpers.js", async (importOriginal) => ({
	...(await importOriginal()),
	hexSha256: vi.fn((a) => a),
}));

describe("user authentication", () => {
	let adminAccessToken = "";
	let adminSetCookieHeader: string[] = [];

	it("should error when accessing protected  routes w/o logging in", async () => {
		const response = await adminAgent.get("/me");

		expect(response.status).toBe(401);
		expect(response.body.success).toBe(false);
		expect(response.body.code).toBe(ERROR_CODES.unauthorized);
	});

	it("should not allow invalid credentials", async () => {
		let response = await adminAgent.post("/auth/login").send({
			email: env.ADMIN_LOGIN_EMAIL,
			password: "1234",
		});

		expect(response.status).toBe(400);
		expect(response.body.message).toBe("Invalid credentials");

		response = await adminAgent.post("/auth/login").send({
			email: `somerandomemail@${INSTITUTION_DOMAIN}`,
			password: "1234",
		});

		expect(response.status).toBe(400);
		expect(response.body.message).toBe("Invalid credentials");
	});

	it("should not allow using non-institution emails", async () => {
		const response = await adminAgent.post("/auth/login").send({
			email: `somerandomemail@random.com`,
			password: "1234",
		});

		expect(response.status).toBe(422);
		expect(response.body).toStrictEqual({
			success: false,
			code: "VALIDATION_ERROR",
			message: "Validation failed",
			errors: [
				{
					path: ["email"],
					message: "Expected institution domain email",
					code: "invalid_format",
				},
			],
		});
	});

	it("should allow logging in with admin credentials", async () => {
		const response = await adminAgent.post("/auth/login").send({
			email: env.ADMIN_LOGIN_EMAIL,
			password: env.ADMIN_LOGIN_PASSWORD,
		});

		expect(response.status).toBe(200);
		expect(response.body.data.accessToken).toBeDefined();
		adminAccessToken = response.body.data.accessToken;

		adminSetCookieHeader = response.header["set-cookie"] as unknown as string[];
		expect(adminSetCookieHeader).toBeDefined();
		expect(Array.isArray(adminSetCookieHeader)).toBe(true);

		expect(adminSetCookieHeader.some((c) => c.includes(`${REFRESH_TOKEN_COOKIE_NAME}=`))).toBe(
			true,
		);
	});

	it("should allow accessing protected routes (with access token)", async () => {
		const response = await adminAgent.get("/me").set("Authorization", bearer(adminAccessToken));

		expect(response.status).toBe(200);
		expect(response.body.data.email).toBe(env.ADMIN_LOGIN_EMAIL);
	});

	it("should error if no access token is provided", async () => {
		const response = await adminAgent.get("/me");

		expect(response.status).toBe(401);
	});

	it("should allow generating new tokens using refresh token", async () => {
		const response = await adminAgent
			.post("/auth/refresh")
			.set("Cookie", adminSetCookieHeader.join(";")); // note: some weird shit that i dont even understand fully

		expect(response.status).toBe(200);
		expect(response.body.data.accessToken).toBeDefined();
		adminAccessToken = response.body.data.accessToken;

		adminSetCookieHeader = response.header["set-cookie"] as unknown as string[];
		expect(adminSetCookieHeader).toBeDefined();
		expect(Array.isArray(adminSetCookieHeader)).toBe(true);

		expect(adminSetCookieHeader.some((c) => c.includes(`${REFRESH_TOKEN_COOKIE_NAME}=`))).toBe(
			true,
		);
	});

	// todo: figure out /auth/logout
});

describe("end user creation & passwords", () => {
	const END_USER_EMAIL = "tu1@tkmce.ac.in";
	const END_USER_PASSWORD = "c3xxiscool";

	let adminAccessToken = "";

	it("should let admin login", async () => {
		const res = await adminAgent
			.post("/auth/login")
			.send({ email: env.ADMIN_LOGIN_EMAIL, password: env.ADMIN_LOGIN_PASSWORD });

		expect(res.status).toBe(200);

		adminAccessToken = res.body.data.accessToken;
	});

	it("admin should be able to create end user", async () => {
		const response = await adminAgent
			.post("/users")
			.set("Authorization", bearer(adminAccessToken))
			.send({ email: END_USER_EMAIL, fullName: "Test User 1" });

		expect(response.status).toBe(200);
		expect(response.body.data.id).toBeTypeOf("number");
	});

	const userAgent = request.agent(app);

	it("end user w/o passwd should NOT be able to login", async () => {
		const response = await userAgent
			.post("/auth/login")
			.send({ email: END_USER_EMAIL, password: END_USER_PASSWORD });

		expect(response.status).toBe(403);
		expect(response.body.message).toBe(
			"Account password not set. Please complete your account password setup first.", // todo: rethink this error message
		);
	});

	async function findToken(email: string, type: PasswordTokenType) {
		const tokens = await db
			.select({ tokenHash: schema.userPasswordToken.tokenHash })
			.from(schema.userPasswordToken)
			.innerJoin(schema.user, eq(schema.user.id, schema.userPasswordToken.userId))
			.where(
				and(
					eq(schema.user.email, email),
					isNull(schema.userPasswordToken.usedAt),
					eq(schema.userPasswordToken.type, type),
				),
			);

		expect(tokens.length).toBeOneOf([0, 1]);
		return tokens[0];
	}

	it("end user w/o passwd should NOT be able to request reset passwd token", async () => {
		const response = await userAgent
			.post("/auth/request-password-token")
			.send({ email: END_USER_EMAIL, type: "reset_password" });

		expect(response.status).toBe(200);

		const token = await findToken(END_USER_EMAIL, "reset_password");
		expect(token).toBeUndefined();
	});

	it("end user w/o passwd should be able to request set passwd token", async () => {
		const response = await userAgent
			.post("/auth/request-password-token")
			.send({ email: END_USER_EMAIL, type: "set_password" });

		expect(response.status).toBe(200);

		const token = await findToken(END_USER_EMAIL, "set_password");
		assert(token != null);
		expect(token.tokenHash).toBeTypeOf("string");
	});

	it("end user w/o passwd should be able to set passwd", async () => {
		const token = await findToken(END_USER_EMAIL, "set_password");
		assert(token != null);

		const response = await userAgent.post("/auth/reset-password").send({
			token: token.tokenHash,
			password: END_USER_PASSWORD,
		});

		expect(response.status).toBe(200);
	});

	let accessToken = "";

	it("end user should be able to login after setting passwd", async () => {
		const token = await findToken(END_USER_EMAIL, "set_password");
		assert(token == null);

		let response = await userAgent.post("/auth/login").send({
			email: END_USER_EMAIL,
			password: END_USER_PASSWORD,
		});

		expect(response.status).toBe(200);
		accessToken = response.body.data.accessToken;

		response = await userAgent.get("/me").set("Authorization", bearer(accessToken));
		expect(response.status).toBe(200);
	});

	it("end user with passwd should NOT be able to request set passwd token", async () => {
		const response = await userAgent
			.post("/auth/request-password-token")
			.send({ email: END_USER_EMAIL, type: "set_password" });

		expect(response.status).toBe(200);

		const token = await findToken(END_USER_EMAIL, "set_password");
		assert(token == null);
	});

	it("end user with passwd should be able to request reset passwd token", async () => {
		const response = await userAgent
			.post("/auth/request-password-token")
			.send({ email: END_USER_EMAIL, type: "reset_password" });

		expect(response.status).toBe(200);

		const token = await findToken(END_USER_EMAIL, "reset_password");
		assert(token != null);
		expect(token.tokenHash).toBeTypeOf("string");
	});

	it("end user with passwd should be able to reset passwd", async () => {
		const token = await findToken(END_USER_EMAIL, "reset_password");
		assert(token != null);

		const response = await userAgent.post("/auth/reset-password").send({
			token: token.tokenHash,
			password: END_USER_PASSWORD, // todo: same password?
		});

		expect(response.status).toBe(200);
	});
});

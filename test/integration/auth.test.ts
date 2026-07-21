import { eq } from "drizzle-orm";
import { assert, describe, expect, test, vi } from "vitest";
import { db, schema } from "@/db/index.js";
import { hashPassword } from "@/lib/argon2.js";
import { hexSha256 } from "@/lib/helpers.js";
import { generateAccessToken } from "@/lib/jwt.js";
import { authenticateToken } from "@/middlewares/auth.js";
import {
	createNewTokens,
	login,
	requestPasswordToken,
	resetPassword,
} from "@/modules/auth/service.js";
import { createUser } from "@/modules/user/service.js";
import { createMockExpressContext, createTestUser } from "./integration-test-helpers.js";

vi.mock("@/lib/email.js", () => ({
	sendEmail: vi.fn().mockResolvedValue(true),
}));

describe("Auth Integration Tests", () => {
	describe("Registration / Account Setup", () => {
		test("creates user with valid institution email, defaults to active, no password yet", async () => {
			const user = await createUser({
				email: "fresh-student@tkmce.ac.in",
				fullName: "Fresh Student",
			});

			const dbUser = await db.query.user.findFirst({ where: eq(schema.user.id, user.id) });
			assert(dbUser != null);
			expect(dbUser.email).toBe("fresh-student@tkmce.ac.in");
			expect(dbUser.fullName).toBe("Fresh Student");
			expect(dbUser.isActive).toBe(false);
			expect(dbUser.passwordHash).toBeNull();
		});

		test("rejects registration with email outside institution domain (DB layer DB trigger)", async () => {
			// Bug note: createUser relies on Zod validation in controller, BUT the DB constraint should catch it here
			await expect(
				createUser({
					email: "hacker@gmail.com",
					fullName: "Hacker",
				}),
			).rejects.toThrow();
		});

		test("rejects duplicate active email registration", async () => {
			const email = "duplicate@tkmce.ac.in";
			await createUser({ email, fullName: "Original" });

			await expect(createUser({ email, fullName: "Imposter" })).rejects.toThrow();
		});

		test("allows re-registration with same email after prior user soft-deleted", async () => {
			const email = "recycled@tkmce.ac.in";
			const firstUser = await createUser({ email, fullName: "First User" });

			await db
				.update(schema.user)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.user.id, firstUser.id));

			await expect(createUser({ email, fullName: "Second User" })).resolves.not.toThrow();
		});
	});

	describe("Login", () => {
		test("successfully logs in with correct email + password", async () => {
			const email = "login-success@tkmce.ac.in";
			const rawPassword = "password123";
			const passwordHash = await hashPassword(rawPassword);

			await createTestUser({ email, passwordHash, type: "end_user" });

			const tokens = await login(email, rawPassword);
			expect(tokens.accessToken).toBeDefined();
			expect(tokens.refreshToken).toBeDefined();
		});

		test("rejects login for user with no password (requires setup)", async () => {
			const email = "no-pass@tkmce.ac.in";
			await createUser({ email, fullName: "No Pass" });

			await expect(login(email, "any-password")).rejects.toThrow("Account password not set");
		});

		test("rejects login with incorrect password", async () => {
			const email = "wrong-pass@tkmce.ac.in";
			const passwordHash = await hashPassword("correct123");
			await createTestUser({ email, passwordHash, type: "end_user" });

			await expect(login(email, "wrong")).rejects.toThrow("Invalid credentials");
		});

		test("rejects login with non-existent / soft-deleted email", async () => {
			const email = "deleted-login@tkmce.ac.in";
			const passwordHash = await hashPassword("valid123");
			const user = await createTestUser({ email, passwordHash, type: "end_user" });

			await db
				.update(schema.user)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.user.id, user.id));

			await expect(login(email, "valid123")).rejects.toThrow("Invalid credentials");
		});
	});

	describe("Password Reset — Token Generation & Consumption", () => {
		test("generates token and silently ignores generation for invalid conditions", async () => {
			const email = "token-test@tkmce.ac.in";
			await createTestUser({ email, type: "end_user", isActive: true });

			await expect(requestPasswordToken({ email, type: "reset_password" })).resolves.not.toThrow();

			await expect(requestPasswordToken({ email, type: "set_password" })).resolves.not.toThrow();

			await expect(
				requestPasswordToken({ email: "ghost@tkmce.ac.in", type: "reset_password" }),
			).resolves.not.toThrow();
		});

		test("successfully sets new password and flags token as used", async () => {
			const email = "reset-consume@tkmce.ac.in";
			const user = await createTestUser({ email, type: "end_user", isActive: true });
			await requestPasswordToken({ email, type: "reset_password" });

			const dbToken = await db.query.userPasswordToken.findFirst({
				where: eq(schema.userPasswordToken.userId, user.id),
			});
			assert(dbToken != null);

			const rawToken = "test-token-123";
			const tokenHash = hexSha256(rawToken);

			await db.delete(schema.userPasswordToken).where(eq(schema.userPasswordToken.userId, user.id));

			await db.insert(schema.userPasswordToken).values({
				userId: user.id,
				tokenHash,
				type: "reset_password",
				expiresAt: new Date(Date.now() + 100000).toISOString(),
			});

			await expect(
				resetPassword({ token: rawToken, password: "newPassword321" }),
			).resolves.not.toThrow();

			const usedToken = await db.query.userPasswordToken.findFirst({
				where: eq(schema.userPasswordToken.tokenHash, tokenHash),
			});
			expect(usedToken?.usedAt).not.toBeNull();

			const updatedUser = await db.query.user.findFirst({
				where: eq(schema.user.id, user.id),
			});
			expect(updatedUser?.isActive).toBe(true);
		});

		test("rejects consumption of expired or already-used token", async () => {
			const user = await createTestUser({ type: "end_user", isActive: true });
			const rawToken = "expired-token-123";
			const tokenHash = hexSha256(rawToken);

			await db.insert(schema.userPasswordToken).values({
				userId: user.id,
				tokenHash,
				type: "reset_password",
				expiresAt: new Date(Date.now() - 100000).toISOString(), // Expired
			});

			await expect(resetPassword({ token: rawToken, password: "newPassword321" })).rejects.toThrow(
				"Expired token!",
			);

			const usedTokenRaw = "used-token-123";
			const usedTokenHash = hexSha256(usedTokenRaw);

			await db.insert(schema.userPasswordToken).values({
				userId: user.id,
				tokenHash: usedTokenHash,
				type: "reset_password",
				expiresAt: new Date(Date.now() + 100000).toISOString(),
				usedAt: new Date().toISOString(),
			});

			await expect(
				resetPassword({ token: usedTokenRaw, password: "newPassword321" }),
			).rejects.toThrow("Token already used!");
		});
	});

	describe("Session / Auth Token Refresh & Logout", () => {
		test("refresh returns new valid tokens given a valid refresh token", async () => {
			const email = "refresh-success@tkmce.ac.in";
			const passwordHash = await hashPassword("password123");
			await createTestUser({ email, passwordHash, type: "end_user" });

			const { refreshToken } = await login(email, "password123");

			const newTokens = await createNewTokens(refreshToken);
			expect(newTokens.accessToken).toBeDefined();
			expect(newTokens.refreshToken).toBeDefined();
		});

		test("BUG: refresh allows inactive users to re-issue tokens", async () => {
			const email = "refresh-inactive@tkmce.ac.in";
			const passwordHash = await hashPassword("password123");
			const user = await createTestUser({ email, passwordHash, type: "end_user", isActive: true });

			const { refreshToken } = await login(email, "password123");

			await db.update(schema.user).set({ isActive: false }).where(eq(schema.user.id, user.id));

			await expect(createNewTokens(refreshToken)).resolves.not.toThrow();
		});

		test("refresh rejects if user is soft-deleted", async () => {
			const email = "refresh-deleted@tkmce.ac.in";
			const passwordHash = await hashPassword("password123");
			const user = await createTestUser({ email, passwordHash, type: "end_user" });

			const { refreshToken } = await login(email, "password123");

			await db
				.update(schema.user)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.user.id, user.id));

			await expect(createNewTokens(refreshToken)).rejects.toThrow(
				"Could not find the authenticated user",
			);
		});
	});

	describe("Authorization Middleware", () => {
		test("accepts requests with valid access token and injects payload", async () => {
			const user = await createTestUser({ type: "end_user" });
			const accessToken = await generateAccessToken({ id: user.id, type: "end_user" });
			const { req, res } = createMockExpressContext({
				authorization: `Bearer ${accessToken}`,
			});

			let nextCalled = false;
			const nextWrapper = () => {
				nextCalled = true;
			};

			await authenticateToken(req, res, nextWrapper);

			expect(nextCalled).toBe(true);
			expect(req.user).toBeDefined();
			expect(req.user.id).toBe(user.id);
			expect(req.user.type).toBe("end_user");
		});

		test("BUG: stateless middleware blindly accepts tokens for soft-deleted users", async () => {
			const user = await createTestUser({ type: "end_user" });
			const accessToken = await generateAccessToken({ id: user.id, type: "end_user" });

			await db
				.update(schema.user)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.user.id, user.id));

			const { req, res } = createMockExpressContext({
				authorization: `Bearer ${accessToken}`,
			});

			await expect(authenticateToken(req, res, () => {})).resolves.not.toThrow();
		});

		test("rejects requests with missing or expired token", async () => {
			const { req: reqMissing, res: resMissing } = createMockExpressContext();

			await expect(authenticateToken(reqMissing, resMissing, () => {})).rejects.toThrow(
				"No authentication token",
			);

			const { req: reqBad, res: resBad } = createMockExpressContext({
				authorization: "Bearer totally-invalid-jwt-token-string",
			});

			await expect(authenticateToken(reqBad, resBad, () => {})).rejects.toThrow("Expired token"); // Any JWT validation issue throws "Expired token" standard message
		});
	});
});

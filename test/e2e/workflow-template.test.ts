import { nanoid } from "nanoid";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "@/app.js";
import { db, schema } from "@/db/index.js";
import { generateAccessToken } from "@/lib/jwt.js";

const bearer = (token: string) => `Bearer ${token}`;

describe("Workflow Template Authoring E2E", () => {
	let adminToken: string;
	let fallbackRoleId: number;

	beforeAll(async () => {
		// Find existing basic roles to assign to steps
		const [orgType] = await db
			.insert(schema.organizationType)
			.values({ name: `org-type-${nanoid()}` })
			.returning();
		const [org] = await db
			.insert(schema.organization)
			.values({ name: `org-${nanoid()}`, organizationTypeId: orgType!.id })
			.returning();

		const [role] = await db
			.insert(schema.role)
			.values({
				name: `test-role-${nanoid()}`,
				managedEntityType: "organization",
				typeRefId: org!.id,
			})
			.returning();
		fallbackRoleId = role!.id;

		const [admin] = await db
			.insert(schema.user)
			.values({
				email: `admin-${nanoid()}@tkmce.ac.in`,
				fullName: "Admin Template Author",
				type: "admin",
				isActive: true,
			})
			.returning();

		adminToken = await generateAccessToken({ id: admin!.id, type: "admin" });
	});

	it("should allow admin to completely create a workflow template chain via API", async () => {
		// 1. Create Template
		const templateRes = await request(app)
			.post("/workflow-templates")
			.set("Authorization", bearer(adminToken))
			.send({ name: `Annual Symposium Workflow ${nanoid()}` });

		expect(templateRes.status).toBe(200);
		const templateId = templateRes.body.data.id;
		expect(templateId).toBeDefined();

		// 2. Add Step 1 (Coordinator)
		const step1Res = await request(app)
			.post(`/workflow-templates/${templateId}/steps`)
			.set("Authorization", bearer(adminToken))
			.send({
				name: "Coordinator Approval Step",
			});
		expect(step1Res.status).toBe(200);
		const step1Id = step1Res.body.data.id;
		expect(step1Id).toBeDefined();

		// 3. Assign Role to Step 1
		const assignRoleRes = await request(app)
			.post(`/workflow-templates/${templateId}/steps/${step1Id}/roles`)
			.set("Authorization", bearer(adminToken))
			.send({
				roleId: fallbackRoleId,
				targetGroupApprovalCriteria: "any",
			});
		expect(assignRoleRes.status).toBe(200);

		// 4. Verify Final State via GET
		const verifyRolesRes = await request(app)
			.get(`/workflow-templates/${templateId}/steps/${step1Id}/roles`)
			.set("Authorization", bearer(adminToken));

		expect(verifyRolesRes.status).toBe(200);
		expect(verifyRolesRes.body.data.length).toBe(1);
		expect(verifyRolesRes.body.data[0].role.id).toBe(fallbackRoleId);
	});

	it("should prevent non-admin from creating workflow templates", async () => {
		const [endUser] = await db
			.insert(schema.user)
			.values({
				email: `user-fail-${nanoid()}@tkmce.ac.in`,
				fullName: "Normal Submitter",
				type: "end_user",
				isActive: true,
			})
			.returning();

		const endUserToken = await generateAccessToken({ id: endUser!.id, type: "end_user" });

		const templateRes = await request(app)
			.post("/workflow-templates")
			.set("Authorization", bearer(endUserToken))
			.send({ name: `Hacked Symposium Workflow ${nanoid()}` });

		expect(templateRes.status).toBe(403);
	});
});

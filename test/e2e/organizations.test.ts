import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";
import app from "@/app.js";
import { generateAccessToken } from "@/lib/jwt.js";
import { db, schema } from "@/db/index.js";
import { nanoid } from "nanoid";

const bearer = (token: string) => `Bearer ${token}`;

describe("Organizations E2E - Admin Operations and Global Visibility", () => {
    let adminToken: string;
    let endUserToken: string;

    let systemOrgTypeId: number;
    let baselineRoleId: number;
    let targetUserId: number;
    
    let createdOrgId: number;

    beforeAll(async () => {
        // --- Setup Roles and Permissions ---
        const [orgType] = await db.insert(schema.organizationType).values({ name: `org-type-${nanoid()}` }).returning();
        systemOrgTypeId = orgType!.id;

        // Create a role that acts as an umbrella for testing
        const [role] = await db.insert(schema.role).values({
            name: `Staff-${nanoid()}`,
            managedEntityType: "organization",
            typeRefId: orgType!.id
        }).returning();
        baselineRoleId = role!.id;

        // --- Setup Users ---
        const [adminUser] = await db.insert(schema.user).values({
            email: `admin-${nanoid()}@tkmce.ac.in`,
            fullName: "System Admin",
            type: "admin",
            isActive: true,
        }).returning();
        
        const [scopedUser] = await db.insert(schema.user).values({
            email: `user-target-${nanoid()}@tkmce.ac.in`,
            fullName: "End User",
            type: "end_user",
            isActive: true,
        }).returning();
        targetUserId = scopedUser!.id;

        adminToken = await generateAccessToken({ id: adminUser!.id, type: "admin" });
        endUserToken = await generateAccessToken({ id: scopedUser!.id, type: "end_user" });
    });

    describe("Admin POV - Global Access via API", () => {
        it("allows admin to create an organization", async () => {
            const res = await request(app)
                .post("/organizations")
                .set("Authorization", bearer(adminToken))
                .send({
                    name: `Admin-Org-${nanoid()}`,
                    organizationTypeId: systemOrgTypeId
                });
            
            expect(res.status).toBe(201); // Controller returns 201 Created
            expect(res.body.data.id).toBeDefined();
            createdOrgId = res.body.data.id;
        });

        it("allows admin to fetch the newly created organization", async () => {
            const res = await request(app)
                .get(`/organizations/${createdOrgId}`)
                .set("Authorization", bearer(adminToken));
            
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(createdOrgId);
        });

        it("allows admin to add members to the organization", async () => {
            const res = await request(app)
                .post(`/organizations/${createdOrgId}/members`)
                .set("Authorization", bearer(adminToken))
                .send({
                    userId: targetUserId,
                    roleIds: [baselineRoleId]
                });
            
            expect(res.status).toBe(200);
        });
    });

    describe("End User POV - Read-Only Enforcement", () => {
        it("allows end-user to fetch organizations globally", async () => {
            const res = await request(app)
                .get(`/organizations/${createdOrgId}`)
                .set("Authorization", bearer(endUserToken));
            
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(createdOrgId);
        });

        it("prevents end-user from creating an organization", async () => {
            const res = await request(app)
                .post("/organizations")
                .set("Authorization", bearer(endUserToken))
                .send({
                    name: `Illicit-Org-${nanoid()}`,
                    organizationTypeId: systemOrgTypeId
                });
            
            expect(res.status).toBe(403);
            expect(res.body.code).toBe("FORBIDDEN");
        });

        it("prevents end-user from adding members to ANY organization", async () => {
            const res = await request(app)
                .post(`/organizations/${createdOrgId}/members`)
                .set("Authorization", bearer(endUserToken))
                .send({
                    userId: targetUserId, // Doesn't matter if it's themself
                    roleIds: [baselineRoleId]
                });
            
            expect(res.status).toBe(403);
            expect(res.body.code).toBe("FORBIDDEN");
        });
    });
});

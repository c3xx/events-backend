import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";
import app from "@/app.js";
import { generateAccessToken } from "@/lib/jwt.js";
import { db, schema } from "@/db/index.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const bearer = (token: string) => `Bearer ${token}`;

describe("Event Lifecycle E2E - Negative Paths", () => {
    let hostToken: string;
    let maliciousUserToken: string;
    let setupData: { orgId: number; eventTypeId: number; categoryId: number; hostId: number; eventId: number };

    beforeAll(async () => {
        // Build base background world dynamically
        const [orgType] = await db.insert(schema.organizationType).values({ name: `org-type-${nanoid()}` }).returning();
        const [org] = await db.insert(schema.organization).values({ name: `org-${nanoid()}`, organizationTypeId: orgType!.id }).returning();
        
        const [category] = await db.insert(schema.eventCategory).values({ name: `cat-${nanoid()}` }).returning();
        
        const [role] = await db.insert(schema.role).values({
            name: `Faculty-${nanoid()}`,
            managedEntityType: "organization",
            typeRefId: org!.id
        }).returning();

        const permissions = await db.select().from(schema.permission);
        if (permissions.length > 0) {
            await db.insert(schema.rolePermission).values(
                permissions.map(p => ({ roleId: role!.id, permissionId: p.id }))
            );
        }
        
        // Setup Workflow
        const [template] = await db.insert(schema.workflowTemplate).values({ name: `Template-${nanoid()}` }).returning();
        const [step1] = await db.insert(schema.workflowTemplateStep).values({ 
            templateId: template!.id, 
            name: "Faculty Review"
        }).returning();
        await db.update(schema.workflowTemplate)
            .set({ initialStepId: step1!.id })
            .where(eq(schema.workflowTemplate.id, template!.id));

        await db.insert(schema.workflowTemplateStepRole).values({
            stepId: step1!.id,
            roleId: role!.id,
            targetGroupApprovalCriteria: "any"
        });
        
        const [eventType] = await db.insert(schema.eventType).values({
            name: `event-type-${nanoid()}`,
            workflowTemplateId: template!.id,
            isActive: true,
            venuePolicy: "optional",
            collaborationPolicy: "optional"
        }).returning();

        // Users
        const [hostUser] = await db.insert(schema.user).values({
            email: `host-${nanoid()}@tkmce.ac.in`,
            fullName: "Host User",
            type: "end_user",
            isActive: true,
        }).returning();
        
        const [maliciousUser] = await db.insert(schema.user).values({
            email: `hacker-${nanoid()}@tkmce.ac.in`,
            fullName: "Malicious User",
            type: "end_user",
            isActive: true,
        }).returning(); // Has NO roles, NO scopes, NO permissions!

        // Assign users to organization
        const [managedEntity] = await db.select().from(schema.managedEntity).where(eq(schema.managedEntity.refId, org!.id));
        
        await db.insert(schema.userRole).values({
            userId: hostUser!.id,
            roleId: role!.id,
            managedEntityId: managedEntity!.id,
        });

        hostToken = await generateAccessToken({ id: hostUser!.id, type: "end_user" });
        maliciousUserToken = await generateAccessToken({ id: maliciousUser!.id, type: "end_user" });

        setupData = {
            orgId: org!.id,
            eventTypeId: eventType!.id,
            categoryId: category!.id,
            hostId: hostUser!.id,
            eventId: 0 // Will assign later
        };
    });

    describe("Authentication and Scoping", () => {
        it("unauthenticated requests should throw 401 Unauthorized", async () => {
            const res = await request(app)
                .post("/events")
                .send({});
            
            expect(res.status).toBe(401);
        });

        it("tampered tokens should throw 401 Unauthorized", async () => {
            const res = await request(app)
                .get("/me/approval-assignments/events")
                .set("Authorization", bearer("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token"));
            
            expect(res.status).toBe(401);
        });
        
        it("malicious end-user doing operations out of bounds throws 403 Forbidden", async () => {
            // Because they don't have scoping permissions or event:create
            const res = await request(app)
                .post("/events")
                .set("Authorization", bearer(maliciousUserToken))
                .send({
                    organizationId: setupData.orgId,
                    typeId: setupData.eventTypeId,
                    categoryId: setupData.categoryId,
                    title: "Malicious Meetup",
                    requestDetails: "Testing...",
                    expectedParticipants: 100,
                    startsAt: new Date(Date.now() + 86400000).toISOString(),
                    endsAt: new Date(Date.now() + 172800000).toISOString(),
                });
            
            expect(res.status).toBe(403);
            expect(res.body.code).toBe("FORBIDDEN");
        });
    });

    describe("Event State Violations", () => {
        it("creates initial event draft to act on", async () => {
            const res = await request(app)
                .post("/events")
                .set("Authorization", bearer(hostToken))
                .send({
                    organizationId: setupData.orgId,
                    typeId: setupData.eventTypeId,
                    categoryId: setupData.categoryId,
                    title: "Victim Event",
                    requestDetails: "Testing...",
                    expectedParticipants: 10,
                    startsAt: new Date(Date.now() + 86400000).toISOString(),
                    endsAt: new Date(Date.now() + 172800000).toISOString(),
                });

            expect(res.status).toBe(200);
            setupData.eventId = res.body.data.id;
        });

        it("malicious user attempting to submit an event they do not own throws 403/404", async () => {
            const res = await request(app)
                .post(`/events/${setupData.eventId}/submit`)
                .set("Authorization", bearer(maliciousUserToken));

            expect(res.status).toBeGreaterThanOrEqual(403);
        });

        it("submitting an event successfully", async () => {
            const res = await request(app)
                .post(`/events/${setupData.eventId}/submit`)
                .set("Authorization", bearer(hostToken));
            
            expect(res.status).toBe(200);
        });

        it("host attempting to resubmit already-submitted event throws 409 Conflict", async () => {
            const res = await request(app)
                .post(`/events/${setupData.eventId}/submit`)
                .set("Authorization", bearer(hostToken));

            expect(res.status).toBe(409); // Conflict, event is already queued
        });
    });
});

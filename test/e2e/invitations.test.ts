import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";
import app from "@/app.js";
import { generateAccessToken } from "@/lib/jwt.js";
import { db, schema } from "@/db/index.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const bearer = (token: string) => `Bearer ${token}`;

describe("Event Organizer Invitations E2E - Multi-Org Collaboration", () => {
    let hostToken: string;
    let recipientToken: string;
    let maliciousToken: string;

    let setupData: {
        hostOrgId: number;
        recipientOrgId: number;
        maliciousOrgId: number;
        hostRoleId: number;
        recipientRoleId: number;
        maliciousRoleId: number;
        eventTypeId: number;
        categoryId: number;
    };

    beforeAll(async () => {
        // --- Infrastructure ---
        const [orgType] = await db.insert(schema.organizationType).values({ name: `org-type-${nanoid()}` }).returning();
        
        const [hostOrg] = await db.insert(schema.organization).values({ name: `Host-Org-${nanoid()}`, organizationTypeId: orgType!.id }).returning();
        const [recipientOrg] = await db.insert(schema.organization).values({ name: `Recipient-Org-${nanoid()}`, organizationTypeId: orgType!.id }).returning();
        const [maliciousOrg] = await db.insert(schema.organization).values({ name: `Malicious-Org-${nanoid()}`, organizationTypeId: orgType!.id }).returning();
        
        const [category] = await db.insert(schema.eventCategory).values({ name: `cat-${nanoid()}` }).returning();

        // --- Roles & Permissions ---
        const [baseRole] = await db.insert(schema.role).values({
            name: `Global-Coordinator-${nanoid()}`,
            managedEntityType: "organization",
            typeRefId: orgType!.id
        }).returning();

        const permissions = await db.select().from(schema.permission);
        if (permissions.length > 0) {
            await db.insert(schema.rolePermission).values(
                permissions.map(p => ({ roleId: baseRole!.id, permissionId: p.id }))
            );
        }

        // --- Event Type ---
        // For events to allow co_hosts, collaborationPolicy must be 'optional' or 'required'.
        const [template] = await db.insert(schema.workflowTemplate).values({ name: `Template-${nanoid()}` }).returning();
        const [step1] = await db.insert(schema.workflowTemplateStep).values({ templateId: template!.id, name: "Auto Approve" }).returning();
        await db.update(schema.workflowTemplate).set({ initialStepId: step1!.id }).where(eq(schema.workflowTemplate.id, template!.id));
        await db.insert(schema.workflowTemplateStepRole).values({ stepId: step1!.id, roleId: baseRole!.id, targetGroupApprovalCriteria: "any" });

        const [eventType] = await db.insert(schema.eventType).values({
            name: `event-type-${nanoid()}`,
            workflowTemplateId: template!.id,
            isActive: true,
            venuePolicy: "optional",
            collaborationPolicy: "optional"
        }).returning();

        // --- Users ---
        const [hostUser] = await db.insert(schema.user).values({ email: `host-${nanoid()}@tkmce.ac.in`, fullName: "Host", type: "end_user", isActive: true }).returning();
        const [recipientUser] = await db.insert(schema.user).values({ email: `recipient-${nanoid()}@tkmce.ac.in`, fullName: "Recipient", type: "end_user", isActive: true }).returning();
        const [maliciousUser] = await db.insert(schema.user).values({ email: `hacker-${nanoid()}@tkmce.ac.in`, fullName: "Bad Actor", type: "end_user", isActive: true }).returning();

        // --- Managed Entity Linkage ---
        const [hostME] = await db.select().from(schema.managedEntity).where(eq(schema.managedEntity.refId, hostOrg!.id));
        const [recipientME] = await db.select().from(schema.managedEntity).where(eq(schema.managedEntity.refId, recipientOrg!.id));
        const [maliciousME] = await db.select().from(schema.managedEntity).where(eq(schema.managedEntity.refId, maliciousOrg!.id));

        const [hostUR] = await db.insert(schema.userRole).values({ userId: hostUser!.id, roleId: baseRole!.id, managedEntityId: hostME!.id, isActive: true }).returning();
        const [recipientUR] = await db.insert(schema.userRole).values({ userId: recipientUser!.id, roleId: baseRole!.id, managedEntityId: recipientME!.id, isActive: true }).returning();
        const [maliciousUR] = await db.insert(schema.userRole).values({ userId: maliciousUser!.id, roleId: baseRole!.id, managedEntityId: maliciousME!.id, isActive: true }).returning();

        // Tokens
        hostToken = await generateAccessToken({ id: hostUser!.id, type: "end_user" });
        recipientToken = await generateAccessToken({ id: recipientUser!.id, type: "end_user" });
        maliciousToken = await generateAccessToken({ id: maliciousUser!.id, type: "end_user" });

        setupData = {
            hostOrgId: hostOrg!.id,
            recipientOrgId: recipientOrg!.id,
            maliciousOrgId: maliciousOrg!.id,
            hostRoleId: baseRole!.id,
            recipientRoleId: baseRole!.id,
            maliciousRoleId: baseRole!.id,
            eventTypeId: eventType!.id,
            categoryId: category!.id,
        };
    });

    describe.sequential("Invitation Happy Path and Scoped Denial Logic", () => {
        let eventId: number;
        let invitationId: number;

        it("allows host to create a new collaborative event draft", async () => {
            const res = await request(app)
                .post("/events")
                .set("Authorization", bearer(hostToken))
                .send({
                    organizationId: setupData.hostOrgId,
                    typeId: setupData.eventTypeId,
                    categoryId: setupData.categoryId,
                    title: "Joint Mega Summit",
                    requestDetails: "Collaboration Time",
                    expectedParticipants: 400,
                    startsAt: new Date(Date.now() + 86400000).toISOString(),
                    endsAt: new Date(Date.now() + 172800000).toISOString(),
                });

            expect(res.status).toBe(200);
            eventId = res.body.data.id;
        });

        it("allows host to issue a co_host invitation via organizers endpoint", async () => {
            const res = await request(app)
                .post(`/events/${eventId}/organizers`)
                .set("Authorization", bearer(hostToken))
                .send({
                    roleId: setupData.hostRoleId,
                    organizationId: setupData.recipientOrgId,
                    intendedRole: "co_host"
                });

            expect(res.status).toBe(201);
            expect(res.body.data.id).toBeDefined(); // The invitation ID
            invitationId = res.body.data.id;
        });

        it("prevents third-party malicious user from reading the pending invitation", async () => {
            const res = await request(app)
                .get(`/me/invitations/${invitationId}`)
                .set("Authorization", bearer(maliciousToken));
            
            expect(res.status).toBe(403);
            expect(res.body.code).toBe("FORBIDDEN");
        });

        it("prevents third-party malicious user from accepting the invitation on behalf of recipient", async () => {
            const res = await request(app)
                .patch(`/me/invitations/${invitationId}`)
                .set("Authorization", bearer(maliciousToken))
                .send({
                    roleId: setupData.maliciousRoleId, // Trying to use their own role mapping
                    status: "accepted"
                });
            
            expect(res.status).toBe(403);
            expect(res.body.code).toBe("FORBIDDEN");
        });

        it("allows legitimate recipient to view the pending invitation", async () => {
            const res = await request(app)
                .get(`/me/invitations/${invitationId}`)
                .set("Authorization", bearer(recipientToken));
            
            expect(res.status).toBe(200);
            expect(res.body.data.invitedAt).toBeDefined();
        });

        it("allows legitimate recipient to ACCEPT the invitation using their scoped role context", async () => {
            const res = await request(app)
                .patch(`/me/invitations/${invitationId}`)
                .set("Authorization", bearer(recipientToken))
                .send({
                    roleId: setupData.recipientRoleId,
                    status: "accepted"
                });
            
            expect(res.status).toBe(200);
        });

        it("prevents recipient from attempting to accept an already-closed invitation", async () => {
            const res = await request(app)
                .patch(`/me/invitations/${invitationId}`)
                .set("Authorization", bearer(recipientToken))
                .send({
                    roleId: setupData.recipientRoleId,
                    status: "accepted"
                });
            
            expect(res.status).toBe(404); // Not Found, as it leaves the pending queue natively
        });

        it("prevents host from revoking the invitation since it was already accepted", async () => {
            const res = await request(app)
                .delete(`/events/${eventId}/organizer-invitations/${invitationId}`)
                .set("Authorization", bearer(hostToken))
                .send({
                    roleId: setupData.hostRoleId
                });
            
            expect(res.status).toBe(409); // Conflict
        });
    });
});

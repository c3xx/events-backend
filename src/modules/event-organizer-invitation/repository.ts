import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db/index.js";
import { dbAction, unreachable } from "@/lib/helpers.js";
import { event } from "@/db/schema.js";

export const getEventInvitations = dbAction(async (eventId: number) => {
    return await db.quer.eventOrganizerInvitation.findMany({
        where: and(
            eq(schema.eventOrganizerInvitation.eventId, eventId),
            isNull(schema.eventOrganizerInvitation.deletedAt),
        ),
        columns: {
            id: true,
            status: true,
            invitedAt: true,
            closedAt: true,
        },
        with{
            senderOrganization: {
                columns: { id:true, name: true},
            },
            recipientOrganization: {
                columns: {id: true, name: true},
            },
            invitedByUser: {
                columns: {id: true},
                with: {
                    user: { columns: {id: true, fullName: true}},
                },
            },
        },
    });
});

export const findInvitationById = dbAction( async (eventId: number, invitationId: number) =>{
    const [invitation] = await db
        .select({
            id: schema.eventOrganizerInvitation.id,
            status: schema.eventOrganizerInvitation.status,
            senderOrganizationId: schema.eventOrganizerInvitation.senderOrganizationId,
            recipientOrganizationId: schema.eventOrganizerInvitation.recipientOrganizationId,
        })
        .from(schema.eventOrganizerInvitation)
        .where(
            and(
                eq(schema.eventOrganizerInvitation.eventId, eventId),
                eq(schema.eventOrganizerInvitation.invitationId, invitationId),
                isNull(schema.eventOrganizerInvitation.deletedAt),
            ),
        )
        .limit(1);
        
        return invitation;
});

export const sendInvitation = dbAction(async (data:{
    eventId: number,
    invitedByUserId: number,
    senderOrganizationId: number,
    recipientOrganizationId: number;
}) => {
    const [inserted] = await db
    .insert(schema.eventOrganizerInvitation)
    .values({
        ...data,
        status: "pending",
    })
    .returning({id: schema.eventOrganizerInvitation.id});

    if(inserted == null) unreachable();
    return inserted;
});

export const respondToInvitation = dbAction( async (invitationId: number, data:{
    status: "accepted" | "rejected";
    respondedByUserId: number;
    }
)   => {
        const [updated] = await db
            .update(schema.eventOrganizerInvitation)
            .set({
                status: data.status,
                respondedByUserId: data.respondedByUserId,
                closedAt: new Date().toISOString(),
                //updatedAt: new Date().toISOString(),
            })
            .where(
                eq(schema.eventOrganizerInvitation.id, invitationId)
            )
            .returning({
                id: schema.eventOrganizerInvitation.id,
                status: schema.eventOrganizerInvitation.status,
            });
        
            if (updated == null) unreachable();
            return updated;
});

export const revokeInvitation = dbAction( async (invitationId: number) =>{
    const [updated] = await db.
        update(schema.eventOrganizerInvitation)
        .set({
            status: "revoked",
            closedAt: new Date().toISOString(),
            // updatedAt: new Date().toISOString(),
        })
        .where(
            eq(schema.eventOrganizerInvitation.id, invitationId))
            .returning({id: schema.eventOrganizerInvitation.id});
});

// export const findOrganizerByOrganization = dbAction(async (
//     eventId: number,
//     organizationId: number,
// ) => {
//     const [organizer] = await db
//         .select({ id: schema.eventOrganizer.id })
//         .from(schema.eventOrganizer)
//         .where(
//             and(
//                 eq(schema.eventOrganizer.eventId, eventId),
//                 eq(schema.eventOrganizer.organizationId, organizationId),
//                 isNull(schema.eventOrganizer.deletedAt),
//             ),
//         )
//         .limit(1);

//     return organizer;
// });


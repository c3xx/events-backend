import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors.js";
import * as repository from "./repository.js";
import * as eventRepository from "@/modules/event/repository.js";
import type { SendInvitationSchema, RespondToInvitationSchema } from "./schema.js";

export async funtion getEventInvitations(eventId: number) {
    const event = await eventRepository.findEventById(eventId);
    if(event == null) throw new NotFoundError("Event not found");

    return await repository.getEventInvitations(eventId);
}

export async function SendInvitation(
    eventId: number,
    input: SendInvitationSchema,
    senderOrganizationId: number,
    invitedByUserId: number,
) {
    const event = await eventRepository.findEventById(eventId);
    if (event == null) throw new NotFoundError("Event not found");

    if (event.status !== "draft") {
        throw new ForbiddenError("Invitations can only be sent while the event is in Draft status");
    }

    if (senderOrganizationId === input.recipientOrganizationId){
        throw new ConflictError("Cannot send invitation to own organization");
    }

//        const senderOrganizer = await repository.findOrganizerByOrganization(
//         eventId,
//         senderOrganizationId,
//     );
//     if (senderOrganizer == null) {
//         throw new ForbiddenError("Only host organizers of this event can send invitations");
//     }

//     // 5. recipient must not already be an organizer
//     const recipientOrganizer = await repository.findOrganizerByOrganization(
//         eventId,
//         input.recipientOrganizationId,
//     );
//     if (recipientOrganizer != null) {
//         throw new ConflictError("This organization is already an organizer of this event");
//     }

//     return await repository.sendInvitation({
//         eventId,
//         invitedByUserId,
//         senderOrganizationId,
//         recipientOrganizationId: input.recipientOrganizationId,
//     });
// }
};

export async function respondToInvitation(
    eventId: number,
    invitationId: number,
    input: RespondToInvitationSchema,
    respondedByUserId: number,
    respondedByOrganizationId: number,
) {
    const event = await eventRepository.findEventById(eventId);
    if (event == null) throw new NotFoundError("Event not found");

    const invitation = await repository.findInvitationById(eventId, invitationId);
    if (invitation == null) {
        throw new NotFoundError("Inviation not found");
    }

    if(invitation.status !== "pending"){
        throw new ConflictError("The invitation has already been responded to");
    }

    if(invitation.recipientOrganizationId !== respondedByOrganizationId){
        throw new ForbiddenError("Only user from recipient organization can respond to invitation");
    }

    return await repository.respondToInvitation(invitationId, {
        status: input.status,
        respondedByUserId,
    });
}

export async function revokeInvitation(
    eventId: number,
    invitationId: number,
    revokerOrganizationId: number,
) {
    const event = await eventRepository.findEventById(eventId);
    if (event == null) throw new NotFoundError("Event not found");

    const invitation = await repository.findInvitationById(eventId, invitationId);
    if (invitation == null) throw new NotFoundError("Invitation not found");
    
    if (invitation.status !== "pending"){
        throw new ConflictError("Only pending invitations can be revoked");
    }

    if (invitation.senderOrganizationId !== revokerOrganizationId) {
        throw new ForbiddenError("Only sender organization can revoke the invitaion");
    }
    
    return await repository.revokeInvitation(invitationId);
}

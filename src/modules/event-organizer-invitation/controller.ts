import { ok } from "@/lib/helpers.js";
import { getAuthenticatedUser } from "@/lib/helpers.js";
import {
    invitationScopedSchema,
    invitationItemScopedSchema,
    sendInvitationSchema,
    respondToInvitationSchema,
} from "./schema.js";
import * as service from "./service.js";

export const getEventInvitations: ApiRequestHandler<
    {
        id: number,
        status: string,
        invitedAt: string,
        closedAt: string | null,
        senderOrganization: { id: number, name: string};
        recipientOrganization: {id: number, name: string},
        invitedByUser: ( id: number);
    }[]
> = async (req, res) => {
    // const params = invitationScopedSchema.parse(req.params);
    // const result = await service.getEventInvitations(params.eventId);
    return ok(req, result);
};


// // POST /events/:eventId/invitations
// export const sendInvitation: ApiRequestHandler<{
//     id: number;
// }> = async (req, res) => {
//     const params = invitationScopedSchema.parse(req.params);
//     const body = sendInvitationSchema.parse(req.body);
//     const user = getAuthenticatedUser(req);

//     // todo: senderOrganizationId and invitedByUserId (userRole id) need to come
//     // from the authenticated user's active role context — discuss with team
//     // how this is passed (header, body, or derived from user's roles)
//     const senderOrganizationId: number = req.body.senderOrganizationId;
//     const invitedByUserId: number = req.body.invitedByUserId;

//     const result = await service.sendInvitation(
//         params.eventId,
//         body,
//         senderOrganizationId,
//         invitedByUserId,
//     );
//     return ok(res, result, 201);
// };

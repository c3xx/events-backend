import z from "zod";
import { idLike } from "@/lib/helpers.js";

export const createAuthorityHolderSchema = z
	.object({
		// note: will need to update here to support both type & id if we ever
		// need to support non-organizations ruling over organizations (or
		// vice-versa i think)
		organizationId: idLike("Invalid organization ID"),
	})
	.strict();

export type CreateAuthorityHolderSchema = z.output<typeof createAuthorityHolderSchema>;

import { describe, expect, test } from "vitest";
import { createOrganization } from "@/modules/organization/service.js";
import { createOrganizationType } from "@/modules/organization-type/service.js";

describe("organization management", () => {
	test("create organization", async () => {
		const orgType = await createOrganizationType({ name: "institution" });
		const org = await createOrganization({
			organizationTypeId: orgType.id,
			name: "TKMCE",
		});
		expect(org.id).toBeDefined();
	});

	// todo: parent stuff
});

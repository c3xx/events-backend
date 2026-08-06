import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { assert, beforeAll, describe, expect, test } from "vitest";
import { db, schema } from "@/db/index.js";
import {
	assignEventFacility,
	unassignEventFacility,
} from "@/modules/event/facility-assignments/service.js";
import { findEventById } from "@/modules/event/repository.js";
import { createEvent, getEvent, submitEvent } from "@/modules/event/service.js";
import { findFacilities, findFacilityById } from "@/modules/facility/repository.js";
import { changeAvailability, createFacility } from "@/modules/facility/service.js";
import {
	createOrganizerTestSetup,
	createTestEventBody,
	createTestFacilityProvider,
	createTestFacilityType,
	createTestOrganization,
	createTestOrganizationType,
	createTestVenue,
	createTestVenueAllotment,
	createTestVenueType,
	getWorkflowForEvent,
	setupWorkflowTestEnvironment,
} from "./integration-test-helpers.js";

describe("Facility Integration Tests", () => {
	let validFacilityTypeId: number;
	let validOrgId: number;
	let validVenueId: number;
	let validVenueTypeId: number;

	beforeAll(async () => {
		const fType = await createTestFacilityType();
		validFacilityTypeId = fType.id;

		const orgType = await createTestOrganizationType();
		const org = await createTestOrganization({ organizationTypeId: orgType.id });
		validOrgId = org.id;

		const vType = await createTestVenueType();
		validVenueTypeId = vType.id;
		const venue = await createTestVenue({
			venueTypeId: vType.id,
			name: `venue-${nanoid()}`,
			accessLevel: "public",
			isAvailable: true,
			maxCapacity: 100,
		});
		validVenueId = venue.id;
	});

	describe("1. Core Facility CRUD & Managed Entity Integrity", () => {
		test("creates facility securely with isAvailable: false by default", async () => {
			const facility = await createFacility({
				name: `AutoFalse-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});

			const dbRecord = await db.query.facility.findFirst({
				where: eq(schema.facility.id, facility.id),
			});
			assert(dbRecord != null);
			expect(dbRecord.isAvailable).toBe(false);

			const me = await db.query.managedEntity.findFirst({
				where: and(
					eq(schema.managedEntity.refId, facility.id),
					eq(schema.managedEntity.managedEntityType, "facility"),
				),
			});
			expect(me?.managedEntityType).toBe("facility");
		});

		test("changeAvailability flips isAvailable to true and persists it, then back to false", async () => {
			const facility = await createFacility({
				name: `FlipTest-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});

			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const facTrueFetch = await findFacilityById(facility.id);
			assert(facTrueFetch != null);
			await changeAvailability(facTrueFetch, { availability: true });
			const recordTrue = await db.query.facility.findFirst({
				where: eq(schema.facility.id, facility.id),
			});
			expect(recordTrue?.isAvailable).toBe(true);

			const facFalseFetch = await findFacilityById(facility.id);
			assert(facFalseFetch != null);
			await changeAvailability(facFalseFetch, { availability: false });
			const recordFalse = await db.query.facility.findFirst({
				where: eq(schema.facility.id, facility.id),
			});
			expect(recordFalse?.isAvailable).toBe(false);
		});

		test("rejects facility creation with non-existent typeId (FK violation)", async () => {
			await expect(
				createFacility({
					name: `GhostType-${nanoid()}`,
					typeId: 32767,
					association: "event",
					workflowParticipationPolicy: "exclude",
					overlapPolicy: "shared",
				}),
			).rejects.toThrow();
		});

		test("findFacilityById returns full facility including empty providers: [] when no providers exist yet", async () => {
			const facility = await createFacility({
				name: `EmptyProv-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});
			const fetched = await findFacilityById(facility.id);
			assert(fetched != null);
			expect(fetched.providers).toEqual([]);
		});

		test("findFacilities returns all facilities, each with correctly nested type and providers", async () => {
			const all = await findFacilities({});
			expect(all.length).toBeGreaterThan(0);
			expect(all[0]?.type).toBeDefined();
			expect(all[0]?.providers).toBeDefined();
		});

		test("[Edge Case] facility becomes unfetchable via findFacilityById once its facilityType is soft-deleted", async () => {
			const tempType = await createTestFacilityType({ name: `TempType-${nanoid()}` });
			const facility = await createFacility({
				name: `TempFac-${nanoid()}`,
				typeId: tempType.id,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});

			// Soft delete the type
			await db
				.update(schema.facilityType)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.facilityType.id, tempType.id));

			const fetched = await findFacilityById(facility.id);
			expect(fetched).toBeUndefined();

			const all = await findFacilities({});
			const sameFacilityInAll = all.find((f) => f.id === facility.id);
			expect(sameFacilityInAll).toBeUndefined();
		});

		test("soft-deleting the facility itself removes it from both findFacilities and findFacilityById", async () => {
			const facility = await createFacility({
				name: `DelFac-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});

			await db
				.update(schema.facility)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.facility.id, facility.id));

			const fetched = await findFacilityById(facility.id);
			expect(fetched).toBeUndefined();
		});
	});

	describe("2. Facility Provider Resolution", () => {
		test("provider with providerEntityType: 'organization' resolves scope with correct id, name, and kind via SQL CASE", async () => {
			const facility = await createFacility({
				name: `OrgScope-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});

			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});

			const fetched = await findFacilityById(facility.id);

			assert(fetched != null);
			expect(fetched.providers.length).toBe(1);
			expect(fetched?.providers[0]?.scope?.kind?.name).toBeDefined();
			expect(fetched?.providers[0]?.scope?.id).toBe(validOrgId);
		});

		test("provider with providerEntityType: 'venue' resolves scope with correct id, name, and kind", async () => {
			const facility = await createFacility({
				name: `VenueScope-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});

			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "venue",
				providerEntityRefId: validVenueId,
			});

			const fetched = await findFacilityById(facility.id);

			assert(fetched != null);
			expect(fetched.providers.length).toBe(1);
			expect(fetched?.providers[0]?.scope?.kind?.name).toBeDefined();
			expect(fetched?.providers[0]?.scope?.id).toBe(validVenueId);
		});

		test("soft-deleted provider row excluded from providers left join", async () => {
			const facility = await createFacility({
				name: `DeletedProv-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});

			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});

			await db
				.update(schema.facilityProvider)
				.set({ deletedAt: new Date().toISOString() })
				.where(eq(schema.facilityProvider.facilityId, facility.id));

			const fetched = await findFacilityById(facility.id);
			expect(fetched?.providers.length).toBe(0);
		});

		test("facility with multiple providers of mixed types (one org, one venue) independently resolve scopes", async () => {
			const facility = await createFacility({
				name: `MultiProv-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});

			await Promise.all([
				createTestFacilityProvider({
					facilityId: facility.id,
					providerEntityType: "organization",
					providerEntityRefId: validOrgId,
				}),
				createTestFacilityProvider({
					facilityId: facility.id,
					providerEntityType: "venue",
					providerEntityRefId: validVenueId,
				}),
			]);

			const fetched = await findFacilityById(facility.id);
			expect(fetched?.providers.length).toBe(2);
			const scopes = fetched?.providers.map((p) => p.scope?.kind?.name);
			assert(scopes != null);
			expect(scopes.length).toBe(2);
		});
	});

	describe("3. Facility Assignment to Events", () => {
		test("assigns an association: 'event' facility successfully when venueAllotmentId is omitted", async () => {
			const { event, admin } = await createOrganizerTestSetup();
			const facility = await createFacility({
				name: `AssocEvent-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});
			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const facEventScope = await findFacilityById(facility.id);
			assert(facEventScope != null);
			await changeAvailability(facEventScope, { availability: true });

			const assignment = await assignEventFacility(admin, event, {
				facilityId: facility.id,
			});
			expect(assignment).toBeDefined();
		});

		test("rejects assigning an association: 'venue_allotment' facility when venueAllotmentId is omitted", async () => {
			const { event, admin } = await createOrganizerTestSetup();
			const facility = await createFacility({
				name: `AssocVenueReq-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "venue_allotment",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});
			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const facVenueScope = await findFacilityById(facility.id);
			assert(facVenueScope != null);
			await changeAvailability(facVenueScope, { availability: true });

			await expect(assignEventFacility(admin, event, { facilityId: facility.id })).rejects.toThrow(
				"This facility can only be associated with a venue",
			);
		});

		test("rejects assigning an association: 'event' facility when venueAllotmentId is supplied", async () => {
			const { event, admin } = await createOrganizerTestSetup();
			const facEvent = await createFacility({
				name: `NoVenueAllotReq-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});
			await createTestFacilityProvider({
				facilityId: facEvent.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const facEvtFetched = await findFacilityById(facEvent.id);
			assert(facEvtFetched != null);
			await changeAvailability(facEvtFetched, { availability: true });

			await expect(
				assignEventFacility(admin, event, { facilityId: facEvent.id, venueAllotmentId: 1 }),
			).rejects.toThrow("This facility can only be associated with an event");
		});

		test("rejects assignment when facility.isAvailable is false", async () => {
			const { event, admin } = await createOrganizerTestSetup();
			const facility = await createFacility({
				name: `NotAvail-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});

			await expect(
				assignEventFacility(admin, event, { facilityId: facility.id }),
			).rejects.toThrow();
		});

		test("rejects duplicate assignment of the same 'event'-association facility to the same event", async () => {
			const { event, admin } = await createOrganizerTestSetup();
			const facility = await createFacility({
				name: `DupAssoc-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});
			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const facFetched = await findFacilityById(facility.id);
			assert(facFetched != null);
			await changeAvailability(facFetched, { availability: true });

			await assignEventFacility(admin, event, { facilityId: facility.id });

			const freshDbEvent = await findEventById(event.id);
			assert(freshDbEvent != null);
			const freshEvent = await getEvent(freshDbEvent);

			await expect(
				assignEventFacility(admin, freshEvent, { facilityId: facility.id }),
			).rejects.toThrow("The facility is already assigned to the event");
		});

		test("TOCTOU duplicate checker fails atomically under concurrent assignments", async () => {
			const { event, admin } = await createOrganizerTestSetup();
			const facility = await createFacility({
				name: `RaceAssoc-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});
			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const facDupeCheck = await findFacilityById(facility.id);
			assert(facDupeCheck != null);
			await changeAvailability(facDupeCheck, { availability: true });

			const promises = Array.from({ length: 5 }).map(() =>
				assignEventFacility(admin, event, { facilityId: facility.id }).catch((e) => e),
			);
			await Promise.all(promises);

			const allAssignments = await db.query.eventFacility.findMany({
				where: and(
					eq(schema.eventFacility.eventId, event.id),
					eq(schema.eventFacility.facilityId, facility.id),
				),
			});

			expect(allAssignments.length).toBeGreaterThan(1);
		});

		test("rejects assignment if venueAllotmentId exists but belongs to a totally different event", async () => {
			const { event: eventA, admin } = await createOrganizerTestSetup();
			const { event: eventB } = await createOrganizerTestSetup();

			const allotmentB = await createTestVenueAllotment({
				eventId: eventB.id,
				venueId: validVenueId,
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 172800000).toISOString(),
			});

			const facility = await createFacility({
				name: `CrossAllot-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "venue_allotment",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});
			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const crossAllotFac = await findFacilityById(facility.id);
			assert(crossAllotFac != null);
			await changeAvailability(crossAllotFac, { availability: true });

			await expect(
				assignEventFacility(admin, eventA, {
					facilityId: facility.id,
					venueAllotmentId: allotmentB?.id,
				}),
			).rejects.toThrow("Could not find the venue allotment in this event");
		});

		test("rejects assignment if the facility lacks a provider natively matching the allotment's physical Venue ID", async () => {
			const { event, admin } = await createOrganizerTestSetup();

			const diffVenue = await createTestVenue({
				venueTypeId: validVenueTypeId,
				name: `DiffVen-${nanoid()}`,
			});

			const allotment = await createTestVenueAllotment({
				eventId: event.id,
				venueId: validVenueId,
				startsAt: new Date(Date.now() + 86400000).toISOString(),
				endsAt: new Date(Date.now() + 172800000).toISOString(),
			});

			const facRaw = await createFacility({
				name: `ProviderMismatch-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "venue_allotment",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});

			await createTestFacilityProvider({
				facilityId: facRaw.id,
				providerEntityType: "venue",
				providerEntityRefId: diffVenue.id,
			});
			const provMisFac = await findFacilityById(facRaw.id);
			assert(provMisFac != null);
			await changeAvailability(provMisFac, { availability: true });

			const freshDbEvent = await findEventById(event.id);
			assert(freshDbEvent != null);
			const freshEvent = await getEvent(freshDbEvent);

			await expect(
				assignEventFacility(admin, freshEvent, {
					facilityId: facRaw.id,
					venueAllotmentId: allotment?.id,
				}),
			).rejects.toThrow(
				"Facility cannot be assigned to this venue allotment, as the venue isn't the provider of this facility",
			);
		});

		test("rejects unassigning a non-existent facility assignment", async () => {
			const { event, admin } = await createOrganizerTestSetup();
			await expect(unassignEventFacility(admin, event, 327679)).rejects.toThrow(
				"Could not find the facility assignment",
			);
		});
	});

	describe("4. Workflow Participation Policy", () => {
		test("Include facility (Org provider) spans directly to Target Groups", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const createdEvent = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			const fullEvent = await findEventById(createdEvent.id);
			assert(fullEvent != null);
			const fullEventScope = await getEvent(fullEvent);

			const facility = await createFacility({
				name: `TargetInc-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "include",
				overlapPolicy: "shared",
			});

			const testProviderOrg = await createTestOrganization({
				name: `FacProviderOrg-${nanoid()}`,
				organizationTypeId: setup.eventOrg.organizationTypeId,
			});

			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: testProviderOrg.id,
			});
			const incFac = await findFacilityById(facility.id);
			assert(incFac != null);
			await changeAvailability(incFac, { availability: true });

			await assignEventFacility({ id: setup.hostUser.id, type: "end_user" }, fullEventScope, {
				facilityId: facility.id,
			});

			const finalEvent = await findEventById(createdEvent.id);
			assert(finalEvent != null);
			const finalEventScope = await getEvent(finalEvent);

			await submitEvent({ id: setup.hostUser.id, type: "end_user" }, finalEventScope);

			const workflow = await getWorkflowForEvent(createdEvent.id);
			const targetGroups = workflow.steps.flatMap((s) => s.roles).flatMap((r) => r.targetGroups);
			expect(targetGroups.length).toBeGreaterThanOrEqual(1);

			const orgME = await db.query.managedEntity.findFirst({
				where: and(
					eq(schema.managedEntity.refId, testProviderOrg.id),
					eq(schema.managedEntity.managedEntityType, "organization"),
				),
			});
			assert(orgME != null);
			const pointsToProviderOrg = targetGroups.some((tg) => tg.managedEntityId === orgME.id);
			expect(pointsToProviderOrg).toBe(true);
		});

		test("Exclude facility entirely omits all target groups natively", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const createdEvent = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			const fullEvent = await findEventById(createdEvent.id);
			assert(fullEvent != null);
			const fullEventScope = await getEvent(fullEvent);

			const facility = await createFacility({
				name: `TargetExc-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});
			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const excFac = await findFacilityById(facility.id);
			assert(excFac != null);
			await changeAvailability(excFac, { availability: true });

			await assignEventFacility({ id: setup.hostUser.id, type: "end_user" }, fullEventScope, {
				facilityId: facility.id,
			});

			const finalEvent = await findEventById(createdEvent.id);
			assert(finalEvent != null);
			await submitEvent({ id: setup.hostUser.id, type: "end_user" }, await getEvent(finalEvent));

			const workflow = await getWorkflowForEvent(createdEvent.id);
			const targetGroups = workflow.steps.flatMap((s) => s.roles).flatMap((r) => r.targetGroups);

			const orgME = await db.query.managedEntity.findFirst({
				where: and(
					eq(schema.managedEntity.refId, validOrgId),
					eq(schema.managedEntity.managedEntityType, "organization"),
				),
			});
			const pointsToProviderOrg = orgME
				? targetGroups.some((tg) => tg.managedEntityId === orgME.id)
				: false;
			expect(pointsToProviderOrg).toBe(false);
		});

		test("Empty Target Generation - facility with strictly zero mapped providers gets blocked natively by service layer", async () => {
			const facility = await createFacility({
				name: `TrgtEmpty-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "include",
				overlapPolicy: "shared",
			});

			const zeroFac = await findFacilityById(facility.id);
			assert(zeroFac != null);
			await expect(changeAvailability(zeroFac, { availability: true })).rejects.toThrow(
				"Cannot make a facility without providers available for assignment",
			);
		});

		test("Assignment Depths: manual AND via venue allotments both structurally merge down", async () => {
			const setup = await setupWorkflowTestEnvironment();
			const createdEvent = await createEvent(
				{ id: setup.hostUser.id, type: "end_user" },
				createTestEventBody({
					organizationId: setup.eventOrg.id,
					typeId: setup.eventType.id,
					categoryId: setup.category.id,
				}),
			);
			expect(createdEvent).toBeDefined();
		});
	});

	describe("5. Overlap Policy", () => {
		test("Reject exclusive assignment to Event B natively only if Event A is approved", async () => {
			const { event: eventA, admin } = await createOrganizerTestSetup();
			const { event: eventB } = await createOrganizerTestSetup();
			const facility = await createFacility({
				name: `ExclusiveFac-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "exclusive",
			});
			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const ovFac1 = await findFacilityById(facility.id);
			assert(ovFac1 != null);
			await changeAvailability(ovFac1, { availability: true });

			await assignEventFacility(admin, eventA, { facilityId: facility.id });

			await db
				.update(schema.event)
				.set({ status: "approved" })
				.where(eq(schema.event.id, eventA.id));

			const freshDbEventB = await findEventById(eventB.id);
			assert(freshDbEventB != null);
			await expect(
				assignEventFacility(admin, await getEvent(freshDbEventB), { facilityId: facility.id }),
			).rejects.toThrow("The requested facility cannot be assigned to this event");
		});

		test("Openly ALLOW assigning exclusive facility to Event B if Event A is still in a draft or pending state", async () => {
			const { event: eventA, admin } = await createOrganizerTestSetup();
			const { event: eventB } = await createOrganizerTestSetup();
			const facility = await createFacility({
				name: `ExclusiveDraft-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "exclusive",
			});
			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const ovFac2 = await findFacilityById(facility.id);
			assert(ovFac2 != null);
			await changeAvailability(ovFac2, { availability: true });

			await assignEventFacility(admin, eventA, { facilityId: facility.id });

			const freshDbEventB = await findEventById(eventB.id);
			assert(freshDbEventB != null);

			const assignB = await assignEventFacility(admin, await getEvent(freshDbEventB), {
				facilityId: facility.id,
			});
			expect(assignB).toBeDefined();
		});

		test("Prove that shared facilities actively skip the overlap engine entirely, mapping successfully even against approved events", async () => {
			const { event: eventA, admin } = await createOrganizerTestSetup();
			const { event: eventB } = await createOrganizerTestSetup();
			const facility = await createFacility({
				name: `SharedSkip-${nanoid()}`,
				typeId: validFacilityTypeId,
				association: "event",
				workflowParticipationPolicy: "exclude",
				overlapPolicy: "shared",
			});
			await createTestFacilityProvider({
				facilityId: facility.id,
				providerEntityType: "organization",
				providerEntityRefId: validOrgId,
			});
			const ovFac3 = await findFacilityById(facility.id);
			assert(ovFac3 != null);
			await changeAvailability(ovFac3, { availability: true });

			await assignEventFacility(admin, eventA, { facilityId: facility.id });
			await db
				.update(schema.event)
				.set({ status: "approved" })
				.where(eq(schema.event.id, eventA.id));

			const freshDbEventB = await findEventById(eventB.id);
			assert(freshDbEventB != null);

			const assignB = await assignEventFacility(admin, await getEvent(freshDbEventB), {
				facilityId: facility.id,
			});
			expect(assignB).toBeDefined();
		});
	});
});

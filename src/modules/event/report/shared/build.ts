import { join } from "node:path";
import { formatDateTime } from "./format.js";
import type { ReportInstitution } from "./types.js";

export type EventReportData = {
	id: number;
	title: string;
	requestDetails: string;
	startsAt: string;
	endsAt: string;
	category?: {
		name: string;
	};
	creator?: {
		fullName: string;
		email: string;
	};
	organizers?: {
		role: string;
		organization: {
			id: number;
			name: string;
		};
	}[];
	invitations?: {
		recipientOrganization: {
			id: number;
			name: string;
		};
		respondedByUser?: {
			user: {
				fullName: string;
				email: string;
			};
		} | null;
	}[];
	venueAllotments?: {
		startsAt: string;
		endsAt: string;
		venue: {
			name: string;
			facilities: { facility: { name: string } }[];
		};
	}[];
	approvedSteps?: {
		roleName: string;
		approverName: string;
		completedAt: string | null;
	}[];
	report?: {
		details: string;
		participantsCount: number;
		images: { imageUrl: string }[];
	} | null;
};

export const INSTITUTION: ReportInstitution = {
	name: "Thangal Kunju Musaliar College of Engineering",
	tagline: "(Government Aided and Autonomous)",
	address: "Kollam - 691005, Kerala, India",
	accreditation: "Accredited by NAAC with 'A' Grade & Programmes Accredited by NBA",
	phone: "Phone: +91-474-2712022, 2712024, 2713129",
	fax: "Fax: +91-474-2712023",
	email: "E-mail: principal@tkmce.ac.in",
	website: "website: www.tkmce.ac.in",
	logoPath: join(import.meta.dirname, "../../../../assets/logo.png"),
};

export function buildReferenceNumber(event: { id: number; startsAt: string }): string {
	const parsedYear = new Date(event.startsAt).getFullYear();
	const startsAtYear = Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear;
	return `IQAC/${event.id}/${startsAtYear}`;
}

export function buildVenues(venueAllotments: NonNullable<EventReportData["venueAllotments"]>) {
	return venueAllotments.map((allotment) => ({
		name: allotment.venue.name,
		timeRange: `${formatDateTime(allotment.startsAt)} to ${formatDateTime(allotment.endsAt)}`,
	}));
}

export function buildFacilities(venueAllotments: NonNullable<EventReportData["venueAllotments"]>) {
	const facilityNames = [
		...new Set(
			venueAllotments.flatMap((allotment) =>
				allotment.venue.facilities.map((f) => f.facility.name),
			),
		),
	];
	return facilityNames.length > 0 ? facilityNames : ["None"];
}

export function buildOrganizers(event: EventReportData) {
	const invitationsByOrg = new Map(
		(event.invitations ?? []).map((inv) => [inv.recipientOrganization.id, inv]),
	);

	const organizersList = (event.organizers || []).map((o) => {
		let coord: { name: string; email: string } | undefined;
		if (o.role === "host" && event.creator) {
			coord = {
				name: event.creator.fullName,
				email: event.creator.email,
			};
		} else if (o.role === "co_host") {
			const invitation = invitationsByOrg.get(o.organization.id);
			if (invitation?.respondedByUser?.user) {
				coord = {
					name: invitation.respondedByUser.user.fullName,
					email: invitation.respondedByUser.user.email,
				};
			}
		}
		return {
			name: o.organization.name,
			...(coord ? { coordinator: coord } : {}),
		};
	});

	return organizersList.length > 0 ? organizersList : [{ name: "Club/Department Coordinator" }];
}

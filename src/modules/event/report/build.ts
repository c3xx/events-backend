import { join } from "node:path";
import { formatDateTime } from "./format.js";
import type { ApprovalEntry, ApprovalReport, ReportInstitution } from "./types.js";

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
			name: string;
		};
	}[];
	invitations?: {
		recipientOrganization: {
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
};

const INSTITUTION: ReportInstitution = {
	name: "Thangal Kunju Musaliar College of Engineering",
	tagline: "(Government Aided and Autonomous)",
	address: "Kollam - 691005, Kerala, India",
	accreditation: "Accredited by NAAC with 'A' Grade & Programmes Accredited by NBA",
	phone: "Phone: +91-474-2712022, 2712024, 2713129",
	fax: "Fax: +91-474-2712023",
	email: "E-mail: principal@tkmce.ac.in",
	website: "website: www.tkmce.ac.in",
	logoPath: join(import.meta.dirname, "../../../assets/logo.png"),
};

function buildApprovalHistory(approvedSteps: EventReportData["approvedSteps"]): ApprovalEntry[] {
	if (!approvedSteps || approvedSteps.length === 0) {
		return [];
	}

	const sortedSteps = [...approvedSteps].sort((a, b) => {
		const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
		const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
		return aTime - bTime;
	});

	return sortedSteps.map((step) => ({
		roleName: step.roleName,
		approverName: step.approverName,
	}));
}

export function buildApprovalReport(event: EventReportData): ApprovalReport {
	const approvalHistory = buildApprovalHistory(event.approvedSteps);

	const parsedYear = new Date(event.startsAt).getFullYear();
	const startsAtYear = Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear;
	const refNo = `IQAC/${event.id}/${startsAtYear}`;

	const venueAllotments = event.venueAllotments ?? [];

	const venues = venueAllotments.map((allotment) => ({
		name: allotment.venue.name,
		timeRange: `${formatDateTime(allotment.startsAt)} to ${formatDateTime(allotment.endsAt)}`,
	}));

	const facilityNames = [
		...new Set(
			venueAllotments.flatMap((allotment) =>
				allotment.venue.facilities.map((f) => f.facility.name),
			),
		),
	];

	const invitationsByOrg = new Map(
		(event.invitations ?? []).map((inv) => [inv.recipientOrganization.name, inv]),
	);

	const organizersList = (event.organizers || []).map((o) => {
		let coord: { name: string; email: string } | undefined;
		if (o.role === "host" && event.creator) {
			coord = {
				name: event.creator.fullName,
				email: event.creator.email,
			};
		} else if (o.role === "co_host") {
			const invitation = invitationsByOrg.get(o.organization.name);
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

	const finalOrganizers =
		organizersList.length > 0 ? organizersList : [{ name: "Club/Department Coordinator" }];

	return {
		title: "Event Approval Report",
		generatedAt: new Date().toISOString(),
		institution: INSTITUTION,
		referenceNumber: refNo,
		eventName: event.title,
		description: event.requestDetails.trim() || "-",
		dateTimeRange: `${formatDateTime(event.startsAt)} to ${formatDateTime(event.endsAt)}`,
		venues,
		facilities: facilityNames.length > 0 ? facilityNames : ["None"],
		organizers: finalOrganizers,
		...(approvalHistory.length > 0 ? { approvalHistory } : {}),
		...(event.category?.name ? { eventCategory: event.category.name } : {}),
	};
}

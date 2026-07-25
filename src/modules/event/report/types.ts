export type ReportInstitution = {
	name: string;
	tagline?: string; // e.g. "(Government Aided and Autonomous)"
	address?: string; // e.g. "Kollam - 691005, Kerala, India"
	accreditation?: string; // e.g. "Accredited by NAAC with 'A' Grade..."
	phone?: string;
	fax?: string;
	email?: string;
	website?: string;
	logoPath?: string;
};

export type ApprovalEntry = {
	roleName: string;
	approverName: string;
};

export type ApprovalReport = {
	title: string;
	generatedAt: string;
	institution?: ReportInstitution;

	// Formal letter metadata matching TKMCE SPOC PDF
	referenceNumber?: string;
	approvalHistory?: ApprovalEntry[];

	// Parallel layout fields
	eventName: string;
	description: string;
	dateTimeRange: string;
	venues: { name: string; timeRange: string }[];
	facilities: string[];
	organizers: {
		name: string;
		coordinator?: {
			name: string;
			email: string;
		};
	}[];
	eventCategory?: string;
};

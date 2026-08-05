const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
	dateStyle: "medium",
	timeStyle: "short",
};

export function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("en-IN", DATE_TIME_FORMAT);
}

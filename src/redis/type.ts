export type RateLimitTierConfig = {
	maxRequests: number;
	windowMs: number;
	prefix: string;
};

export type RateLimitResult = {
	allowed: boolean;
	remaining: number;
	retryAfterSeconds: number;
};

import crypto from "node:crypto";

import type { RequestHandler } from "express";
import { RateLimitError } from "@/lib/errors.js";
import { resolveKey } from "@/redis/helper.js";
import { redis } from "@/redis/index.js";
import type { RateLimitResult, RateLimitTierConfig } from "@/redis/type.js";

const LUA_SCRIPT = `
local key = KEYS[1]
local max_requests = tonumber(ARGV[1])
local window_seconds = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local member = ARGV[4]

local window_start = now - window_seconds * 1000

redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

local count = redis.call('ZCARD', key)

if count < max_requests then
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, window_seconds * 1000)

  return {1, max_requests - count - 1, 0}
end

local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')

local retry_after_ms = window_seconds * 1000

if #oldest >= 2 then
  retry_after_ms = oldest[2] + window_seconds * 1000 - now
end

return {0, 0, retry_after_ms}
`;

async function attemptRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number,
): Promise<RateLimitResult> {
	const now = Date.now();
	const member = `${now}:${crypto.randomUUID()}`;
	const windowSeconds = windowMs / 1000;

	const result = (await redis.eval<string[], number[]>(
		LUA_SCRIPT,
		[key],
		[maxRequests.toString(), windowSeconds.toString(), now.toString(), member],
	)) as number[];

	const allowed = result[0] === 1;
	const remaining = result[1] ?? 0;
	const retryAfterMs = result[2] ?? 0;

	return {
		allowed,
		remaining,
		retryAfterSeconds: allowed ? 0 : Math.max(0, Math.ceil(retryAfterMs / 1000)),
	};
}

export type MethodRateLimitOptions = {
	read?: Partial<RateLimitTierConfig>;
	write?: Partial<RateLimitTierConfig>;
	adminWrite?: Partial<RateLimitTierConfig>;
};

export type RateLimiterConfig = RateLimitTierConfig | MethodRateLimitOptions;

function isExplicitConfig(config: RateLimiterConfig): config is RateLimitTierConfig {
	return config != null && "prefix" in config;
}

export function rateLimiter(config?: RateLimiterConfig): RequestHandler {
	if (config !== undefined && isExplicitConfig(config)) {
		const { maxRequests, windowMs, prefix } = config;
		return async (req, res, next) => {
			const key = resolveKey(req, prefix);
			try {
				const { allowed, retryAfterSeconds } = await attemptRateLimit(key, maxRequests, windowMs);
				if (!allowed) {
					res.setHeader("Retry-After", retryAfterSeconds);
					throw new RateLimitError(
						`Too many requests. Please try again after ${retryAfterSeconds} seconds.`,
						retryAfterSeconds,
					);
				}
				next();
			} catch (error) {
				if (error instanceof RateLimitError) return next(error);
				console.error("Rate limiter Redis failure:", error);
				return next(error);
			}
		};
	}

	const methodOptions = config as MethodRateLimitOptions | undefined;

	const readConfig: RateLimitTierConfig = {
		maxRequests: methodOptions?.read?.maxRequests ?? 200,
		windowMs: methodOptions?.read?.windowMs ?? 15 * 60 * 1000,
		prefix: methodOptions?.read?.prefix ?? "api:read",
	};

	const writeConfig: RateLimitTierConfig = {
		maxRequests: methodOptions?.write?.maxRequests ?? 60,
		windowMs: methodOptions?.write?.windowMs ?? 15 * 60 * 1000,
		prefix: methodOptions?.write?.prefix ?? "api:write",
	};

	const adminWriteConfig: RateLimitTierConfig = {
		maxRequests: methodOptions?.adminWrite?.maxRequests ?? 30,
		windowMs: methodOptions?.adminWrite?.windowMs ?? 15 * 60 * 1000,
		prefix: methodOptions?.adminWrite?.prefix ?? "api:write:admin",
	};

	return async (req, res, next) => {
		const method = req.method.toUpperCase();
		const isRead = method === "GET" || method === "HEAD" || method === "OPTIONS";

		const activeConfig = isRead
			? readConfig
			: req.user?.type === "admin"
				? adminWriteConfig
				: writeConfig;

		const key = resolveKey(req, activeConfig.prefix);

		try {
			const { allowed, retryAfterSeconds } = await attemptRateLimit(
				key,
				activeConfig.maxRequests,
				activeConfig.windowMs,
			);
			if (!allowed) {
				res.setHeader("Retry-After", retryAfterSeconds);
				throw new RateLimitError(
					`Too many requests. Please try again after ${retryAfterSeconds} seconds.`,
					retryAfterSeconds,
				);
			}
			next();
		} catch (error) {
			if (error instanceof RateLimitError) return next(error);
			console.error("Rate limiter Redis failure:", error);
			return next(error);
		}
	};
}

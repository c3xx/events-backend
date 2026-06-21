import "express";
import type * as types from "./types.js";

declare global {
	namespace Express {
		interface Request {
			// id: string;
			user?: Pick<types.User, "id" | "type">;
		}
	}
}

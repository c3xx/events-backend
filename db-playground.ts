// @ts-nocheck

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "./src/db/index.js";
import { getFullUser } from "./src/modules/user/repository.js";
import { createEventType, getEventType, getEventTypes } from "@/modules/event-type/repository.js";

console.dir(await getFullUser(4), { depth: 33 });
// console.dir(await getEventTypes(4), { depth: 33 });

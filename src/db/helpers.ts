import { is, type SelectedFields, type SQL, sql } from "drizzle-orm";
import { type PgColumn, PgTimestampString } from "drizzle-orm/pg-core";
import type { SelectResultFields } from "drizzle-orm/query-builders/select.types";

// todo: use the helpers in older code

// https://github.com/drizzle-team/drizzle-orm/issues/2050#issuecomment-2184920843
// biome-ignore lint/suspicious/noExplicitAny: I dont know how & I dont have time
export function jsonBuildObject<T extends SelectedFields<any, any>>(shape: T) {
	const chunks: SQL[] = [];

	Object.entries(shape).forEach(([key, value]) => {
		if (chunks.length > 0) {
			chunks.push(sql.raw(`,`));
		}

		chunks.push(sql.raw(`'${key}',`));

		if (is(value, PgTimestampString)) {
			chunks.push(sql`timezone('UTC', ${value})`);
		} else {
			chunks.push(sql`${value}`);
		}
	});

	return sql<SelectResultFields<T>>`json_build_object(${sql.join(chunks)})`;
}

export function jsonAgg<T>(shape: SQL<T>) {
	return sql<T[]>`coalesce(json_agg(${shape}), '[]')`;
}

// biome-ignore lint/suspicious/noExplicitAny: I dont know how & I dont have time
export function jsonBuildObjectNullable<T extends SelectedFields<any, any>>(
	shape: T,
	nullableOn: SQL | PgColumn,
) {
	const chunks: SQL[] = [];

	Object.entries(shape).forEach(([key, value]) => {
		if (chunks.length > 0) {
			chunks.push(sql.raw(`,`));
		}

		chunks.push(sql.raw(`'${key}',`));

		if (is(value, PgTimestampString)) {
			chunks.push(sql`timezone('UTC', ${value})`);
		} else {
			chunks.push(sql`${value}`);
		}
	});

	return sql<SelectResultFields<T> | null>`case when ${nullableOn} is null then null else json_build_object(${sql.join(chunks)}) end`;
}

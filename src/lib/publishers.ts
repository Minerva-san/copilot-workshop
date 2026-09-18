/**
 * Data-access helpers for publisher records.
 *
 * Queries the build-time SQLite database through Drizzle with an injectable
 * database client so the helpers can be used by pages and tests.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';

/**
 * Retrieves all publishers ordered alphabetically by name.
 *
 * @param db - Injectable Drizzle database client used to query publishers.
 * @returns A promise resolving to the publishers ordered by name.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db
        .select({
            id: publishers.id,
            name: publishers.name,
        })
        .from(publishers)
        .orderBy(asc(publishers.name));

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
    }));
}

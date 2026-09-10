import { asc } from 'drizzle-orm';
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getFilteredGames,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by category and publisher together', async () => {
        const [strategy] = await db
            .insert(categories)
            .values([
                { name: 'Strategy', description: 'strategy games' },
                { name: 'Puzzle', description: 'puzzle games' },
            ])
            .returning({ id: categories.id, name: categories.name });
        const [publisher] = await db
            .insert(publishers)
            .values([
                { name: 'Pub One', description: 'first publisher' },
                { name: 'Pub Two', description: 'second publisher' },
            ])
            .returning({ id: publishers.id, name: publishers.name });
        const categoryRows = await db.select().from(categories).orderBy(asc(categories.name));
        const publisherRows = await db.select().from(publishers).orderBy(asc(publishers.name));

        await db.insert(games).values([
            {
                title: 'Puzzle One',
                description: 'Puzzle',
                starRating: 4.1,
                categoryId: categoryRows.find((row) => row.name === 'Puzzle')!.id,
                publisherId: publisherRows.find((row) => row.name === 'Pub One')!.id,
            },
            {
                title: 'Strategy One',
                description: 'Strategy',
                starRating: 4.5,
                categoryId: strategy.id,
                publisherId: publisher.id,
            },
            {
                title: 'Strategy Two',
                description: 'Strategy',
                starRating: 4.3,
                categoryId: strategy.id,
                publisherId: publisherRows.find((row) => row.name === 'Pub Two')!.id,
            },
        ]);

        const filtered = await getFilteredGames(db, {
            categoryIds: [strategy.id],
            publisherId: publisher.id,
        });

        expect(filtered.map((game) => game.title)).toEqual(['Strategy One']);
    });

    it('returns all games when filters are omitted and none when a selection has no matches', async () => {
        await seedGames(db, 2);

        expect((await getFilteredGames(db)).map((game) => game.title)).toEqual(['Game 01', 'Game 02']);
        expect(await getFilteredGames(db, { categoryIds: [99999] })).toEqual([]);
    });
});

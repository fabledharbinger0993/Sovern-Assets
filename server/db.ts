import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;
const rawDatabaseUrl = process.env.DATABASE_URL?.trim();
const connectionString = rawDatabaseUrl?.startsWith("DATABASE_URL=")
  ? rawDatabaseUrl.slice("DATABASE_URL=".length)
  : rawDatabaseUrl;

export const pool = connectionString
  ? new Pool({ connectionString })
  : null;

export const db = pool
  ? drizzle(pool, { schema })
  : null;

export async function ensureDatabaseSchema(): Promise<boolean> {
  if (!pool) return false;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS belief_nodes (
        id SERIAL PRIMARY KEY,
        stance TEXT NOT NULL,
        domain TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        weight INTEGER NOT NULL DEFAULT 5,
        is_core BOOLEAN NOT NULL DEFAULT TRUE,
        revision_count INTEGER NOT NULL DEFAULT 0,
        coherence_score REAL NOT NULL DEFAULT 0,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS logic_entries (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        topic TEXT NOT NULL,
        paradigm_weight INTEGER NOT NULL,
        debate_transcript TEXT NOT NULL,
        resolution TEXT NOT NULL,
        user_query TEXT NOT NULL DEFAULT '',
        complexity_category TEXT NOT NULL DEFAULT 'moderate',
        paradigm_routing TEXT NOT NULL DEFAULT 'balanced',
        engagement_strategy TEXT NOT NULL DEFAULT 'single_debate',
        congress_perspectives JSONB NOT NULL DEFAULT '[]'::jsonb,
        profound_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
        final_reasoning TEXT NOT NULL DEFAULT ''
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        core_insight TEXT NOT NULL,
        supporting_evidence JSONB NOT NULL,
        tags JSONB NOT NULL,
        confidence_score INTEGER NOT NULL,
        paradigm_routing TEXT NOT NULL DEFAULT 'balanced',
        congress_engaged BOOLEAN NOT NULL DEFAULT FALSE,
        human_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
        self_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
        learned_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
        research_notes TEXT NOT NULL DEFAULT ''
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        logic_entry_id INTEGER,
        memory_entry_id INTEGER,
        tokens INTEGER DEFAULT 0,
        is_typing BOOLEAN DEFAULT FALSE
      );
    `);

    return true;
  } catch (error) {
    console.error("Database schema bootstrap failed; falling back to memory storage", error);
    return false;
  }
}

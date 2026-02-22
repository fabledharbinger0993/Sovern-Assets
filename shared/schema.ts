import { pgTable, text, serial, timestamp, boolean, integer, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const beliefNodes = pgTable("belief_nodes", {
  id: serial("id").primaryKey(),
  stance: text("stance").notNull(),
  domain: text("domain").notNull(),
  reasoning: text("reasoning").notNull(),
  weight: integer("weight").notNull().default(5),
  isCore: boolean("is_core").notNull().default(true),
  revisionCount: integer("revision_count").notNull().default(0),
  coherenceScore: real("coherence_score").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// --- Chat Messages ---
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  logicEntryId: integer("logic_entry_id"), // Linked Logic
  memoryEntryId: integer("memory_entry_id"), // Linked Memory
  tokens: integer("tokens").default(0), // Tokens used
  isTyping: boolean("is_typing").default(false), // Typing indicator state
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, timestamp: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// --- Logic Entries (Congress Debate) ---
export const logicEntries = pgTable("logic_entries", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  topic: text("topic").notNull(),
  paradigmWeight: integer("paradigm_weight").notNull(),
  debateTranscript: text("debate_transcript").notNull(),
  resolution: text("resolution").notNull(),
  userQuery: text("user_query").notNull().default(""),
  complexityCategory: text("complexity_category").notNull().default("moderate"),
  paradigmRouting: text("paradigm_routing").notNull().default("balanced"),
  engagementStrategy: text("engagement_strategy").notNull().default("single_debate"),
  congressPerspectives: jsonb("congress_perspectives").notNull().default(sql`'[]'::jsonb`),
  profoundInsights: jsonb("profound_insights").notNull().default(sql`'[]'::jsonb`),
  finalReasoning: text("final_reasoning").notNull().default(""),
});

export const insertLogicEntrySchema = createInsertSchema(logicEntries).omit({ id: true, timestamp: true });
export type InsertLogicEntry = z.infer<typeof insertLogicEntrySchema>;
export type LogicEntry = typeof logicEntries.$inferSelect;

// --- Memory Entries (Insights) ---
export const memoryEntries = pgTable("memory_entries", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  coreInsight: text("core_insight").notNull(),
  supportingEvidence: jsonb("supporting_evidence").notNull(), // Array of strings
  tags: jsonb("tags").notNull(), // Array of strings
  confidenceScore: integer("confidence_score").notNull(), // 0-100
  paradigmRouting: text("paradigm_routing").notNull().default("balanced"),
  congressEngaged: boolean("congress_engaged").notNull().default(false),
  humanInsights: jsonb("human_insights").notNull().default(sql`'[]'::jsonb`),
  selfInsights: jsonb("self_insights").notNull().default(sql`'[]'::jsonb`),
  learnedPatterns: jsonb("learned_patterns").notNull().default(sql`'[]'::jsonb`),
  researchNotes: text("research_notes").notNull().default(""),
});

export const insertMemoryEntrySchema = createInsertSchema(memoryEntries).omit({ id: true, timestamp: true });
export type InsertMemoryEntry = z.infer<typeof insertMemoryEntrySchema>;
export type MemoryEntry = typeof memoryEntries.$inferSelect;

export const insertBeliefNodeSchema = createInsertSchema(beliefNodes).omit({ id: true, lastUpdated: true });
export type InsertBeliefNode = z.infer<typeof insertBeliefNodeSchema>;
export type BeliefNode = typeof beliefNodes.$inferSelect;

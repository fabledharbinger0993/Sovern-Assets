import { db } from "./db";
import { beliefNodes, chatMessages, logicEntries, memoryEntries, type InsertBeliefNode, type InsertChatMessage, type InsertLogicEntry, type InsertMemoryEntry } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Chat
  getMessages(): Promise<typeof chatMessages.$inferSelect[]>;
  createMessage(msg: InsertChatMessage): Promise<typeof chatMessages.$inferSelect>;
  updateMessageLinks(id: number, logicId: number, memoryId: number): Promise<void>;
  getStats(): Promise<{ totalMessages: number, userMessages: number, sovernMessages: number, totalTokens: number }>;

  // Logic
  getLogicEntries(): Promise<typeof logicEntries.$inferSelect[]>;
  getLogicEntry(id: number): Promise<typeof logicEntries.$inferSelect | undefined>;
  createLogicEntry(entry: InsertLogicEntry): Promise<typeof logicEntries.$inferSelect>;

  // Memory
  getMemoryEntries(): Promise<typeof memoryEntries.$inferSelect[]>;
  getMemoryEntry(id: number): Promise<typeof memoryEntries.$inferSelect | undefined>;
  createMemoryEntry(entry: InsertMemoryEntry): Promise<typeof memoryEntries.$inferSelect>;

  // Beliefs
  getBeliefNodes(): Promise<typeof beliefNodes.$inferSelect[]>;
  createBeliefNode(node: InsertBeliefNode): Promise<typeof beliefNodes.$inferSelect>;
  updateBeliefNode(id: number, changes: Partial<InsertBeliefNode>): Promise<typeof beliefNodes.$inferSelect | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getMessages() {
    return await db.select().from(chatMessages).orderBy(chatMessages.timestamp);
  }
  async createMessage(msg: InsertChatMessage) {
    const [created] = await db.insert(chatMessages).values(msg).returning();
    return created;
  }
  async updateMessageLinks(id: number, logicId: number, memoryId: number) {
    await db.update(chatMessages).set({ logicEntryId: logicId, memoryEntryId: memoryId }).where(eq(chatMessages.id, id));
  }
  async getStats() {
    const messages = await db.select().from(chatMessages);
    return {
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      sovernMessages: messages.filter(m => m.role === 'assistant').length,
      totalTokens: messages.reduce((acc, m) => acc + (m.tokens || 0), 0)
    };
  }
  async getLogicEntries() {
    return await db.select().from(logicEntries).orderBy(desc(logicEntries.timestamp));
  }
  async getLogicEntry(id: number) {
    const [entry] = await db.select().from(logicEntries).where(eq(logicEntries.id, id));
    return entry;
  }
  async createLogicEntry(entry: InsertLogicEntry) {
    const [created] = await db.insert(logicEntries).values(entry).returning();
    return created;
  }
  async getMemoryEntries() {
    return await db.select().from(memoryEntries).orderBy(desc(memoryEntries.timestamp));
  }
  async getMemoryEntry(id: number) {
    const [entry] = await db.select().from(memoryEntries).where(eq(memoryEntries.id, id));
    return entry;
  }
  async createMemoryEntry(entry: InsertMemoryEntry) {
    const [created] = await db.insert(memoryEntries).values(entry).returning();
    return created;
  }

  async getBeliefNodes() {
    return await db.select().from(beliefNodes).orderBy(desc(beliefNodes.weight), beliefNodes.stance);
  }

  async createBeliefNode(node: InsertBeliefNode) {
    const [created] = await db.insert(beliefNodes).values(node).returning();
    return created;
  }

  async updateBeliefNode(id: number, changes: Partial<InsertBeliefNode>) {
    const [updated] = await db
      .update(beliefNodes)
      .set({ ...changes, lastUpdated: new Date() })
      .where(eq(beliefNodes.id, id))
      .returning();
    return updated;
  }
}
export const storage = new DatabaseStorage();

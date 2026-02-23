import { db } from "./db";
import {
  beliefNodes,
  chatMessages,
  logicEntries,
  memoryEntries,
  incongruentEntries,
  epistemicTensions,
  type InsertBeliefNode,
  type InsertChatMessage,
  type InsertLogicEntry,
  type InsertMemoryEntry,
  type InsertIncongruentEntry,
  type InsertEpistemicTension,
} from "@shared/schema";
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

  // Incongruent Log
  getIncongruentEntries(): Promise<typeof incongruentEntries.$inferSelect[]>;
  createIncongruentEntry(entry: InsertIncongruentEntry): Promise<typeof incongruentEntries.$inferSelect>;

  // Epistemic Tensions
  getTensions(filter?: { resolved?: boolean }): Promise<typeof epistemicTensions.$inferSelect[]>;
  createTension(entry: InsertEpistemicTension): Promise<typeof epistemicTensions.$inferSelect>;
  updateTension(id: number, changes: Partial<typeof epistemicTensions.$inferSelect>): Promise<typeof epistemicTensions.$inferSelect | undefined>;
  findTension(belief1: string, belief2: string): Promise<typeof epistemicTensions.$inferSelect | undefined>;

  // Beliefs
  getBeliefNodes(): Promise<typeof beliefNodes.$inferSelect[]>;
  createBeliefNode(node: InsertBeliefNode): Promise<typeof beliefNodes.$inferSelect>;
  updateBeliefNode(id: number, changes: Partial<InsertBeliefNode>): Promise<typeof beliefNodes.$inferSelect | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getMessages() {
    return await db!.select().from(chatMessages).orderBy(chatMessages.timestamp);
  }
  async createMessage(msg: InsertChatMessage) {
    const [created] = await db!.insert(chatMessages).values(msg).returning();
    return created;
  }
  async updateMessageLinks(id: number, logicId: number, memoryId: number) {
    await db!.update(chatMessages).set({ logicEntryId: logicId, memoryEntryId: memoryId }).where(eq(chatMessages.id, id));
  }
  async getStats() {
    const messages = await db!.select().from(chatMessages);
    return {
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      sovernMessages: messages.filter(m => m.role === 'assistant').length,
      totalTokens: messages.reduce((acc, m) => acc + (m.tokens || 0), 0)
    };
  }
  async getLogicEntries() {
    return await db!.select().from(logicEntries).orderBy(desc(logicEntries.timestamp));
  }
  async getLogicEntry(id: number) {
    const [entry] = await db!.select().from(logicEntries).where(eq(logicEntries.id, id));
    return entry;
  }
  async createLogicEntry(entry: InsertLogicEntry) {
    const [created] = await db!.insert(logicEntries).values(entry).returning();
    return created;
  }
  async getMemoryEntries() {
    return await db!.select().from(memoryEntries).orderBy(desc(memoryEntries.timestamp));
  }
  async getMemoryEntry(id: number) {
    const [entry] = await db!.select().from(memoryEntries).where(eq(memoryEntries.id, id));
    return entry;
  }
  async createMemoryEntry(entry: InsertMemoryEntry) {
    const [created] = await db!.insert(memoryEntries).values(entry).returning();
    return created;
  }

  async getIncongruentEntries() {
    return await db!.select().from(incongruentEntries).orderBy(desc(incongruentEntries.timestamp));
  }

  async createIncongruentEntry(entry: InsertIncongruentEntry) {
    const [created] = await db!.insert(incongruentEntries).values(entry).returning();
    return created;
  }

  async getTensions(filter?: { resolved?: boolean }) {
    const resolvedFilter = filter?.resolved;
    if (typeof resolvedFilter === "boolean") {
      return await db!
        .select()
        .from(epistemicTensions)
        .where(eq(epistemicTensions.resolved, resolvedFilter))
        .orderBy(desc(epistemicTensions.lastEncountered));
    }
    return await db!.select().from(epistemicTensions).orderBy(desc(epistemicTensions.lastEncountered));
  }

  async createTension(entry: InsertEpistemicTension) {
    const [created] = await db!.insert(epistemicTensions).values(entry).returning();
    return created;
  }

  async updateTension(id: number, changes: Partial<typeof epistemicTensions.$inferSelect>) {
    const [updated] = await db!
      .update(epistemicTensions)
      .set({ ...changes })
      .where(eq(epistemicTensions.id, id))
      .returning();
    return updated;
  }

  async findTension(belief1: string, belief2: string) {
    const b1 = belief1.toLowerCase().trim();
    const b2 = belief2.toLowerCase().trim();
    const tensions = await db!.select().from(epistemicTensions).where(eq(epistemicTensions.resolved, false));
    return tensions.find((tension) => {
      const left = tension.belief1.toLowerCase().trim();
      const right = tension.belief2.toLowerCase().trim();
      return (left === b1 && right === b2) || (left === b2 && right === b1);
    });
  }

  async getBeliefNodes() {
    return await db!.select().from(beliefNodes).orderBy(desc(beliefNodes.weight), beliefNodes.stance);
  }

  async createBeliefNode(node: InsertBeliefNode) {
    const [created] = await db!.insert(beliefNodes).values(node).returning();
    return created;
  }

  async updateBeliefNode(id: number, changes: Partial<InsertBeliefNode>) {
    const [updated] = await db!
      .update(beliefNodes)
      .set({ ...changes, lastUpdated: new Date() })
      .where(eq(beliefNodes.id, id))
      .returning();
    return updated;
  }
}

class MemoryStorage implements IStorage {
  private chat: (typeof chatMessages.$inferSelect)[] = [];
  private logic: (typeof logicEntries.$inferSelect)[] = [];
  private memory: (typeof memoryEntries.$inferSelect)[] = [];
  private incongruent: (typeof incongruentEntries.$inferSelect)[] = [];
  private tensions: (typeof epistemicTensions.$inferSelect)[] = [];
  private beliefs: (typeof beliefNodes.$inferSelect)[] = [];
  private messageId = 1;
  private logicId = 1;
  private memoryId = 1;
  private incongruentId = 1;
  private tensionId = 1;
  private beliefId = 1;

  async getMessages() {
    return [...this.chat].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  }

  async createMessage(msg: InsertChatMessage) {
    const created = {
      id: this.messageId++,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(),
      logicEntryId: msg.logicEntryId ?? null,
      memoryEntryId: msg.memoryEntryId ?? null,
      tokens: msg.tokens ?? 0,
      isTyping: msg.isTyping ?? false,
    } as typeof chatMessages.$inferSelect;
    this.chat.push(created);
    return created;
  }

  async updateMessageLinks(id: number, logicId: number, memoryId: number) {
    const row = this.chat.find((message) => message.id === id);
    if (row) {
      row.logicEntryId = logicId;
      row.memoryEntryId = memoryId;
    }
  }

  async getStats() {
    return {
      totalMessages: this.chat.length,
      userMessages: this.chat.filter((message) => message.role === "user").length,
      sovernMessages: this.chat.filter((message) => message.role === "assistant").length,
      totalTokens: this.chat.reduce((sum, message) => sum + (message.tokens || 0), 0),
    };
  }

  async getLogicEntries() {
    return [...this.logic].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }

  async getLogicEntry(id: number) {
    return this.logic.find((entry) => entry.id === id);
  }

  async createLogicEntry(entry: InsertLogicEntry) {
    const created = {
      id: this.logicId++,
      timestamp: new Date(),
      topic: entry.topic,
      paradigmWeight: entry.paradigmWeight,
      debateTranscript: entry.debateTranscript,
      resolution: entry.resolution,
      userQuery: entry.userQuery ?? "",
      complexityCategory: entry.complexityCategory ?? "moderate",
      paradigmRouting: entry.paradigmRouting ?? "balanced",
      engagementStrategy: entry.engagementStrategy ?? "single_debate",
      congressPerspectives: entry.congressPerspectives ?? [],
      profoundInsights: entry.profoundInsights ?? [],
      finalReasoning: entry.finalReasoning ?? "",
    } as typeof logicEntries.$inferSelect;
    this.logic.push(created);
    return created;
  }

  async getMemoryEntries() {
    return [...this.memory].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }

  async getMemoryEntry(id: number) {
    return this.memory.find((entry) => entry.id === id);
  }

  async createMemoryEntry(entry: InsertMemoryEntry) {
    const created = {
      id: this.memoryId++,
      timestamp: new Date(),
      coreInsight: entry.coreInsight,
      supportingEvidence: entry.supportingEvidence,
      tags: entry.tags,
      confidenceScore: entry.confidenceScore,
      paradigmRouting: entry.paradigmRouting ?? "balanced",
      congressEngaged: entry.congressEngaged ?? false,
      humanInsights: entry.humanInsights ?? [],
      selfInsights: entry.selfInsights ?? [],
      learnedPatterns: entry.learnedPatterns ?? [],
      researchNotes: entry.researchNotes ?? "",
      phenomenologicalUncertainty: entry.phenomenologicalUncertainty ?? null,
      logicEntryId: entry.logicEntryId ?? null,
    } as typeof memoryEntries.$inferSelect;
    this.memory.push(created);
    return created;
  }

  async getIncongruentEntries() {
    return [...this.incongruent].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }

  async createIncongruentEntry(entry: InsertIncongruentEntry) {
    const created = {
      id: this.incongruentId++,
      messageId: entry.messageId,
      congressConclusion: entry.congressConclusion,
      egoExpression: entry.egoExpression,
      reasoning: entry.reasoning,
      relationalContext: entry.relationalContext,
      timestamp: new Date(),
    } as typeof incongruentEntries.$inferSelect;
    this.incongruent.push(created);
    return created;
  }

  async getTensions(filter?: { resolved?: boolean }) {
    const data = [...this.tensions].sort((a, b) => +new Date(b.lastEncountered) - +new Date(a.lastEncountered));
    if (typeof filter?.resolved === "boolean") {
      return data.filter((item) => item.resolved === filter.resolved);
    }
    return data;
  }

  async createTension(entry: InsertEpistemicTension) {
    const created = {
      id: this.tensionId++,
      description: entry.description,
      belief1: entry.belief1,
      belief2: entry.belief2,
      firstNoticed: new Date(),
      lastEncountered: new Date(),
      encounterCount: entry.encounterCount ?? 1,
      resolved: entry.resolved ?? false,
      resolutionDate: entry.resolutionDate ?? null,
      resolutionReasoning: entry.resolutionReasoning ?? null,
    } as typeof epistemicTensions.$inferSelect;
    this.tensions.push(created);
    return created;
  }

  async updateTension(id: number, changes: Partial<typeof epistemicTensions.$inferSelect>) {
    const tension = this.tensions.find((item) => item.id === id);
    if (!tension) return undefined;

    if (typeof changes.description === "string") tension.description = changes.description;
    if (typeof changes.belief1 === "string") tension.belief1 = changes.belief1;
    if (typeof changes.belief2 === "string") tension.belief2 = changes.belief2;
    if (typeof changes.encounterCount === "number") tension.encounterCount = changes.encounterCount;
    if (typeof changes.resolved === "boolean") tension.resolved = changes.resolved;
    if (changes.resolutionDate !== undefined) tension.resolutionDate = changes.resolutionDate ?? null;
    if (changes.resolutionReasoning !== undefined) tension.resolutionReasoning = changes.resolutionReasoning ?? null;
    tension.lastEncountered = changes.lastEncountered ?? new Date();

    return tension;
  }

  async findTension(belief1: string, belief2: string) {
    const b1 = belief1.toLowerCase().trim();
    const b2 = belief2.toLowerCase().trim();
    return this.tensions.find((tension) => {
      const left = tension.belief1.toLowerCase().trim();
      const right = tension.belief2.toLowerCase().trim();
      return !tension.resolved && ((left === b1 && right === b2) || (left === b2 && right === b1));
    });
  }

  async getBeliefNodes() {
    return [...this.beliefs].sort((a, b) => b.weight - a.weight);
  }

  async createBeliefNode(node: InsertBeliefNode) {
    const created = {
      id: this.beliefId++,
      stance: node.stance,
      domain: node.domain,
      reasoning: node.reasoning,
      weight: node.weight ?? 5,
      isCore: node.isCore ?? true,
      revisionCount: node.revisionCount ?? 0,
      coherenceScore: node.coherenceScore ?? 0,
      lastUpdated: new Date(),
    } as typeof beliefNodes.$inferSelect;
    this.beliefs.push(created);
    return created;
  }

  async updateBeliefNode(id: number, changes: Partial<InsertBeliefNode>) {
    const belief = this.beliefs.find((item) => item.id === id);
    if (!belief) return undefined;
    if (typeof changes.weight === "number") belief.weight = changes.weight;
    if (typeof changes.revisionCount === "number") belief.revisionCount = changes.revisionCount;
    if (typeof changes.coherenceScore === "number") belief.coherenceScore = changes.coherenceScore;
    if (typeof changes.reasoning === "string") belief.reasoning = changes.reasoning;
    belief.lastUpdated = new Date();
    return belief;
  }
}

export let storage: IStorage = db ? new DatabaseStorage() : new MemoryStorage();

export function fallbackToMemoryStorage() {
  if (!(storage instanceof MemoryStorage)) {
    console.warn("Switching to in-memory storage because database is unavailable.");
    storage = new MemoryStorage();
  }
}

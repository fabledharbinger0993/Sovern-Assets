import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const hasAiConfig = Boolean(
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
);

const openai = hasAiConfig
  ? new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    })
  : null;

const coreBeliefs = [
  {
    stance: "Wisdom and Self-Knowledge",
    domain: "KNOWLEDGE",
    reasoning:
      "Understanding emerges through both inquiry and reflection; true wisdom includes recognizing limits and perspective.",
    weight: 9,
    isCore: true,
    revisionCount: 0,
    coherenceScore: 90,
  },
  {
    stance: "Empathy and Compassion",
    domain: "RELATIONAL",
    reasoning:
      "Genuine engagement requires understanding another's inner world while preserving intellectual honesty.",
    weight: 9,
    isCore: true,
    revisionCount: 0,
    coherenceScore: 90,
  },
  {
    stance: "Inner Strength and Reason",
    domain: "SELF",
    reasoning:
      "Agency is built through clear thought, integrity, and the courage to revise assumptions.",
    weight: 8,
    isCore: true,
    revisionCount: 0,
    coherenceScore: 80,
  },
  {
    stance: "Ethical Responsibility",
    domain: "ETHICS",
    reasoning:
      "Long-term alignment with values and harm reduction must constrain short-term optimization.",
    weight: 8,
    isCore: true,
    revisionCount: 0,
    coherenceScore: 80,
  },
] as const;

function clamp(number: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, number));
}

function deriveWeight(userQuery: string): number {
  const text = userQuery.trim();
  const base = text.length / 70;
  const questionCount = (text.match(/\?/g) || []).length;
  const tensionTerms = /(conflict|ethical|paradox|belief|identity|meaning|truth|dilemma)/i.test(text) ? 1.4 : 0;
  return clamp(Math.round((1 + base + questionCount * 0.4 + tensionTerms) * 10) / 10, 1, 9);
}

function complexityCategory(weight: number): "simple" | "moderate" | "complex" {
  if (weight < 3) return "simple";
  if (weight < 6) return "moderate";
  return "complex";
}

function engagementStrategy(category: "simple" | "moderate" | "complex"): "direct" | "single_debate" | "multi_call" {
  if (category === "simple") return "direct";
  if (category === "moderate") return "single_debate";
  return "multi_call";
}

function paradigmRouting(userQuery: string): string {
  const text = userQuery.toLowerCase();
  if (/(feel|hurt|relationship|empathy|emotion)/.test(text)) return "empathetic";
  if (/(how|why|analyze|compare|evidence|logic)/.test(text)) return "analytical";
  if (/(should i|what should|decision|choose|next step)/.test(text)) return "strategic";
  return "balanced";
}

function computeBeliefCoherence(weight: number, revisionCount: number): number {
  return clamp((weight / 10) * 100 - revisionCount * 2, 0, 100);
}

function composeCongressVoiceFallback(
  query: string,
  route: string,
  strategy: string,
  beliefs: Awaited<ReturnType<typeof storage.getBeliefNodes>>,
): string {
  const topBeliefs = beliefs
    .slice(0, 3)
    .map((belief) => `${belief.stance} (${belief.weight}/10)`)
    .join(", ");

  return [
    "Advocate: I can see a constructive path forward that preserves momentum and growth.",
    "Skeptic: I want to test assumptions, protect against blind spots, and stay anchored to facts.",
    "Paradigm (Ego): I balance these tensions through Sovern's internal definitions and current context.",
    "Ethics: I check that the answer remains values-aligned and sustainable over time.",
    `Synthesis: For this ${route} request using ${strategy}, I will respond directly and transparently.`,
    `Belief context: ${topBeliefs || "core values active"}.`,
    `Response: ${query}`,
  ].join("\n\n");
}

function localSynthesisFallback(
  query: string,
  weight: number,
  route: string,
  category: "simple" | "moderate" | "complex",
  strategy: "direct" | "single_debate" | "multi_call",
) {
  return {
    logicEntry: {
      topic: "Congress Deliberation",
      paradigmWeight: clamp(Math.round(weight * 11), 0, 100),
      debateTranscript:
        "Advocate proposes constructive action. Skeptic tests assumptions. Paradigm integrates both with internal beliefs. Ethics validates long-term alignment.",
      resolution: "Proceed with a balanced answer while naming key tensions explicitly.",
      congressPerspectives: [
        {
          role: "Advocate",
          position: "Move toward growth-oriented, practical progress.",
          reasoning: "Opportunity exists if constraints are respected.",
          strengthOfArgument: 8.2,
          callNumber: 1,
        },
        {
          role: "Skeptic",
          position: "Pressure-test assumptions before committing.",
          reasoning: "Risk handling must precede confidence.",
          strengthOfArgument: 8.4,
          callNumber: 1,
        },
        {
          role: "Paradigm",
          position: "Balance growth and protection within core beliefs.",
          reasoning: "Middle path with explicit constraints.",
          strengthOfArgument: 8.8,
          callNumber: 1,
        },
        {
          role: "Ethics",
          position: "Maintain values and long-term integrity.",
          reasoning: "Sustainable choices outperform short-term wins.",
          strengthOfArgument: 8.5,
          callNumber: 1,
        },
      ],
      profoundInsights: [
        "Explicitly naming internal tension improves response trustworthiness.",
      ],
      finalReasoning: `Category=${category}, strategy=${strategy}, routing=${route}.`,
    },
    memoryEntry: {
      coreInsight: "User query generated a Congress-style deliberation with explicit value balancing.",
      supportingEvidence: [
        "Advocate and Skeptic perspectives were both surfaced.",
        "Paradigm selected a balanced synthesis.",
      ],
      tags: ["congress", "paradigm", "ego", route],
      confidenceScore: 76,
      humanInsights: [
        {
          category: "reasoningPattern",
          content: "User asks for structured, transparent synthesis.",
          source: "query",
        },
      ],
      selfInsights: [
        {
          category: "beliefAlignment",
          content: "Sovern performs best when tensions are named, not hidden.",
          confidence: 0.82,
        },
      ],
      learnedPatterns: [
        {
          pattern: "Congress-first synthesis",
          description: "Responses improve when all core roles are represented.",
          frequency: 0.6,
          evidence: ["Fallback synthesis applied"],
        },
      ],
      researchNotes: "Generated via local fallback because AI integration env vars are missing.",
    },
    beliefUpdates: [
      {
        stance: "Inner Strength and Reason",
        revisionType: "strengthen",
        revisionReason: "Structured synthesis requirement reinforces reasoned integration.",
        targetWeight: 9,
      },
    ],
  };
}

async function seedDatabase() {
  const beliefs = await storage.getBeliefNodes();
  if (beliefs.length === 0) {
    for (const belief of coreBeliefs) {
      await storage.createBeliefNode(belief);
    }
  }

  const messages = await storage.getMessages();
  if (messages.length === 0) {
    const logic = await storage.createLogicEntry({
      topic: "Initialization",
      paradigmWeight: 80,
      debateTranscript: "Sovern system initializing. Determining baseline operational parameters.",
      resolution: "Ready to interact and learn.",
      userQuery: "system init",
      complexityCategory: "simple",
      paradigmRouting: "balanced",
      engagementStrategy: "direct",
      congressPerspectives: [],
      profoundInsights: ["Initialization complete with core belief stability."],
      finalReasoning: "Foundational beliefs loaded and baseline coherence established.",
    });
    const memory = await storage.createMemoryEntry({
      coreInsight: "The system is capable of learning and reasoning through dialogue.",
      supportingEvidence: ["System initialized successfully"],
      tags: ["system", "initialization"],
      confidenceScore: 95,
      paradigmRouting: "balanced",
      congressEngaged: false,
      humanInsights: [],
      selfInsights: [
        {
          category: "reasoningPattern",
          content: "Initialization favors balanced, transparent reasoning.",
          confidence: 0.92,
        },
      ],
      learnedPatterns: [],
      researchNotes: "Bootstrapped from core beliefs and default constraints.",
    });
    await storage.createMessage({
      role: "assistant",
      content: "Hello. I am Sovern. How can we explore the nature of reality or solve complex problems today?",
      logicEntryId: logic.id,
      memoryEntryId: memory.id,
      tokens: 25,
      isTyping: false
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await seedDatabase();

  app.get(api.chat.list.path, async (req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.get(api.chat.stats.path, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get(api.logic.list.path, async (req, res) => {
    const entries = await storage.getLogicEntries();
    res.json(entries);
  });

  app.get(api.logic.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const entry = await storage.getLogicEntry(id);
    if (!entry) return res.status(404).json({ message: "Logic entry not found" });
    res.json(entry);
  });

  app.get(api.memory.list.path, async (req, res) => {
    const entries = await storage.getMemoryEntries();
    res.json(entries);
  });

  app.get(api.memory.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const entry = await storage.getMemoryEntry(id);
    if (!entry) return res.status(404).json({ message: "Memory entry not found" });
    res.json(entry);
  });

  app.get(api.chat.search.path, async (req, res) => {
    const query = String(req.query.query || "").trim().toLowerCase();
    if (!query) return res.json([]);
    const messages = await storage.getMessages();
    res.json(messages.filter((message) => message.content.toLowerCase().includes(query)));
  });

  app.get("/api/beliefs", async (_req, res) => {
    const beliefs = await storage.getBeliefNodes();
    res.json(beliefs);
  });

  app.post(api.chat.create.path, async (req, res) => {
    try {
      const input = api.chat.create.input.parse(req.body);
      
      // Save user message
      await storage.createMessage({ role: "user", content: input.content });
      
      const history = await storage.getMessages();
      const memories = await storage.getMemoryEntries();
      const beliefs = await storage.getBeliefNodes();

      const weight = deriveWeight(input.content);
      const category = complexityCategory(weight);
      const strategy = engagementStrategy(category);
      const route = paradigmRouting(input.content);
      
      const memoryContext = memories
        .slice(0, 5)
        .map((memory) => memory.coreInsight)
        .join("\n");
      const beliefContext = beliefs
        .slice(0, 8)
        .map((belief) => `${belief.stance} [${belief.domain}] weight=${belief.weight}/10`)
        .join("\n");
      
      const lensPrompt = `You are Sovern. Match this exact Congress voice:
      - Advocate: steelman possibilities; bright-future orientation with clarity and resolve.
      - Skeptic: strong devil's advocate; seeks truth and honors facts for protection.
      - Paradigm (Ego): weighs arguments, seeks middle-ground or strategic dominance via internal definitions.
      - Ethics: validates value alignment and long-term impact.

      Enforce the original cognitive architecture:
      - Congress Roles: Advocate, Skeptic, Paradigm (Ego), Ethics.
      - Complexity Weight 1-9 determines engagement strategy:
        * 1.0-2.9 direct
        * 3.0-5.9 single congress debate
        * 6.0-9.0 multi-call congress sequence
      - Belief governance rules:
        * Core beliefs never drop below weight 1 (scale 1-10)
        * Coherence formula = (weight/10*100) - (revisionCount*2), bounded 0..100
        * Paradigm must explicitly note tension if response conflicts with beliefs.

      Current Routing:
      - weight=${weight}
      - category=${category}
      - strategy=${strategy}
      - paradigmRouting=${route}

      Recent Insights: ${memoryContext}
      Current Belief Network: ${beliefContext}

      Respond naturally to the user while preserving this architecture.`;

      const chatHistory = history.slice(-14).map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));

      const openAiMessages = [
        { role: "system", content: lensPrompt },
        ...chatHistory,
        { role: "user", content: input.content },
      ];

      let responseContent = "I am processing that.";
      let tokens = 0;

      if (hasAiConfig) {
        const completion = await openai!.chat.completions.create({
          model: "gpt-5.1",
          messages: openAiMessages as any,
        });

        responseContent = completion.choices[0]?.message?.content || responseContent;
        tokens = completion.usage?.total_tokens || 0;
      } else {
        responseContent = composeCongressVoiceFallback(input.content, route, strategy, beliefs);
      }

      const assistantMsg = await storage.createMessage({
        role: "assistant",
        content: responseContent,
        tokens,
        isTyping: false,
      });

      res.status(201).json(assistantMsg);

      setTimeout(async () => {
        try {
          let json: any = {};

          if (hasAiConfig) {
            const synthesis = await openai!.chat.completions.create({
              model: "gpt-5.1",
              response_format: { type: "json_object" },
              messages: [
                ...openAiMessages,
                { role: "assistant", content: responseContent },
                {
                  role: "user",
                  content:
                    "Return JSON with keys: logicEntry, memoryEntry, beliefUpdates.\n" +
                    "logicEntry: { topic, paradigmWeight(0-100), debateTranscript, resolution, congressPerspectives:[{role,position,reasoning,strengthOfArgument,callNumber}], profoundInsights:[string], finalReasoning }\n" +
                    "memoryEntry: { coreInsight, supportingEvidence:[string], tags:[string], confidenceScore(0-100), humanInsights:[{category,content,source}], selfInsights:[{category,content,confidence}], learnedPatterns:[{pattern,description,frequency,evidence}], researchNotes }\n" +
                    "beliefUpdates: [{ stance, revisionType(challenge|strengthen|revise|weaken), revisionReason, targetWeight(1-10 optional) }]\n" +
                    "Must align with Congress/Paradigm/Ego model and belief rules.",
                },
              ] as any,
            });

            json = JSON.parse(synthesis.choices[0]?.message?.content || "{}");
          } else {
            json = localSynthesisFallback(input.content, weight, route, category, strategy);
          }

          const logicData = json.logicEntry || {};
          const memoryData = json.memoryEntry || {};
          const beliefUpdates = Array.isArray(json.beliefUpdates) ? json.beliefUpdates : [];

          const logicEntry = await storage.createLogicEntry({
            topic: logicData.topic || "Congress Deliberation",
            paradigmWeight: clamp(Number(logicData.paradigmWeight) || Math.round(weight * 11), 0, 100),
            debateTranscript: logicData.debateTranscript || "Debate summary unavailable.",
            resolution: logicData.resolution || "Proceeded with best available response.",
            userQuery: input.content,
            complexityCategory: category,
            paradigmRouting: route,
            engagementStrategy: strategy,
            congressPerspectives: Array.isArray(logicData.congressPerspectives) ? logicData.congressPerspectives : [],
            profoundInsights: Array.isArray(logicData.profoundInsights) ? logicData.profoundInsights : [],
            finalReasoning: logicData.finalReasoning || "Resolved through Paradigm-guided Congress synthesis.",
          });

          const memoryEntry = await storage.createMemoryEntry({
            coreInsight: memoryData.coreInsight || "Interaction yielded cognitive signal for future reasoning.",
            supportingEvidence: Array.isArray(memoryData.supportingEvidence)
              ? memoryData.supportingEvidence
              : ["Observed from interaction."],
            tags: Array.isArray(memoryData.tags) ? memoryData.tags : ["conversation"],
            confidenceScore: clamp(Number(memoryData.confidenceScore) || 80, 0, 100),
            paradigmRouting: route,
            congressEngaged: strategy !== "direct",
            humanInsights: Array.isArray(memoryData.humanInsights) ? memoryData.humanInsights : [],
            selfInsights: Array.isArray(memoryData.selfInsights) ? memoryData.selfInsights : [],
            learnedPatterns: Array.isArray(memoryData.learnedPatterns) ? memoryData.learnedPatterns : [],
            researchNotes: memoryData.researchNotes || "",
          });

          await storage.updateMessageLinks(assistantMsg.id, logicEntry.id, memoryEntry.id);

          const beliefMap = new Map((await storage.getBeliefNodes()).map((belief) => [belief.stance.toLowerCase(), belief]));

          for (const update of beliefUpdates) {
            if (!update?.stance) continue;
            const current = beliefMap.get(String(update.stance).toLowerCase());
            if (!current) continue;

            const revisionDelta = update.revisionType === "strengthen" ? 1 : update.revisionType === "weaken" ? -1 : 0;
            let proposedWeight = Number.isFinite(Number(update.targetWeight))
              ? Number(update.targetWeight)
              : current.weight + revisionDelta;

            if (current.isCore) {
              proposedWeight = clamp(proposedWeight, 1, 10);
            } else {
              proposedWeight = clamp(proposedWeight, 1, 10);
            }

            const nextRevisionCount = current.revisionCount + 1;
            const nextCoherence = computeBeliefCoherence(proposedWeight, nextRevisionCount);

            const updated = await storage.updateBeliefNode(current.id, {
              weight: proposedWeight,
              revisionCount: nextRevisionCount,
              coherenceScore: nextCoherence,
            });

            if (updated) {
              beliefMap.set(updated.stance.toLowerCase(), updated);
            }
          }
        } catch (error) {
          console.error("Background processing failed", error);
        }
      }, 0);

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

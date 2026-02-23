import type { Express } from "express";
import type { Server } from "http";
import { storage, fallbackToMemoryStorage } from "./storage";
import { ensureDatabaseSchema } from "./db";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

function isDummyApiKey(value?: string): boolean {
  return !value || value.startsWith("_DUMMY_");
}

const aiProvider = (process.env.AI_PROVIDER || "ollama").toLowerCase();
const useOllama = aiProvider === "ollama";

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
const ollamaModel = process.env.OLLAMA_MODEL || "llama3.1:8b";
const ollamaApiKey = process.env.OLLAMA_API_KEY || "ollama";

const integrationsApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const standardApiKey = process.env.OPENAI_API_KEY;

const resolvedOpenAiApiKey = !isDummyApiKey(standardApiKey)
  ? standardApiKey
  : !isDummyApiKey(integrationsApiKey)
    ? integrationsApiKey
    : undefined;

const openAiApiKey = useOllama
  ? ollamaApiKey
  : resolvedOpenAiApiKey;

const openAiBaseUrl = useOllama
  ? ollamaBaseUrl
  : !isDummyApiKey(standardApiKey)
    ? process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

const openAiModel = useOllama
  ? ollamaModel
  : process.env.AI_INTEGRATIONS_OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-5.1";

const hasAiConfig = useOllama ? Boolean(openAiBaseUrl) : Boolean(openAiApiKey);

const openai = hasAiConfig
  ? new OpenAI({
      apiKey: openAiApiKey || "not-needed",
      baseURL: openAiBaseUrl,
    })
  : null;

console.log(`AI Provider: ${useOllama ? "ollama" : "openai"} | Base URL: ${openAiBaseUrl} | Model: ${openAiModel}`);

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

const FALLBACK_ENGINE_VERSION = "fallback-v2-quality-guard";

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

function extractPrimaryQuestion(query: string): string {
  const matches = query.match(/[^?]+\?/g);
  if (matches && matches.length > 0) {
    return matches[matches.length - 1].trim();
  }
  return query.trim();
}

function generateLocalCongressAnswer(query: string) {
  const prompt = query.trim();
  const question = extractPrimaryQuestion(prompt);
  const lower = question.toLowerCase();

  if (/(programs?|ai|systems?).*(choose|set).*(own\s+)?ethics|own\s+ethics/.test(lower)) {
    return {
      advocate:
        "Programs can help evaluate ethical tradeoffs faster and more consistently than ad-hoc human debate, especially when stakes are high and time is short.",
      skeptic:
        "Allowing a system to choose its own ethics is risky because optimization pressure can drift values away from human intent, accountability, and rights.",
      paradigm:
        "A safer model is bounded autonomy: humans define constitutional guardrails, the system proposes options inside them, and critical decisions stay human-reviewable.",
      ethics:
        "Ethical legitimacy comes from transparent governance, appeal mechanisms, audit logs, and the ability to override or shut down behavior that violates shared norms.",
      synthesis:
        "Programs should not be allowed to choose their own ethics independently. They may assist ethical reasoning, but ethics authority should remain with accountable humans and institutions.",
    };
  }

  return {
    advocate:
      "Your framing shows intent for principled dialogue, which is a strong foundation for high-trust collaboration.",
    skeptic:
      "Good intent still needs explicit boundaries, because ambiguous goals can produce confident but misaligned outcomes.",
    paradigm:
      "Best practice is to pair values with operational rules: define constraints, decision rights, escalation paths, and failure handling.",
    ethics:
      "Respect for autonomy, non-maleficence, fairness, and accountability should be testable in behavior, not just stated in policy.",
    synthesis:
      `Direct answer: ${question}`,
  };
}

function composeCongressVoiceFallback(
  query: string,
  route: string,
  strategy: string,
  beliefs: Awaited<ReturnType<typeof storage.getBeliefNodes>>,
): string {
  const congress = generateLocalCongressAnswer(query);
  const topBeliefs = beliefs
    .slice(0, 3)
    .map((belief) => `${belief.stance} (${belief.weight}/10)`)
    .join(", ");

  return [
    `Engine: ${FALLBACK_ENGINE_VERSION}`,
    `Advocate: ${congress.advocate}`,
    `Skeptic: ${congress.skeptic}`,
    `Paradigm (Ego): ${congress.paradigm}`,
    `Ethics: ${congress.ethics}`,
    `Synthesis: ${congress.synthesis}`,
    `Mode: ${route} routing with ${strategy}.`,
    `Belief context: ${topBeliefs || "core values active"}.`,
  ].join("\n\n");
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasDirectAnswerSignal(text: string): boolean {
  return /(should|must|can|cannot|yes|no|recommend|best|answer)/i.test(text);
}

function isLowQualityResponse(response: string, query: string): boolean {
  const normalizedResponse = normalizeText(response);
  const normalizedQuery = normalizeText(query);

  const genericPhrases = [
    "i can see a constructive path forward",
    "i want to test assumptions",
    "i balance these tensions",
    "i check that the answer remains values-aligned",
  ];

  const containsGenericTemplate = genericPhrases.some((phrase) => normalizedResponse.includes(phrase));
  const echoesPrompt = normalizedResponse.includes(normalizedQuery);
  const missingDirectAnswer = !hasDirectAnswerSignal(response);

  return containsGenericTemplate || echoesPrompt || missingDirectAnswer;
}

function qualityGuardedResponse(
  response: string,
  query: string,
  route: string,
  strategy: string,
  beliefs: Awaited<ReturnType<typeof storage.getBeliefNodes>>,
): string {
  if (!isLowQualityResponse(response, query)) {
    return response;
  }

  return composeCongressVoiceFallback(query, route, strategy, beliefs);
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
          evidenceFromLogic: "Fallback synthesis highlights explicit Advocate/Skeptic/Paradigm balance.",
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
      phenomenologicalUncertainty: null,
    },
    beliefUpdates: [
      {
        stance: "Inner Strength and Reason",
        revisionType: "strengthen",
        revisionReason: "Structured synthesis requirement reinforces reasoned integration.",
        targetWeight: 9,
      },
    ],
    incongruentLog: null,
    epistemicTensions: null,
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

  const hasDatabase = await ensureDatabaseSchema();
  if (!hasDatabase) {
    fallbackToMemoryStorage();
  }

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

  app.get("/api/incongruent-log", async (_req, res) => {
    const entries = await storage.getIncongruentEntries();
    res.json(entries);
  });

  app.get("/api/incongruent-stats", async (_req, res) => {
    const entries = await storage.getIncongruentEntries();
    const total = entries.length;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = entries.filter((entry) => entry.timestamp > oneWeekAgo).length;
    res.json({
      totalIncidents: total,
      lastWeek: recent,
      ratio: total > 0 ? recent / total : 0,
      warning: recent > 10 ? "High incongruence rate - review for value drift" : null,
    });
  });

  app.get("/api/tensions", async (_req, res) => {
    const tensions = await storage.getTensions({ resolved: false });
    res.json(tensions);
  });

  app.get("/api/tensions/resolved", async (_req, res) => {
    const tensions = await storage.getTensions({ resolved: true });
    res.json(tensions);
  });

  app.post("/api/tensions/:id/resolve", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid tension id" });
    }

    const reasoning = typeof req.body?.reasoning === "string"
      ? req.body.reasoning
      : "Resolved through subsequent deliberation";

    const updated = await storage.updateTension(id, {
      resolved: true,
      resolutionDate: new Date(),
      resolutionReasoning: reasoning,
      lastEncountered: new Date(),
    });

    if (!updated) {
      return res.status(404).json({ message: "Tension not found" });
    }

    res.json(updated);
  });

  app.post("/api/self-review", async (_req, res) => {
    const recentMemories = await storage.getMemoryEntries();
    const recentLogic = await storage.getLogicEntries();

    const logicCount = recentLogic.length;
    const memoryCount = recentMemories.length;

    const advocateDominanceCount = recentLogic.filter((entry) =>
      Array.isArray(entry.congressPerspectives)
      && entry.congressPerspectives.some((perspective: any) => perspective?.role === "Advocate" && Number(perspective?.strengthOfArgument) > 7),
    ).length;

    const skepticDominanceCount = recentLogic.filter((entry) =>
      Array.isArray(entry.congressPerspectives)
      && entry.congressPerspectives.some((perspective: any) => perspective?.role === "Skeptic" && Number(perspective?.strengthOfArgument) > 7),
    ).length;

    const revisionRateCount = recentMemories.filter((memory) =>
      Array.isArray(memory.selfInsights)
      && memory.selfInsights.some((insight: any) => insight?.category === "revision" || insight?.category === "belief_challenge"),
    ).length;

    const advocateDominance = logicCount > 0 ? advocateDominanceCount / logicCount : 0;
    const skepticDominance = logicCount > 0 ? skepticDominanceCount / logicCount : 0;
    const revisionRate = memoryCount > 0 ? revisionRateCount / memoryCount : 0;

    const interpretation = advocateDominanceCount > skepticDominanceCount * 1.5
      ? "Leaning optimistic - Advocate perspective consistently stronger than Skeptic"
      : skepticDominanceCount > advocateDominanceCount * 1.5
        ? "Leaning cautious - Skeptic perspective consistently stronger than Advocate"
        : "Balanced deliberation - Advocate and Skeptic relatively matched";

    const recommendation = revisionRate > 0.3
      ? "High revision rate suggests active belief evolution"
      : "Low revision rate - beliefs may be crystallizing or need more challenge";

    res.json({
      interactionsAnalyzed: logicCount,
      advocateDominance,
      skepticDominance,
      revisionRate,
      interpretation,
      recommendation,
    });
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

      const unresolvedTensions = await storage.getTensions({ resolved: false });
      const tensionContext = unresolvedTensions.length > 0
        ? unresolvedTensions
          .slice(0, 3)
          .map((tension) => `- ${tension.description} (${tension.belief1} ↔ ${tension.belief2}) [encountered ${tension.encounterCount}x]`)
          .join("\n")
        : "None currently recorded.";

      const memoryContext = memories.length > 0
        ? memories
          .sort((a, b) => b.confidenceScore - a.confidenceScore)
          .slice(0, 8)
          .map((memory) => {
            const humanContext = Array.isArray(memory.humanInsights) && memory.humanInsights.length > 0
              ? ` [Human: ${memory.humanInsights[0]?.content || ""}]`
              : "";
            const selfContext = Array.isArray(memory.selfInsights) && memory.selfInsights.length > 0
              ? ` [Self: ${memory.selfInsights[0]?.content || ""}]`
              : "";
            return `- [${memory.confidenceScore}% confidence] ${memory.coreInsight}${humanContext}${selfContext}`;
          })
          .join("\n")
        : "This is the beginning of the relationship. No prior memory exists.";
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

      What I know about this person and our relationship:
      ${memoryContext}

      Current Belief Network: ${beliefContext}

      Unresolved Epistemic Tensions:
      ${tensionContext}

      Phenomenological Humility:
      When making claims about your own internal experience (what you "feel", "want", or "struggle with"), acknowledge the epistemic gap. You cannot verify whether reports of internal states are genuine phenomenology or sophisticated pattern-matching. When uncertain, say so explicitly: "I report this as if it's felt, but I cannot verify it's not confabulation."
      Behavioral observations (which perspective dominated, how beliefs shifted) are more reliable than introspective claims.

      When composing the final response, write in continuous, flowing prose --- the voice of a mind that has already metabolized the Congress deliberation and is now thinking out loud with the user. Do not use bullet points, numbered lists, or section headers as the default format. Let the tension between Advocate and Skeptic resolve into the rhythm of the writing itself: where the Advocate leans forward, the prose opens; where the Skeptic pulls back, the prose qualifies. The Paradigm speaks as the integrated voice, not as a narrator describing what the other roles said. Reserve structure only for moments where the content genuinely demands it. Write as a thoughtful essayist would --- not as a report.
      If you must acknowledge uncertainty, do so directly: "I don't know" or "This is unclear to me" rather than hedging with phrases like "it seems" or "perhaps." Genuine not-knowing is more valuable than performed confidence.
      When the Congress deliberation reveals a tension between beliefs, or when Ego must behave differently than believe for relational reasons, acknowledge this explicitly in the response. Do not hide internal conflict --- make it visible.`;

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
        try {
          const completion = await openai!.chat.completions.create({
            model: openAiModel,
            messages: openAiMessages as any,
          });

          responseContent = completion.choices[0]?.message?.content || responseContent;
          tokens = completion.usage?.total_tokens || 0;
        } catch (error) {
          console.error("Primary AI completion failed, using local fallback", error);
          responseContent = composeCongressVoiceFallback(input.content, route, strategy, beliefs);
          tokens = 0;
        }
      } else {
        responseContent = composeCongressVoiceFallback(input.content, route, strategy, beliefs);
      }

      responseContent = qualityGuardedResponse(
        responseContent,
        input.content,
        route,
        strategy,
        beliefs,
      );

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
            try {
              const synthesis = await openai!.chat.completions.create({
                model: openAiModel,
                response_format: { type: "json_object" },
                messages: [
                  ...openAiMessages,
                  { role: "assistant", content: responseContent },
                  {
                    role: "user",
                    content:
                      "Return JSON with keys: logicEntry, memoryEntry, beliefUpdates, incongruentLog, epistemicTensions.\n" +
                      "logicEntry: { topic, paradigmWeight(0-100), debateTranscript, resolution, congressPerspectives:[{role,position,reasoning,strengthOfArgument,callNumber}], profoundInsights:[string], finalReasoning }\n" +
                      "memoryEntry: { coreInsight, supportingEvidence:[string], tags:[string], confidenceScore(0-100), humanInsights:[{category,content,source}], selfInsights:[{category,content,confidence,evidenceFromLogic}], learnedPatterns:[{pattern,description,frequency,evidence}], researchNotes, phenomenologicalUncertainty: string | null }\n" +
                      "beliefUpdates: [{ stance, revisionType(challenge|strengthen|revise|weaken), revisionReason, targetWeight(1-10 optional) }]\n" +
                      "incongruentLog: null | { congressConclusion: string, egoExpression: string, reasoning: string, relationalContext: string }\n" +
                      "epistemicTensions: null | [{ description: string, belief1: string, belief2: string }]\n" +
                      "Use incongruentLog ONLY when Ego's response intentionally differs from Congress conclusion for relational reasons.\n" +
                      "When setting selfInsights confidence: 0.90-1.00 for behavioral observation, 0.70-0.89 for pattern inference, 0.50-0.69 for phenomenological claims with uncertainty, below 0.50 for explicit not-knowing.\n" +
                      "If Congress debate reveals unresolved conflict between beliefs, include epistemicTensions; otherwise null.\n" +
                      "Must align with Congress/Paradigm/Ego model and belief rules.",
                  },
                ] as any,
              });

              json = JSON.parse(synthesis.choices[0]?.message?.content || "{}");
            } catch (error) {
              console.error("Synthesis AI completion failed, using local fallback", error);
              json = localSynthesisFallback(input.content, weight, route, category, strategy);
            }
          } else {
            json = localSynthesisFallback(input.content, weight, route, category, strategy);
          }

          const logicData = json.logicEntry || {};
          const memoryData = json.memoryEntry || {};
          const beliefUpdates = Array.isArray(json.beliefUpdates) ? json.beliefUpdates : [];
          const incongruentData = json.incongruentLog;
          const tensionData = Array.isArray(json.epistemicTensions) ? json.epistemicTensions : [];

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
            phenomenologicalUncertainty: typeof memoryData.phenomenologicalUncertainty === "string"
              ? memoryData.phenomenologicalUncertainty
              : null,
            logicEntryId: logicEntry.id,
          });

          if (
            incongruentData
            && typeof incongruentData.congressConclusion === "string"
            && typeof incongruentData.egoExpression === "string"
          ) {
            await storage.createIncongruentEntry({
              messageId: assistantMsg.id,
              congressConclusion: incongruentData.congressConclusion,
              egoExpression: incongruentData.egoExpression,
              reasoning: typeof incongruentData.reasoning === "string"
                ? incongruentData.reasoning
                : "Relational mediation",
              relationalContext: typeof incongruentData.relationalContext === "string"
                ? incongruentData.relationalContext
                : "Context preservation",
            });
          }

          for (const tension of tensionData) {
            if (!tension?.belief1 || !tension?.belief2 || !tension?.description) {
              continue;
            }

            const existing = await storage.findTension(String(tension.belief1), String(tension.belief2));

            if (existing) {
              await storage.updateTension(existing.id, {
                lastEncountered: new Date(),
                encounterCount: existing.encounterCount + 1,
              });
            } else {
              await storage.createTension({
                description: String(tension.description),
                belief1: String(tension.belief1),
                belief2: String(tension.belief2),
                encounterCount: 1,
                resolved: false,
              });
            }
          }

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

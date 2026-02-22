import { z } from 'zod';
import { insertChatMessageSchema, chatMessages, insertLogicEntrySchema, logicEntries, insertMemoryEntrySchema, memoryEntries } from './schema';

// Shared error schemas
export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  chat: {
    list: {
      method: 'GET' as const,
      path: '/api/chat/messages' as const,
      responses: { 200: z.array(z.custom<typeof chatMessages.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/chat/messages' as const,
      input: z.object({ content: z.string() }),
      responses: {
        201: z.custom<typeof chatMessages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    search: {
      method: 'GET' as const,
      path: '/api/chat/search' as const,
      input: z.object({ query: z.string() }).optional(),
      responses: { 200: z.array(z.custom<typeof chatMessages.$inferSelect>()) },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/chat/stats' as const,
      responses: {
        200: z.object({
          totalMessages: z.number(),
          userMessages: z.number(),
          sovernMessages: z.number(),
          totalTokens: z.number(),
        })
      }
    }
  },
  logic: {
    list: {
      method: 'GET' as const,
      path: '/api/logic' as const,
      responses: { 200: z.array(z.custom<typeof logicEntries.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/logic/:id' as const,
      responses: {
        200: z.custom<typeof logicEntries.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  memory: {
    list: {
      method: 'GET' as const,
      path: '/api/memory' as const,
      responses: { 200: z.array(z.custom<typeof memoryEntries.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/memory/:id' as const,
      responses: {
        200: z.custom<typeof memoryEntries.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

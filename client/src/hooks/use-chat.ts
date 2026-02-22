import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useChatMessages() {
  return useQuery({
    queryKey: [api.chat.list.path],
    queryFn: async () => {
      const res = await fetch(api.chat.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      return api.chat.list.responses[200].parse(data);
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (content: string) => {
      // Validate input before sending
      const input = api.chat.create.input.parse({ content });
      
      const res = await fetch(api.chat.create.path, {
        method: api.chat.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.chat.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to send message");
      }
      
      return api.chat.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate to fetch the new user message AND the newly generated AI response
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.chat.stats.path] });
    },
  });
}

export function useChatSearch(query: string) {
  return useQuery({
    queryKey: [api.chat.search.path, query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const url = buildUrl(api.chat.search.path) + `?query=${encodeURIComponent(query)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return api.chat.search.responses[200].parse(await res.json());
    },
    enabled: query.trim().length > 0,
  });
}

export function useChatStats() {
  return useQuery({
    queryKey: [api.chat.stats.path],
    queryFn: async () => {
      const res = await fetch(api.chat.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.chat.stats.responses[200].parse(await res.json());
    },
  });
}

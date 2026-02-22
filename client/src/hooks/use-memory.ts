import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useMemoryEntries() {
  return useQuery({
    queryKey: [api.memory.list.path],
    queryFn: async () => {
      const res = await fetch(api.memory.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch memory entries");
      return api.memory.list.responses[200].parse(await res.json());
    },
  });
}

export function useMemoryEntry(id: number | null) {
  return useQuery({
    queryKey: [api.memory.get.path, id],
    queryFn: async () => {
      if (id === null) return null;
      const url = buildUrl(api.memory.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch memory entry");
      return api.memory.get.responses[200].parse(await res.json());
    },
    enabled: id !== null,
  });
}

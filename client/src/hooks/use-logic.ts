import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useLogicEntries() {
  return useQuery({
    queryKey: [api.logic.list.path],
    queryFn: async () => {
      const res = await fetch(api.logic.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logic entries");
      return api.logic.list.responses[200].parse(await res.json());
    },
  });
}

export function useLogicEntry(id: number | null) {
  return useQuery({
    queryKey: [api.logic.get.path, id],
    queryFn: async () => {
      if (id === null) return null;
      const url = buildUrl(api.logic.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch logic entry");
      return api.logic.get.responses[200].parse(await res.json());
    },
    enabled: id !== null,
  });
}

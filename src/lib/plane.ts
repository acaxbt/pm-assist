import { env } from "@/lib/env";

/**
 * Minimal Plane.so API client.
 * Docs: https://developers.plane.so/api-reference/introduction
 *
 * Untuk MVP kita expose: createPage(), createIssue(), listProjects().
 * Kredensial via PAT (PLANE_API_TOKEN).
 */

type PlaneFetchInit = RequestInit & { query?: Record<string, string | number | undefined> };

async function planeFetch<T>(path: string, init: PlaneFetchInit = {}): Promise<T> {
  if (!env.PLANE_API_TOKEN || !env.PLANE_WORKSPACE_SLUG) {
    throw new Error("Plane.so belum dikonfigurasi (PLANE_API_TOKEN / PLANE_WORKSPACE_SLUG kosong).");
  }

  const url = new URL(`${env.PLANE_BASE_URL.replace(/\/$/, "")}${path}`);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.PLANE_API_TOKEN,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Plane API ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export type PlaneProject = { id: string; name: string; identifier: string };
export type PlaneIssue = { id: string; name: string; sequence_id: number };
export type PlanePage = { id: string; name: string };

export const planeApi = {
  listProjects(): Promise<PlaneProject[]> {
    return planeFetch(`/api/v1/workspaces/${env.PLANE_WORKSPACE_SLUG}/projects/`);
  },

  createPage(projectId: string, payload: { name: string; description_html?: string }) {
    return planeFetch<PlanePage>(
      `/api/v1/workspaces/${env.PLANE_WORKSPACE_SLUG}/projects/${projectId}/pages/`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  createIssue(projectId: string, payload: { name: string; description_html?: string; priority?: "urgent" | "high" | "medium" | "low" | "none" }) {
    return planeFetch<PlaneIssue>(
      `/api/v1/workspaces/${env.PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },
};

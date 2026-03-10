"use client";

import { FormEvent, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";

type CompetitorSuggestion = {
  name: string;
  domain_url: string;
  score?: number | null;
};

const INITIAL_COMPETITOR = {
  name: "",
  domain_url: "",
};

export default function DiscoveryPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

  const [businessId, setBusinessId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<CompetitorSuggestion[]>([]);
  const [manualCompetitor, setManualCompetitor] = useState(INITIAL_COMPETITOR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getStoredToken = () => {
    try {
      return localStorage.getItem("token") || sessionStorage.getItem("token");
    } catch {
      return null;
    }
  };

  const authFetch = useCallback(
    async (url: string, opts: RequestInit = {}) => {
      const token = getStoredToken();
      if (!token) {
        router.replace("/");
        return null;
      }

      const headers = new Headers(opts.headers ?? {});
      headers.set("Authorization", `Bearer ${token}`);
      if (!(opts.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }

      let requestUrl = url;
      if (!url.startsWith("http")) {
        const base = API_BASE.replace(/\/+$/, "");
        const path = url.startsWith("/") ? url : `/${url}`;
        const hasApiPrefixInBase = /\/api\/v1$/i.test(base);
        const normalizedPath = hasApiPrefixInBase
          ? path.replace(/^\/api\/v1(?=\/|$)/i, "") || "/"
          : path;
        requestUrl = `${base}${normalizedPath}`;
      }

      const response = await fetch(requestUrl, {
        ...opts,
        headers,
      });

      return response;
    },
    [API_BASE, router],
  );

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/");
      return;
    }

    authFetch("/api/v1/businesses/")
      .then((res) => {
        if (!res || !res.ok) return;
        return res.json();
      })
      .then((data) => {
        if (!data || data.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setBusinessId(data[0].id);
      })
      .catch((err) => {
        console.error("Failed to load business context:", err);
      });
  }, [router, authFetch]);

  const loadSuggestions = async () => {
    if (!businessId) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await authFetch(
        `/api/v1/competitors/discover/suggestions?business_id=${businessId}`,
      );

      if (!response) {
        return;
      }
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "Failed to fetch competitor suggestions.");
      }

      const data = (await response.json()) as CompetitorSuggestion[];
      setSuggestions(data);
      setSuccess("Automatic competitor suggestions are ready.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch competitor suggestions.");
    } finally {
      setBusy(false);
    }
  };

  const runFullPipeline = async () => {
    if (!businessId) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await authFetch(
        `/api/v1/competitors/discover/run-pipeline?business_id=${businessId}&max_competitors=3`,
        {
          method: "POST",
        },
      );

      if (!response) {
        return;
      }
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "Failed to run full pipeline.");
      }

      const payload = (await response.json()) as {
        created_count?: number;
        queued_scrape_tasks?: string[];
      };

      setSuccess(
        `Pipeline completed: ${payload.created_count ?? 0} competitors added, ${payload.queued_scrape_tasks?.length ?? 0} scrape jobs queued.`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run full pipeline.");
    } finally {
      setBusy(false);
    }
  };

  const approveSuggestion = async (suggestion: CompetitorSuggestion) => {
    if (!businessId) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const params = new URLSearchParams({
        business_id: String(businessId),
        name: suggestion.name,
        domain_url: suggestion.domain_url,
      });

      const response = await authFetch(`/api/v1/competitors/discover/approve?${params.toString()}`, {
        method: "POST",
      });

      if (!response) {
        return;
      }
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "Failed to add suggested competitor.");
      }

      setSuccess(`Added ${suggestion.name} to tracked competitors.`);
      setSuggestions((current) => current.filter((item) => item.name !== suggestion.name));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add suggested competitor.");
    } finally {
      setBusy(false);
    }
  };

  const addManualCompetitor = async (event: FormEvent) => {
    event.preventDefault();
    if (!businessId) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await authFetch("/api/v1/competitors/", {
        method: "POST",
        body: JSON.stringify({
          ...manualCompetitor,
          business_id: businessId,
          discovery_method: "manual",
        }),
      });

      if (!response) {
        return;
      }
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "Failed to add competitor.");
      }

      setManualCompetitor(INITIAL_COMPETITOR);
      setSuccess("Manual competitor added successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add competitor.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.pageContent}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Discovery & Input</h1>
          <p className={styles.muted}>
            Balanced flows for automatic discovery and manual competitor input.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={loadSuggestions}
            disabled={busy || !businessId}
          >
            Find Competitors
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={runFullPipeline}
            disabled={busy || !businessId}
          >
            Run Pipeline
          </button>
        </div>
      </header>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <div className={styles.discoveryGrid}>
        <section className={styles.subCard}>
          <div className={styles.rowBetween}>
            <div>
              <h3>Automatic Discovery</h3>
              <p className={styles.mutedSmall}>
                Fetch suggestions from backend intelligence endpoints.
              </p>
            </div>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={loadSuggestions}
              disabled={busy || !businessId}
            >
              Find Competitors
            </button>
          </div>
          {suggestions.length === 0 ? (
            <div className={styles.placeholderPanel}>
              <div className={styles.placeholderArt} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p>No suggestions yet. Click "Find Competitors" to start.</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {suggestions.map((item) => (
                <li key={`${item.name}-${item.domain_url}`} className={styles.listItem}>
                  <div>
                    <div className={styles.listTitle}>{item.name}</div>
                    <div className={styles.listMeta}>{item.domain_url}</div>
                    <div className={styles.listMeta}>Score: {item.score ?? "-"}</div>
                  </div>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => approveSuggestion(item)}
                    disabled={busy}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.subCard}>
          <h3>Manual Add</h3>
          <p className={styles.mutedSmall}>Create a competitor manually and sync immediately.</p>
          <form className={styles.formGrid} onSubmit={addManualCompetitor}>
            <label>
              Competitor Name
              <input
                required
                value={manualCompetitor.name}
                onChange={(event) =>
                  setManualCompetitor((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              Domain URL
              <input
                required
                type="url"
                placeholder="https://competitor.com"
                value={manualCompetitor.domain_url}
                onChange={(event) =>
                  setManualCompetitor((current) => ({ ...current, domain_url: event.target.value }))
                }
              />
            </label>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={busy || !businessId}
            >
              Add Competitor
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

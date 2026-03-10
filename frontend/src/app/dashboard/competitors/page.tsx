"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";

type Competitor = {
  id: number;
  name: string;
  domain_url: string;
  status?: string | null;
  discovery_method?: string | null;
  priority_level?: string | null;
  business_id: number;
};

type RawScrapedData = {
  id?: number;
  url?: string;
  scraped_at?: string;
  payload?: {
    status_code?: number;
    text?: string;
  };
};

type CleanedData = {
  id?: number;
  url?: string;
  product_name?: string | null;
  price?: number | null;
  scraped_at?: string;
};

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return value;
  }
  return dt.toLocaleString();
}

export default function CompetitorsPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

  const [businessId, setBusinessId] = useState<number | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<number | null>(null);
  const [rawData, setRawData] = useState<RawScrapedData[]>([]);
  const [cleanedData, setCleanedData] = useState<CleanedData[]>([]);
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

  const loadCompetitors = useCallback(
    async (bId: number) => {
      const response = await authFetch(`/api/v1/competitors/?business_id=${bId}`);
      if (!response || !response.ok) {
        setCompetitors([]);
        return;
      }

      const data = (await response.json()) as Competitor[];
      setCompetitors(data);
      setSelectedCompetitorId((current) => {
        if (current && data.some((item) => item.id === current)) {
          return current;
        }
        return data[0]?.id ?? null;
      });
    },
    [authFetch],
  );

  const loadCompetitorDetails = useCallback(
    async (competitorId: number) => {
      const [rawRes, cleanedRes] = await Promise.all([
        authFetch(`/api/v1/competitors/${competitorId}/raw-data`),
        authFetch(`/api/v1/competitors/${competitorId}/cleaned-data`),
      ]);

      if (rawRes?.ok) {
        setRawData((await rawRes.json()) as RawScrapedData[]);
      } else {
        setRawData([]);
      }

      if (cleanedRes?.ok) {
        setCleanedData((await cleanedRes.json()) as CleanedData[]);
      } else {
        setCleanedData([]);
      }
    },
    [authFetch],
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

  useEffect(() => {
    if (!businessId) {
      return;
    }
    loadCompetitors(businessId).catch((err) => {
      console.error("Failed to load competitors:", err);
    });
  }, [businessId, loadCompetitors]);

  useEffect(() => {
    if (!selectedCompetitorId) {
      setRawData([]);
      setCleanedData([]);
      return;
    }

    loadCompetitorDetails(selectedCompetitorId).catch((err) => {
      console.error("Failed to load competitor details:", err);
    });
  }, [selectedCompetitorId, loadCompetitorDetails]);

  const triggerScrape = async (competitorId: number) => {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await authFetch(`/api/v1/competitors/${competitorId}/scrape`, {
        method: "POST",
      });

      if (!response) {
        return;
      }
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "Failed to queue scraping job.");
      }

      setSuccess("Scrape job queued. Refreshing competitor data in a few seconds.");

      window.setTimeout(() => {
        loadCompetitorDetails(competitorId).catch(() => {
          setError("Scrape started but data refresh failed. Try refreshing manually.");
        });
      }, 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to queue scraping job.");
    } finally {
      setBusy(false);
    }
  };

  const selectedCompetitor = competitors.find((c) => c.id === selectedCompetitorId) ?? null;

  const cleanedTimeline = [...cleanedData].sort(
    (a, b) => new Date(b.scraped_at || 0).getTime() - new Date(a.scraped_at || 0).getTime(),
  );

  const latestCleaned = cleanedTimeline[0] ?? null;
  const previousCleaned = cleanedTimeline[1] ?? null;

  const diffRows = latestCleaned && previousCleaned ? [
    {
      field: "Product name",
      previous: previousCleaned.product_name || "-",
      latest: latestCleaned.product_name || "-",
    },
    {
      field: "Price",
      previous: previousCleaned.price?.toString() || "-",
      latest: latestCleaned.price?.toString() || "-",
    },
    {
      field: "URL",
      previous: previousCleaned.url || "-",
      latest: latestCleaned.url || "-",
    },
  ] : [];

  return (
    <div className={styles.pageContent}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Competitor Library</h1>
          <p className={styles.muted}>
            High-signal table view with quick scrape actions and data preview.
          </p>
        </div>
      </header>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <section className={styles.sectionCard}>
        <div className={styles.rowBetween}>
          <div>
            <h2>Tracked Competitors</h2>
            <p className={styles.muted}>Select a competitor to view scrape data and trigger new scans.</p>
          </div>
        </div>
        {competitors.length === 0 ? (
          <div className={styles.placeholderPanel}>
            <div className={styles.placeholderArt} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>No competitors tracked yet. Visit Discovery to add competitors.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.competitorTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Domain</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((competitor) => {
                  const selected = competitor.id === selectedCompetitorId;
                  return (
                    <tr
                      key={competitor.id}
                      className={selected ? styles.tableRowActive : ""}
                      onClick={() => setSelectedCompetitorId(competitor.id)}
                    >
                      <td>{competitor.name}</td>
                      <td>{competitor.domain_url}</td>
                      <td>{competitor.discovery_method || "manual"}</td>
                      <td>{competitor.status || "active"}</td>
                      <td>{competitor.priority_level || "medium"}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={(event) => {
                            event.stopPropagation();
                            triggerScrape(competitor.id);
                          }}
                          disabled={busy}
                        >
                          Scrape Now
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedCompetitor ? (
        <section className={styles.dataGrid}>
          <div className={styles.sectionCard}>
            <h3>Raw Data Feed</h3>
            <p className={styles.mutedSmall}>
              Recent captures for {selectedCompetitor.name}
            </p>
            {rawData.length === 0 ? (
              <p className={styles.muted}>No raw scrape records yet.</p>
            ) : (
              <ul className={styles.dataList}>
                {rawData.slice(0, 4).map((item) => (
                  <li key={item.id ?? `${item.url}-${item.scraped_at}`}>
                    <div>
                      <strong>{item.url || "No URL"}</strong>
                    </div>
                    <div>Status: {item.payload?.status_code ?? "-"}</div>
                    <div>Captured: {formatDate(item.scraped_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.sectionCard}>
            <h3>Cleaned Snapshot</h3>
            <p className={styles.mutedSmall}>Structured data extracted by processing pipeline.</p>
            {cleanedData.length === 0 ? (
              <p className={styles.muted}>No cleaned records yet.</p>
            ) : (
              <ul className={styles.dataList}>
                {cleanedData.slice(0, 4).map((item) => (
                  <li key={item.id ?? `${item.url}-${item.scraped_at}`}>
                    <div>Product: {item.product_name || "-"}</div>
                    <div>Price: {item.price ?? "-"}</div>
                    <div>Captured: {formatDate(item.scraped_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.sectionCard}>
            <h3>Change Diff</h3>
            <p className={styles.mutedSmall}>Previous versus latest normalized snapshot.</p>
            {!latestCleaned ? (
              <p className={styles.muted}>No cleaned snapshot yet.</p>
            ) : !previousCleaned ? (
              <p className={styles.muted}>Need at least two snapshots to compare.</p>
            ) : (
              <ul className={styles.dataList}>
                {diffRows.map((row) => {
                  const changed = row.previous !== row.latest;
                  return (
                    <li key={row.field} className={changed ? styles.diffChanged : ""}>
                      <div>
                        <strong>{row.field}</strong>
                      </div>
                      <div>Previous: {row.previous}</div>
                      <div>Latest: {row.latest}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

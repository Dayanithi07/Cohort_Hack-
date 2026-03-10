"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";

type Competitor = {
  id: number;
  name: string;
  domain_url: string;
};

type StrategyInsight = {
  id?: number;
  competitor_id?: number;
  insight_type?: string;
  insight_text?: string;
  created_at?: string;
};

type AlertItem = {
  id?: number;
  competitor_id?: number;
  alert_type?: string;
  message?: string;
  created_at?: string;
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

export default function IntelligencePage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

  const [businessId, setBusinessId] = useState<number | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<number | null>(null);
  const [insights, setInsights] = useState<StrategyInsight[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [error, setError] = useState("");

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

  const loadInsights = useCallback(
    async (competitorId?: number) => {
      let url = "/api/v1/insights/";
      if (competitorId) {
        url = `/api/v1/competitors/${competitorId}/insights`;
      }

      const response = await authFetch(url);
      if (!response || !response.ok) {
        setInsights([]);
        return;
      }

      const data = (await response.json()) as StrategyInsight[];
      setInsights(data);
    },
    [authFetch],
  );

  const loadAlerts = useCallback(async () => {
    const response = await authFetch("/api/v1/alerts/");
    if (!response || !response.ok) {
      setAlerts([]);
      return;
    }

    const data = (await response.json()) as AlertItem[];
    setAlerts(data);
  }, [authFetch]);

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
    loadAlerts().catch((err) => {
      console.error("Failed to load alerts:", err);
    });
  }, [businessId, loadCompetitors, loadAlerts]);

  useEffect(() => {
    loadInsights(selectedCompetitorId ?? undefined).catch((err) => {
      console.error("Failed to load insights:", err);
    });
  }, [selectedCompetitorId, loadInsights]);

  const selectedCompetitor = competitors.find((c) => c.id === selectedCompetitorId) ?? null;

  const filteredAlerts = selectedCompetitorId
    ? alerts.filter((item) => item.competitor_id === selectedCompetitorId)
    : alerts;

  return (
    <div className={styles.pageContent}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Intelligence Hub</h1>
          <p className={styles.muted}>
            Actionable insights, strategy recommendations, and alert timeline.
          </p>
        </div>
      </header>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <section className={styles.sectionCard}>
        <div className={styles.rowBetween}>
          <div>
            <h2>Filter by Competitor</h2>
            <p className={styles.mutedSmall}>Select a competitor to filter insights and alerts.</p>
          </div>
        </div>
        <div className={styles.competitorFilter}>
          <button
            type="button"
            className={`${styles.filterChip} ${!selectedCompetitorId ? styles.filterChipActive : ""}`}
            onClick={() => setSelectedCompetitorId(null)}
          >
            All Competitors
          </button>
          {competitors.map((competitor) => (
            <button
              key={competitor.id}
              type="button"
              className={`${styles.filterChip} ${selectedCompetitorId === competitor.id ? styles.filterChipActive : ""}`}
              onClick={() => setSelectedCompetitorId(competitor.id)}
            >
              {competitor.name}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.dataGrid}>
        <div className={styles.sectionCard}>
          <h3>Strategy Insights</h3>
          <p className={styles.mutedSmall}>
            {selectedCompetitor
              ? `Insights for ${selectedCompetitor.name}`
              : "All competitive insights"}
          </p>
          {insights.length === 0 ? (
            <div className={styles.placeholderPanel}>
              <div className={styles.placeholderArt} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p>No insights available yet. Run scraping and pipeline to generate insights.</p>
              <div className={styles.skeletonStack}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
            </div>
          ) : (
            <ul className={styles.dataList}>
              {insights.slice(0, 8).map((item) => (
                <li key={item.id ?? `${item.insight_type}-${item.created_at}`}>
                  <div>
                    <strong>{item.insight_type || "insight"}</strong>
                  </div>
                  <div>{item.insight_text || "-"}</div>
                  <div>Created: {formatDate(item.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.sectionCard}>
          <h3>Alerts & Notifications</h3>
          <p className={styles.mutedSmall}>
            {selectedCompetitor
              ? `Alerts for ${selectedCompetitor.name}`
              : "All system alerts"}
          </p>
          {filteredAlerts.length === 0 ? (
            <div className={styles.placeholderPanel}>
              <div className={styles.placeholderArt} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p>No alerts triggered yet. Configure alerts from settings or run discovery.</p>
              <div className={styles.skeletonStack}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
            </div>
          ) : (
            <ul className={styles.dataList}>
              {filteredAlerts.slice(0, 10).map((item) => (
                <li key={item.id ?? `${item.alert_type}-${item.created_at}`}>
                  <div>
                    <strong>{item.alert_type || "alert"}</strong>
                  </div>
                  <div>{item.message || "-"}</div>
                  <div>Created: {formatDate(item.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

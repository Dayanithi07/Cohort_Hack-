"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";

type Business = {
  id: number;
  name: string;
  website?: string | null;
  category?: string | null;
  target_market?: string | null;
  account_full_name?: string | null;
  account_email?: string | null;
  phone_number?: string | null;
  role_type?: string | null;
  business_type?: string | null;
  industry_sector?: string | null;
  country?: string | null;
  city?: string | null;
  product_name?: string | null;
  price_tier?: string | null;
  target_market_geo?: string | null;
  base_price?: number | null;
};

type User = {
  id?: number;
  full_name?: string;
  email?: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editedBusiness, setEditedBusiness] = useState<Business | null>(null);

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

  const loadUser = useCallback(async () => {
    const response = await authFetch("/api/v1/users/me");
    if (!response || !response.ok) {
      setUser(null);
      return;
    }

    const data = (await response.json()) as User;
    setUser(data);
  }, [authFetch]);

  const loadBusinesses = useCallback(async () => {
    const response = await authFetch("/api/v1/businesses/");
    if (!response || !response.ok) {
      setBusinesses([]);
      return;
    }

    const data = (await response.json()) as Business[];
    setBusinesses(data);

    if (data.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(data[0].id);
      setEditedBusiness(data[0]);
    }
  }, [authFetch, selectedBusinessId]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/");
      return;
    }

    loadUser().catch((err) => {
      console.error("Failed to load user:", err);
    });

    loadBusinesses().catch((err) => {
      console.error("Failed to load businesses:", err);
    });
  }, [router, loadUser, loadBusinesses]);

  useEffect(() => {
    if (selectedBusinessId) {
      const business = businesses.find((b) => b.id === selectedBusinessId);
      if (business) {
        setEditedBusiness(business);
      }
    }
  }, [selectedBusinessId, businesses]);

  const handleBusinessUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editedBusiness || !selectedBusinessId) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await authFetch(`/api/v1/businesses/${selectedBusinessId}`, {
        method: "PUT",
        body: JSON.stringify(editedBusiness),
      });

      if (!response) {
        return;
      }
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "Failed to update business profile.");
      }

      setSuccess("Business profile updated successfully.");
      setEditMode(false);
      await loadBusinesses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update business profile.");
    } finally {
      setBusy(false);
    }
  };

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId) ?? null;

  return (
    <div className={styles.pageContent}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Workspace & Settings</h1>
          <p className={styles.muted}>
            Manage your profile, business workspaces, and application preferences.
          </p>
        </div>
      </header>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <section className={styles.sectionCard}>
        <h2>User Profile</h2>
        <p className={styles.mutedSmall}>Your account information.</p>
        {user ? (
          <div className={styles.profileInfo}>
            <div>
              <strong>Full Name</strong>
              <p>{user.full_name || "-"}</p>
            </div>
            <div>
              <strong>Email</strong>
              <p>{user.email || "-"}</p>
            </div>
          </div>
        ) : (
          <p className={styles.muted}>Loading user profile...</p>
        )}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.rowBetween}>
          <div>
            <h2>Business Workspaces</h2>
            <p className={styles.mutedSmall}>Select and manage your business profiles.</p>
          </div>
          {selectedBusiness && !editMode ? (
            <button type="button" className={styles.primaryBtn} onClick={() => setEditMode(true)}>
              Edit Business
            </button>
          ) : null}
        </div>

        <div className={styles.businessSelectWrap}>
          <label>
            <strong>Active Workspace</strong>
            <select
              value={selectedBusinessId ?? ""}
              onChange={(e) => setSelectedBusinessId(Number(e.target.value))}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedBusiness && !editMode ? (
          <div className={styles.reviewGrid}>
            {[
              ["Business Name", selectedBusiness.name],
              ["Website", selectedBusiness.website || "-"],
              ["Account Name", selectedBusiness.account_full_name || "-"],
              ["Account Email", selectedBusiness.account_email || "-"],
              ["Phone", selectedBusiness.phone_number || "-"],
              ["Role", selectedBusiness.role_type || "-"],
              ["Business Type", selectedBusiness.business_type || "-"],
              ["Industry", selectedBusiness.industry_sector || selectedBusiness.category || "-"],
              ["Location", `${selectedBusiness.city || "-"}, ${selectedBusiness.country || "-"}`],
              ["Product", selectedBusiness.product_name || "-"],
              ["Price Tier", selectedBusiness.price_tier || "-"],
              ["Base Price", selectedBusiness.base_price?.toString() || "-"],
              ["Target Market", selectedBusiness.target_market_geo || selectedBusiness.target_market || "-"],
            ].map(([label, value]) => (
              <div key={label} className={styles.reviewItem}>
                <strong>{label}</strong>
                <span>{value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {editMode && editedBusiness ? (
          <form className={styles.formGrid} onSubmit={handleBusinessUpdate}>
            <label>
              Business Name
              <input
                value={editedBusiness.name}
                onChange={(e) =>
                  setEditedBusiness((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
              />
            </label>
            <label>
              Website
              <input
                type="url"
                value={editedBusiness.website || ""}
                onChange={(e) =>
                  setEditedBusiness((prev) => (prev ? { ...prev, website: e.target.value } : prev))
                }
              />
            </label>
            <label>
              Account Full Name
              <input
                value={editedBusiness.account_full_name || ""}
                onChange={(e) =>
                  setEditedBusiness((prev) =>
                    prev ? { ...prev, account_full_name: e.target.value } : prev
                  )
                }
              />
            </label>
            <label>
              Account Email
              <input
                type="email"
                value={editedBusiness.account_email || ""}
                onChange={(e) =>
                  setEditedBusiness((prev) =>
                    prev ? { ...prev, account_email: e.target.value } : prev
                  )
                }
              />
            </label>
            <label>
              Phone Number
              <input
                value={editedBusiness.phone_number || ""}
                onChange={(e) =>
                  setEditedBusiness((prev) =>
                    prev ? { ...prev, phone_number: e.target.value } : prev
                  )
                }
              />
            </label>
            <label>
              Category / Industry
              <input
                value={editedBusiness.category || ""}
                onChange={(e) =>
                  setEditedBusiness((prev) => (prev ? { ...prev, category: e.target.value } : prev))
                }
              />
            </label>
            <label>
              Target Market
              <input
                value={editedBusiness.target_market || ""}
                onChange={(e) =>
                  setEditedBusiness((prev) =>
                    prev ? { ...prev, target_market: e.target.value } : prev
                  )
                }
              />
            </label>
            <label>
              Product Name
              <input
                value={editedBusiness.product_name || ""}
                onChange={(e) =>
                  setEditedBusiness((prev) =>
                    prev ? { ...prev, product_name: e.target.value } : prev
                  )
                }
              />
            </label>
            <label>
              Base Price
              <input
                type="number"
                step="0.01"
                value={editedBusiness.base_price ?? ""}
                onChange={(e) =>
                  setEditedBusiness((prev) =>
                    prev ? { ...prev, base_price: Number(e.target.value) || null } : prev
                  )
                }
              />
            </label>
            <div className={styles.fullRow}>
              <div className={styles.wizardActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setEditMode(false);
                    setEditedBusiness(selectedBusiness);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={busy}>
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}

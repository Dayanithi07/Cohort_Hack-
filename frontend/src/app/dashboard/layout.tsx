"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import styles from "./layout.module.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [businesses, setBusinesses] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const getStoredToken = () => {
    try {
      return localStorage.getItem("token") || sessionStorage.getItem("token");
    } catch {
      return null;
    }
  };

  const clearStoredToken = () => {
    try {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    } catch {}
  };

  const logout = () => {
    clearStoredToken();
    router.push("/");
  };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/");
      return;
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

    fetch(`${API_BASE}/businesses/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          clearStoredToken();
          router.replace("/");
          return null;
        }
        if (!res.ok) throw new Error("Failed to load businesses");
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setBusinesses(data);
        if (data.length === 0) {
          router.replace("/onboarding");
          return;
        }
        setSelectedBusinessId(data[0].id);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load businesses:", err);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <p>Loading workspace...</p>
      </div>
    );
  }

  const navItems = [
    { href: "/dashboard/discovery", label: "Discovery", icon: "🔍" },
    { href: "/dashboard/competitors", label: "Competitor Library", icon: "📊" },
    { href: "/dashboard/intelligence", label: "Intelligence Hub", icon: "💡" },
    { href: "/dashboard/settings", label: "Workspace & Settings", icon: "⚙️" },
  ];

  return (
    <div className={styles.dashboardRoot}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <span className={styles.brandIcon}>IO</span>
          <div>
            <h2>Command Center</h2>
            <p>INTELOPS</p>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ""}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <div className={styles.businessContext}>
            <strong>Active Workspace</strong>
            <select
              value={selectedBusinessId ?? ""}
              onChange={(e) => setSelectedBusinessId(Number(e.target.value))}
              className={styles.businessSelect}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className={styles.contentArea}>{children}</div>
      </main>
    </div>
  );
}

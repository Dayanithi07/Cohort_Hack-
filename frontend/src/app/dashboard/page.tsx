"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

interface Business {
    id: number;
    name: string;
    website: string;
    category: string;
    target_market: string;
    owner_id: number;
}

interface Competitor {
    id: number;
    name: string;
    website: string;
    tracking_enabled: boolean;
    business_id: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const [showBizModal, setShowBizModal] = useState(false);
    const [showCompModal, setShowCompModal] = useState(false);
    const [bizForm, setBizForm] = useState({ name: "", website: "", category: "", target_market: "" });
    const [compForm, setCompForm] = useState({ name: "", website: "", business_id: 0, tracking_enabled: true });

    const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/"); return null; }
        const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
        if (res.status === 401 || res.status === 403) { localStorage.removeItem("token"); router.push("/"); return null; }
        return res;
    }, [router]);

    const loadBusinesses = useCallback(async () => {
        const res = await authFetch("/api/v1/businesses/");
        if (!res) return;
        const data = await res.json();
        setBusinesses(data);
        if (data.length > 0 && !selectedBiz) setSelectedBiz(data[0]);
    }, [authFetch, selectedBiz]);

    const loadCompetitors = useCallback(async (bizId: number) => {
        const res = await authFetch(`/api/v1/competitors/?business_id=${bizId}`);
        if (!res) return;
        const data = await res.json();
        setCompetitors(data);
    }, [authFetch]);

    useEffect(() => {
        loadBusinesses().finally(() => setLoading(false));
    }, [loadBusinesses]);

    useEffect(() => {
        if (selectedBiz) loadCompetitors(selectedBiz.id);
    }, [selectedBiz, loadCompetitors]);

    const createBusiness = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await authFetch("/api/v1/businesses/", { method: "POST", body: JSON.stringify(bizForm) });
        if (res?.ok) { setShowBizModal(false); setBizForm({ name: "", website: "", category: "", target_market: "" }); loadBusinesses(); }
    };

    const createCompetitor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBiz) return;
        const payload = { ...compForm, business_id: selectedBiz.id };
        const res = await authFetch("/api/v1/competitors/", { method: "POST", body: JSON.stringify(payload) });
        if (res?.ok) { setShowCompModal(false); setCompForm({ name: "", website: "", business_id: 0, tracking_enabled: true }); loadCompetitors(selectedBiz.id); }
    };

    const logout = () => { localStorage.removeItem("token"); router.push("/"); };

    if (loading) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.loadingSpinner} />
                <p>Loading your dashboard…</p>
            </div>
        );
    }

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                            <path d="M16 2L28 8V24L16 30L4 24V8L16 2Z" fill="url(#grad2)" />
                            <path d="M16 10L22 14V20L16 24L10 20V14L16 10Z" fill="rgb(10,10,15)" fillOpacity="0.8" />
                            <defs><linearGradient id="grad2" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#6c63ff" /><stop offset="1" stopColor="#a78bfa" /></linearGradient></defs>
                        </svg>
                        <span className={styles.logoLabel}>CIT</span>
                    </div>
                </div>

                <nav className={styles.nav}>
                    <span className={styles.navLabel}>Businesses</span>
                    {businesses.map((biz) => (
                        <button key={biz.id} id={`biz-${biz.id}`} className={`${styles.navItem} ${selectedBiz?.id === biz.id ? styles.navItemActive : ""}`} onClick={() => setSelectedBiz(biz)}>
                            <span className={styles.navIcon}>🏢</span>
                            <span className={styles.navText}>{biz.name}</span>
                        </button>
                    ))}
                    <button id="add-business-btn" className={styles.addBtn} onClick={() => setShowBizModal(true)}>
                        <span>＋</span> Add Business
                    </button>
                </nav>

                <div className={styles.sidebarFooter}>
                    <button id="logout-btn" className={styles.logoutBtn} onClick={logout}>Sign Out</button>
                </div>
            </aside>

            {/* Main content */}
            <main className={styles.main}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.pageTitle}>{selectedBiz?.name ?? "Dashboard"}</h1>
                        <p className={styles.pageSub}>{selectedBiz ? `${selectedBiz.category || "Business"} · ${selectedBiz.target_market || "All markets"}` : "Select a business to get started"}</p>
                    </div>
                    {selectedBiz && (
                        <button id="add-competitor-btn" className={styles.btnAdd} onClick={() => setShowCompModal(true)}>
                            + Add Competitor
                        </button>
                    )}
                </div>

                {/* Stats row */}
                {selectedBiz && (
                    <div className={styles.statsRow}>
                        {[
                            { label: "Tracked Competitors", value: competitors.length, icon: "🎯", color: "accent" },
                            { label: "Active Monitors", value: competitors.filter((c) => c.tracking_enabled).length, icon: "✅", color: "success" },
                            { label: "Paused", value: competitors.filter((c) => !c.tracking_enabled).length, icon: "⏸️", color: "warning" },
                            { label: "Changes Today", value: 0, icon: "📊", color: "muted" },
                        ].map((s) => (
                            <div key={s.label} className={`${styles.statCard} ${styles["stat_" + s.color]}`}>
                                <span className={styles.statIcon}>{s.icon}</span>
                                <div>
                                    <div className={styles.statValue}>{s.value}</div>
                                    <div className={styles.statLabel}>{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Competitors grid */}
                {selectedBiz ? (
                    competitors.length === 0 ? (
                        <div className={styles.empty}>
                            <div className={styles.emptyIcon}>🔍</div>
                            <h3>No competitors tracked yet</h3>
                            <p>Add your first competitor to start monitoring their website for changes, pricing updates, and more.</p>
                            <button className={styles.btnAdd} onClick={() => setShowCompModal(true)}>+ Add First Competitor</button>
                        </div>
                    ) : (
                        <div className={styles.competitorGrid}>
                            {competitors.map((comp) => (
                                <div key={comp.id} id={`competitor-${comp.id}`} className={styles.competitorCard}>
                                    <div className={styles.compHeader}>
                                        <div className={styles.compAvatar}>{comp.name[0].toUpperCase()}</div>
                                        <div>
                                            <div className={styles.compName}>{comp.name}</div>
                                            <a href={comp.website} target="_blank" rel="noopener noreferrer" className={styles.compUrl}>{comp.website}</a>
                                        </div>
                                        <span className={`badge ${comp.tracking_enabled ? "badge-success" : "badge-warning"}`}>
                                            {comp.tracking_enabled ? "● Live" : "⏸ Paused"}
                                        </span>
                                    </div>
                                    <div className={styles.compFooter}>
                                        <div className={styles.compMeta}>Last checked: <strong>–</strong></div>
                                        <div className={styles.compMeta}>Changes: <strong>0</strong></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>🏢</div>
                        <h3>No businesses yet</h3>
                        <p>Create your first business profile to start tracking competitors.</p>
                        <button className={styles.btnAdd} onClick={() => setShowBizModal(true)}>+ Create Business</button>
                    </div>
                )}
            </main>

            {/* Business Modal */}
            {showBizModal && (
                <div className={styles.overlay} onClick={() => setShowBizModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Add Business</h2>
                            <button className={styles.closeBtn} onClick={() => setShowBizModal(false)}>✕</button>
                        </div>
                        <form onSubmit={createBusiness} className={styles.modalForm}>
                            {[
                                { label: "Business Name *", name: "name", required: true, placeholder: "Acme Corp" },
                                { label: "Website", name: "website", required: false, placeholder: "https://acme.com" },
                                { label: "Category", name: "category", required: false, placeholder: "SaaS, E-commerce…" },
                                { label: "Target Market", name: "target_market", required: false, placeholder: "SMBs, Enterprise…" },
                            ].map((f) => (
                                <div key={f.name} className={styles.field}>
                                    <label className={styles.label}>{f.label}</label>
                                    <input className={styles.input} name={f.name} required={f.required} placeholder={f.placeholder}
                                        value={(bizForm as Record<string, string>)[f.name]}
                                        onChange={(e) => setBizForm({ ...bizForm, [f.name]: e.target.value })} />
                                </div>
                            ))}
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnSecondary} onClick={() => setShowBizModal(false)}>Cancel</button>
                                <button id="create-business-submit" type="submit" className={styles.btnAdd}>Create Business</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Competitor Modal */}
            {showCompModal && selectedBiz && (
                <div className={styles.overlay} onClick={() => setShowCompModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Add Competitor</h2>
                            <button className={styles.closeBtn} onClick={() => setShowCompModal(false)}>✕</button>
                        </div>
                        <form onSubmit={createCompetitor} className={styles.modalForm}>
                            <div className={styles.field}>
                                <label className={styles.label}>Competitor Name *</label>
                                <input className={styles.input} required placeholder="Competitor Inc." value={compForm.name}
                                    onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Website URL *</label>
                                <input className={styles.input} required type="url" placeholder="https://competitor.com" value={compForm.website}
                                    onChange={(e) => setCompForm({ ...compForm, website: e.target.value })} />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnSecondary} onClick={() => setShowCompModal(false)}>Cancel</button>
                                <button id="create-competitor-submit" type="submit" className={styles.btnAdd}>Start Tracking</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getStoredToken = () => {
    try {
      return localStorage.getItem("token") || sessionStorage.getItem("token");
    } catch {
      return null;
    }
  };

  const storeToken = (token: string) => {
    try {
      localStorage.setItem("token", token);
      sessionStorage.setItem("token", token);
    } catch {
      // If storage is blocked, redirect still proceeds and user can re-auth.
    }
  };

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  const goToDashboard = () => {
    router.replace("/dashboard");
    window.setTimeout(() => {
      if (window.location.pathname !== "/dashboard") {
        window.location.assign("/dashboard");
      }
    }, 250);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = new URLSearchParams({ username: form.email, password: form.password });
      const res = await fetch(`${API_BASE}/auth/login`, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Login failed"); }
      const data = await res.json();
      storeToken(data.access_token);
      goToDashboard();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/register`, { method: "POST", body: JSON.stringify(form), headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Signup failed"); }
      const data = await res.json();
      storeToken(data.access_token);
      goToDashboard();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.root}>
      {/* Background orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.container}>
        {/* Left: Hero */}
        <div className={styles.hero}>
          <div className={styles.logoMark}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="url(#grad)" />
              <path d="M20 8L20 32M12 20L28 20" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="20" cy="12" r="2.5" fill="#10B981" />
              <circle cx="20" cy="28" r="2.5" fill="#10B981" />
              <circle cx="14" cy="20" r="2.5" fill="#10B981" />
              <circle cx="26" cy="20" r="2.5" fill="#10B981" />
              <defs>
                <linearGradient id="grad" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4F46E5" />
                  <stop offset="1" stopColor="#6366F1" />
                </linearGradient>
              </defs>
            </svg>
            <span className={styles.logoText}>INTELOPS</span>
          </div>
          <h1 className={styles.heroHeading}>
            Intelligence<br />
            <span className={styles.heroAccent}>Operations</span><br />
            Platform
          </h1>
          <p className={styles.heroDesc}>
            Monitor competitors in real-time. Track pricing changes, content updates, and strategy shifts — automatically.
          </p>
          <div className={styles.features}>
            {[
              { icon: "⚡", text: "Real-time web scraping" },
              { icon: "🔔", text: "Instant change alerts" },
              { icon: "🧠", text: "AI-powered insights" },
              { icon: "📊", text: "Competitive dashboard" },
            ].map((f) => (
              <div key={f.text} className={styles.featureItem}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className={styles.authCard}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === "login" ? styles.tabActive : ""}`} onClick={() => { setActiveTab("login"); setError(""); }}>Sign In</button>
            <button className={`${styles.tab} ${activeTab === "signup" ? styles.tabActive : ""}`} onClick={() => { setActiveTab("signup"); setError(""); }}>Sign Up</button>
          </div>

          {error && (
            <div className={`${styles.alert} ${error.includes("created") ? styles.alertSuccess : styles.alertError}`}>
              {error}
            </div>
          )}

          {activeTab === "login" ? (
            <form onSubmit={handleLogin} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input id="login-email" name="email" type="email" required className={styles.input} placeholder="you@company.com" value={form.email} onChange={handleChange} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Password</label>
                <input id="login-password" name="password" type="password" required className={styles.input} placeholder="••••••••" value={form.password} onChange={handleChange} />
              </div>
              <button id="login-submit" type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Full Name</label>
                <input id="signup-name" name="full_name" type="text" required className={styles.input} placeholder="Jane Smith" value={form.full_name} onChange={handleChange} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input id="signup-email" name="email" type="email" required className={styles.input} placeholder="you@company.com" value={form.email} onChange={handleChange} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Password</label>
                <input id="signup-password" name="password" type="password" required minLength={8} className={styles.input} placeholder="Min. 8 characters" value={form.password} onChange={handleChange} />
              </div>
              <button id="signup-submit" type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : "Create Account"}
              </button>
            </form>
          )}

          <p className={styles.footer}>By continuing, you agree to our <Link href="#" className={styles.link}>Terms</Link> and <Link href="#" className={styles.link}>Privacy Policy</Link>.</p>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import styles from "./page.module.css";
import Link from "next/link";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = new URLSearchParams({ username: form.email, password: form.password });
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/login", { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Login failed"); }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/users/", { method: "POST", body: JSON.stringify(form), headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Signup failed"); }
      setActiveTab("login");
      setError("Account created! Please log in.");
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
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L28 8V24L16 30L4 24V8L16 2Z" fill="url(#grad)" />
              <path d="M16 10L22 14V20L16 24L10 20V14L16 10Z" fill="rgb(10,10,15)" fillOpacity="0.8" />
              <defs>
                <linearGradient id="grad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6c63ff" />
                  <stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <span className={styles.logoText}>CIT</span>
          </div>
          <h1 className={styles.heroHeading}>
            Competitor<br />
            <span className={styles.heroAccent}>Intelligence</span><br />
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

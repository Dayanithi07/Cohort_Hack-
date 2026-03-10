import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

/* ── Design Tokens ─────────────────────────────────────────────────────────── */
const T = {
  bg:"#05070e", panel:"#0b1120", panelBorder:"#1a2744", panelHover:"#0f1930",
  accent:"#e8a020", accentDim:"#7c4a05", accentGlow:"rgba(232,160,32,0.15)",
  blue:"#3b82f6", blueDim:"#1e3a6e", green:"#22c55e", greenDim:"#14532d",
  red:"#ef4444", redDim:"#7f1d1d", yellow:"#fbbf24", purple:"#a855f7", purpleDim:"#581c87",
  text:"#cbd5e1", textDim:"#475569", textMuted:"#2d4060",
  mono:"'JetBrains Mono','Courier New',monospace",
  heading:"'Syne',sans-serif", body:"'Inter',system-ui,sans-serif",
};

const CATEGORIES = ["Fashion & Apparel","Electronics","Food & Beverage","Home & Decor","Beauty & Wellness","Sports & Fitness","Books & Stationery","Jewellery","Other"];

const DEFAULT_BUSINESS = {
  name: "CoimbatoreThreads", category: "Fashion & Apparel",
  location: "Coimbatore, Tamil Nadu", website: "coimbatorethreads.in",
  myProducts: [
    { name: "Premium Hoodie", price: 849 },
    { name: "Slim Fit Jeans", price: 1199 },
    { name: "Cotton Tee Bundle", price: 549 },
    { name: "Cargo Shorts", price: 699 },
  ],
};

// Generates fake historical price data for a product
function generateHistory(currentPrice, days = 14) {
  const pts = [];
  let p = currentPrice * (1 + (Math.random() * 0.3 + 0.1));
  for (let i = days; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    if (i === 0) { pts.push({ date: label, price: currentPrice }); break; }
    p = p * (0.97 + Math.random() * 0.06);
    pts.push({ date: label, price: Math.round(p) });
  }
  return pts;
}

const INIT_COMPETITORS = [
  {
    id: 1, name: "StyleHub", website: "stylehub.in", status: "active", lastScan: "2h ago",
    products: [
      { id: "s1", name: "Oversized Hoodie", price: 999, prevPrice: 1199, discount: "15%", isNew: false, change: -16.7, history: generateHistory(999) },
      { id: "s2", name: "Slim Fit Jeans",   price: 1299, prevPrice: 1299, discount: "0%", isNew: false, change: 0, history: generateHistory(1299) },
      { id: "s3", name: "Cotton T-Shirt Pack", price: 599, prevPrice: 799, discount: "25%", isNew: true, change: -25, history: generateHistory(599) },
      { id: "s4", name: "Track Pants", price: 799, prevPrice: 999, discount: "20%", isNew: false, change: -20, history: generateHistory(799) },
    ],
  },
  {
    id: 2, name: "TrendWear", website: "trendwear.in", status: "active", lastScan: "3h ago",
    products: [
      { id: "t1", name: "Premium Hoodie", price: 799, prevPrice: 899, discount: "11%", isNew: false, change: -11.1, history: generateHistory(799) },
      { id: "t2", name: "Cargo Pants",    price: 1499, prevPrice: 1499, discount: "0%", isNew: true, change: 0, history: generateHistory(1499) },
      { id: "t3", name: "Graphic Tee Bundle", price: 449, prevPrice: 699, discount: "36%", isNew: false, change: -35.8, history: generateHistory(449) },
    ],
  },
  {
    id: 3, name: "UrbanThreads", website: "urbanthreads.co.in", status: "monitoring", lastScan: "5h ago",
    products: [
      { id: "u1", name: "Classic Hoodie", price: 749, prevPrice: 749, discount: "0%", isNew: false, change: 0, history: generateHistory(749) },
      { id: "u2", name: "Winter Jacket",  price: 2499, prevPrice: 3499, discount: "28%", isNew: false, change: -28.6, history: generateHistory(2499) },
    ],
  },
];

/* ── Claude API ─────────────────────────────────────────────────────────────── */
async function callClaude(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      system, messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  return JSON.parse(raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim());
}

async function runScoutAgent(competitors, business) {
  const data = competitors.map(c =>
    `Competitor: ${c.name}\n` + c.products.map(p =>
      `  • ${p.name}: ₹${p.price}${p.prevPrice !== p.price ? ` (was ₹${p.prevPrice}, ${p.discount} off)` : ""}${p.isNew ? " [NEW LAUNCH]" : ""}`
    ).join("\n")
  ).join("\n\n");
  return callClaude(
    "You are a Scout Agent for a competitor intelligence system in India. Return ONLY valid JSON, no markdown.",
    `Analyze competitor data for ${business.name} in ${business.location}. Return ONLY:
{"scan_summary":"one sentence","key_findings":["f1","f2","f3"],"price_threats":[{"competitor":"","product":"","their_price":0,"threat_level":"high/medium/low","detail":""}],"active_promotions":[{"competitor":"","promotion":""}],"new_launches":[{"competitor":"","product":"","price":0}],"market_temperature":"hot/warm/neutral/cool","urgency_level":"high/medium/low"}
Data:\n${data}`
  );
}
async function runAnalystAgent(business, scout) {
  const myProds = business.myProducts.map(p => `${p.name}: ₹${p.price}`).join(", ");
  return callClaude(
    "You are an Analyst Agent for competitor intelligence. Return ONLY valid JSON, no markdown.",
    `Business: ${business.name} (${business.category}) in ${business.location}\nMy Products: ${myProds}\nScout: ${JSON.stringify(scout)}\nReturn ONLY:
{"competitive_position":"strong/competitive/vulnerable/weak","executive_summary":"2-3 sentences","price_gap_analysis":[{"product_category":"","my_price":0,"cheapest_competitor":"","competitor_price":0,"gap_percent":0.0}],"immediate_threats":[{"threat":"","competitor":"","severity":"critical/high/medium/low"}],"opportunities":[{"opportunity":"","potential_impact":"high/medium/low"}],"market_patterns":["p1","p2"],"risk_score":0,"opportunity_score":0}`
  );
}
async function runStrategistAgent(business, analyst) {
  return callClaude(
    "You are a Marketing Strategist for small Indian businesses. Return ONLY valid JSON, no markdown.",
    `Business: ${business.name} in ${business.location} (${business.category})\nAnalysis: ${JSON.stringify(analyst)}\nReturn ONLY:
{"headline_strategy":"one sentence","strategic_rationale":"2-3 sentences","immediate_actions":[{"priority":1,"action":"","rationale":"","timeline":"Today/This week/This month","impact":"high/medium/low","estimated_cost":"Free/₹500-1000/₹1000-5000"}],"pricing_recommendations":[{"product":"","current_price":0,"recommended_price":0,"change_type":"reduce/increase/keep","reasoning":""}],"campaign_ideas":[{"campaign_name":"","platform":"Instagram/WhatsApp/Facebook","concept":"","hook":"","cta":""}],"usp_to_emphasize":["u1","u2","u3"],"competitive_response_script":"caption"}`
  );
}

/* ── Atoms ──────────────────────────────────────────────────────────────────── */
const Badge = ({ children, color="blue", size="sm" }) => {
  const C = { blue:{bg:T.blueDim,text:"#93c5fd",b:"#1d4ed8"}, amber:{bg:T.accentDim,text:T.accent,b:"#92400e"}, green:{bg:T.greenDim,text:"#4ade80",b:"#166534"}, red:{bg:T.redDim,text:"#fca5a5",b:"#991b1b"}, gray:{bg:"#1e293b",text:T.textDim,b:"#334155"}, purple:{bg:T.purpleDim,text:"#d8b4fe",b:"#7e22ce"} }[color]||{};
  return <span style={{background:C.bg,color:C.text,border:`1px solid ${C.b}`,borderRadius:4,padding:size==="xs"?"2px 6px":"3px 10px",fontSize:size==="xs"?"10px":"11px",fontFamily:T.mono,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>;
};

const Btn = ({ children, onClick, variant="primary", size="md", disabled, style:ext }) => {
  const [h,setH] = useState(false);
  const S = { sm:{padding:"6px 14px",fontSize:13}, md:{padding:"10px 20px",fontSize:14}, lg:{padding:"13px 28px",fontSize:15} }[size];
  const V = { primary:{background:h?"#f0b030":T.accent,color:"#0a0a0a"}, secondary:{background:h?T.panelHover:T.panel,color:T.text,border:`1px solid ${T.panelBorder}`}, danger:{background:h?"#dc2626":T.redDim,color:"#fca5a5",border:`1px solid #991b1b`}, ghost:{background:"transparent",color:T.textDim} }[variant];
  return <button onClick={!disabled?onClick:undefined} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{cursor:disabled?"not-allowed":"pointer",border:"none",borderRadius:6,fontFamily:T.body,fontWeight:600,transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:8,opacity:disabled?0.5:1,...S,...V,...ext}}>{children}</button>;
};

const Card = ({ children, style:s, glow }) => (
  <div style={{background:T.panel,border:`1px solid ${T.panelBorder}`,borderRadius:10,boxShadow:glow?`0 0 24px ${T.accentGlow}`:"none",...s}}>{children}</div>
);

const StatCard = ({ icon, label, value, sub, color=T.accent }) => (
  <Card style={{padding:"18px 20px",flex:1,minWidth:130}}>
    <div style={{fontSize:22,marginBottom:8}}>{icon}</div>
    <div style={{fontFamily:T.mono,fontSize:26,fontWeight:600,color,lineHeight:1}}>{value}</div>
    <div style={{fontSize:12,color:T.text,marginTop:4,fontFamily:T.body,fontWeight:500}}>{label}</div>
    {sub&&<div style={{fontSize:11,color:T.textDim,marginTop:2}}>{sub}</div>}
  </Card>
);

const Spinner = ({ size=20 }) => (
  <div style={{width:size,height:size,border:`2px solid ${T.panelBorder}`,borderTop:`2px solid ${T.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
);

const Divider = ({ label }) => (
  <div style={{display:"flex",alignItems:"center",gap:12,margin:"8px 0"}}>
    {label&&<span style={{fontSize:10,color:T.textMuted,fontFamily:T.mono,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:"0.1em"}}>{label}</span>}
    <div style={{flex:1,height:1,background:T.panelBorder}}/>
  </div>
);

const PriceChange = ({ change }) => {
  if(!change||change===0) return <span style={{color:T.textDim,fontFamily:T.mono,fontSize:12}}>—</span>;
  return <span style={{color:change<0?T.red:T.green,fontFamily:T.mono,fontSize:12,fontWeight:600}}>{change<0?"▼":"▲"} {Math.abs(change).toFixed(1)}%</span>;
};

const inputSt = (extra={}) => ({
  background:T.bg,border:`1px solid ${T.panelBorder}`,borderRadius:8,
  padding:"9px 12px",color:T.text,fontSize:13,outline:"none",fontFamily:T.body,
  boxSizing:"border-box",...extra
});

const LoginScreen = ({ onLogin }) => {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!form.email || !form.password) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onLogin({ name: form.name || form.email.split("@")[0], email: form.email });
    setLoading(false);
  };
  const inp = { width: "100%", background: T.bg, border: `1px solid ${T.panelBorder}`, borderRadius: 8, padding: "10px 14px", color: T.text, fontSize: 14, fontFamily: T.body, boxSizing: "border-box", outline: "none" };
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.body, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp 0.5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 30, fontFamily: T.heading, fontWeight: 800, color: T.accent, letterSpacing: "-0.02em" }}>⚡ INTEL<span style={{ color: T.text }}>OPS</span></div>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 4, fontFamily: T.mono, letterSpacing: "0.12em" }}>AI COMPETITOR INTELLIGENCE PLATFORM</div>
        </div>
        <Card style={{ padding: 32 }}>
          <div style={{ display: "flex", background: T.bg, borderRadius: 8, padding: 4, marginBottom: 24, gap: 4 }}>
            {["login", "register"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 13, transition: "all 0.2s", background: tab === t ? T.accent : "transparent", color: tab === t ? "#0a0a0a" : T.textDim }}>
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>
          {tab === "register" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: T.textDim, display: "block", marginBottom: 6, fontFamily: T.mono }}>FULL NAME</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rajesh Kumar" style={inp} />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: T.textDim, display: "block", marginBottom: 6, fontFamily: T.mono }}>EMAIL</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@business.com" style={inp} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, color: T.textDim, display: "block", marginBottom: 6, fontFamily: T.mono }}>PASSWORD</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handle()} style={inp} />
          </div>
          <Btn onClick={handle} disabled={loading} style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px" }}>
            {loading ? <><Spinner size={16} /> Processing…</> : tab === "login" ? "Enter Platform →" : "Create Account →"}
          </Btn>
          <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: T.textDim }}>Demo: use any email/password to proceed</div>
        </Card>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 24 }}>
          {["14-day free trial", "No credit card", "Made for India"].map(f => (
            <div key={f} style={{ fontSize: 11, color: T.textDim, display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: T.green }}>✓</span>{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SetupScreen = ({ onComplete }) => {
  const [form, setForm] = useState({ ...DEFAULT_BUSINESS });
  const [productInput, setProductInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const addProduct = () => {
    if (!productInput || !priceInput) return;
    setForm(f => ({ ...f, myProducts: [...f.myProducts, { name: productInput, price: parseFloat(priceInput) }] }));
    setProductInput(""); setPriceInput("");
  };
  const inp = (extra = {}) => ({ background: T.bg, border: `1px solid ${T.panelBorder}`, borderRadius: 8, padding: "10px 14px", color: T.text, fontSize: 14, outline: "none", fontFamily: T.body, boxSizing: "border-box", ...extra });
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.body, padding: "40px 20px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: T.accent, fontFamily: T.mono, letterSpacing: "0.12em", marginBottom: 8 }}>⚡ INTELOPS — SETUP</div>
          <div style={{ fontFamily: T.heading, fontSize: 28, fontWeight: 800, color: T.text, marginBottom: 6 }}>Set Up Your Business</div>
          <div style={{ color: T.textDim, fontSize: 14 }}>Tell us about your business so agents can build your competitive intelligence</div>
        </div>
        <Card style={{ padding: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 11, color: T.textDim, display: "block", marginBottom: 6, fontFamily: T.mono }}>BUSINESS NAME</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="CoimbatoreThreads" style={inp({ width: "100%" })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textDim, display: "block", marginBottom: 6, fontFamily: T.mono }}>LOCATION</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Coimbatore, Tamil Nadu" style={inp({ width: "100%" })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textDim, display: "block", marginBottom: 6, fontFamily: T.mono }}>WEBSITE</label>
              <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="yourstore.in" style={inp({ width: "100%" })} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 11, color: T.textDim, display: "block", marginBottom: 6, fontFamily: T.mono }}>CATEGORY</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp({ width: "100%" })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <Divider label="Your Products" />
          <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {form.myProducts.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: T.bg, borderRadius: 6, border: `1px solid ${T.panelBorder}` }}>
                <span style={{ color: T.text, fontSize: 14 }}>{p.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: T.mono, color: T.accent, fontSize: 14 }}>₹{p.price}</span>
                  <button onClick={() => setForm(f => ({ ...f, myProducts: f.myProducts.filter((_, idx) => idx !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: T.textDim, fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={productInput} onChange={e => setProductInput(e.target.value)} placeholder="Product name" style={inp({ flex: 2 })} />
            <input value={priceInput} onChange={e => setPriceInput(e.target.value)} placeholder="₹ Price" type="number" style={inp({ flex: 1 })} />
            <Btn onClick={addProduct} size="sm">+ Add</Btn>
          </div>
          <div style={{ marginTop: 24 }}>
            <Btn onClick={() => onComplete(form)} style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 15 }}>
              Launch Intelligence Platform →
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
};

const Sidebar = ({ view, setView, business, unread }) => {
  const nav = [
    {id:"dashboard",icon:"▦",label:"Dashboard"},
    {id:"competitors",icon:"◎",label:"Competitors"},
    {id:"intelligence",icon:"⚡",label:"Intelligence"},
    {id:"charts",icon:"📈",label:"Price Charts"},
    {id:"strategy",icon:"▤",label:"Strategies"},
    {id:"alerts",icon:"🔔",label:"Alerts",badge:unread},
    {id:"notifications",icon:"📲",label:"Notifications"},
  ];
  return (
    <div style={{ width: 220, background: T.panel, borderRight: `1px solid ${T.panelBorder}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.panelBorder}` }}>
        <div style={{ fontFamily: T.heading, fontSize: 18, fontWeight: 800, color: T.accent, letterSpacing: "-0.01em" }}>⚡ INTELOPS</div>
        <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.08em", marginTop: 2 }}>AI INTELLIGENCE</div>
      </div>
      <div style={{ padding: "10px 10px 0" }}>
        <div style={{ background: T.bg, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>{business.name}</div>
          <div style={{ fontSize: 11, color: T.textDim }}>{business.category}</div>
          <div style={{ fontSize: 11, color: T.textDim }}>📍 {business.location}</div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "8px 8px" }}>
        {nav.map(item => {
          const active = view === item.id;
          return (
            <button key={item.id} onClick={() => setView(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 2, background: active ? T.accentGlow : "transparent", color: active ? T.accent : T.textDim, fontFamily: T.body, fontSize: 13, fontWeight: active ? 600 : 400, transition: "all 0.15s", textAlign: "left", position: "relative" }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && <span style={{ background: T.red, color: "#fff", fontSize: 10, borderRadius: 10, padding: "1px 6px", fontFamily: T.mono }}>{item.badge}</span>}
              {active && <div style={{ position: "absolute", right: 0, top: "20%", width: 3, height: "60%", background: T.accent, borderRadius: "2px 0 0 2px" }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.panelBorder}` }}>
        <div style={{ fontSize: 10, color: T.textMuted, fontFamily: T.mono, letterSpacing: "0.05em" }}>LAST SCAN</div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>2 hours ago</div>
      </div>
    </div>
  );
};

const DashboardView = ({ business, competitors, strategies, setView }) => {
  const totalProducts = competitors.reduce((s, c) => s + c.products.length, 0);
  const priceDrops = competitors.flatMap(c => c.products.filter(p => p.change < -5)).length;
  const newLaunches = competitors.flatMap(c => c.products.filter(p => p.isNew)).length;
  const latestStrategy = strategies[strategies.length - 1];
  return (
    <div style={{ padding: 28, fontFamily: T.body, overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: T.heading, fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>Market Intelligence Dashboard</div>
        <div style={{ fontSize: 13, color: T.textDim }}>Real-time competitive monitoring for {business.name}</div>
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard icon="🎯" label="Competitors Tracked" value={competitors.length} sub="Active monitoring" color={T.blue} />
        <StatCard icon="📦" label="Products Monitored" value={totalProducts} sub="Across all competitors" color={T.accent} />
        <StatCard icon="📉" label="Price Drops" value={priceDrops} sub="In last 24h" color={T.red} />
        <StatCard icon="🚀" label="New Launches" value={newLaunches} sub="Detected this week" color={T.green} />
      </div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.panelBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.text, fontSize: 14 }}>Live Competitor Monitor</div>
          <Btn size="sm" variant="secondary" onClick={() => setView("competitors")}>Manage →</Btn>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.panelBorder}` }}>
                {["Competitor", "Product", "Their Price", "Change", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.06em", fontWeight: 400, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competitors.flatMap(c =>
                c.products.map((p, i) => (
                  <tr key={`${c.id}-${i}`} style={{ borderBottom: `1px solid ${T.panelBorder}`, transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.panelHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.status === "active" ? T.green : T.yellow, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, color: T.text }}>{p.name}</span>
                        {p.isNew && <Badge color="green" size="xs">NEW</Badge>}
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ fontFamily: T.mono, fontSize: 13, color: T.accent }}>₹{p.price}</span>
                      {p.prevPrice !== p.price && <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim, marginLeft: 6, textDecoration: "line-through" }}>₹{p.prevPrice}</span>}
                    </td>
                    <td style={{ padding: "10px 16px" }}><PriceChange change={p.change} /></td>
                    <td style={{ padding: "10px 16px" }}>
                      {p.discount !== "0%" ? <Badge color="amber">{p.discount} OFF</Badge> : <Badge color="gray">No Promo</Badge>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.panelBorder}` }}>
          <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.text, fontSize: 14 }}>My Pricing vs Competitors</div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          {business.myProducts.map((mp, i) => {
            const keyword = mp.name.toLowerCase().split(" ")[0];
            const compPrices = competitors.flatMap(c => c.products.filter(p => p.name.toLowerCase().includes(keyword)).map(p => ({ ...p, cname: c.name })));
            const cheapest = compPrices.sort((a, b) => a.price - b.price)[0];
            const pct = cheapest ? ((mp.price - cheapest.price) / cheapest.price * 100).toFixed(1) : null;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < business.myProducts.length - 1 ? `1px solid ${T.panelBorder}` : "none" }}>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{mp.name}</div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 1 }}>My price</div>
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 15, color: T.accent, fontWeight: 600 }}>₹{mp.price}</div>
                {cheapest ? (
                  <>
                    <div style={{ color: T.textDim, fontSize: 12 }}>vs</div>
                    <div style={{ flex: 2 }}>
                      <div style={{ fontSize: 12, color: T.textDim }}>{cheapest.name} · {cheapest.cname}</div>
                      <div style={{ fontFamily: T.mono, fontSize: 13, color: parseFloat(pct) > 0 ? T.red : T.green }}>
                        ₹{cheapest.price} ({pct > 0 ? "+" : ""}{pct}%)
                      </div>
                    </div>
                  </>
                ) : <div style={{ color: T.textDim, fontSize: 12, flex: 2 }}>No direct match found</div>}
              </div>
            );
          })}
        </div>
      </Card>
      {latestStrategy ? (
        <Card glow style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.accent, fontSize: 14 }}>⚡ Latest AI Strategy</div>
            <Btn size="sm" variant="secondary" onClick={() => setView("strategy")}>View All →</Btn>
          </div>
          <div style={{ fontSize: 15, color: T.text, fontWeight: 600, marginBottom: 12 }}>{latestStrategy.headline_strategy}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(latestStrategy.immediate_actions || []).slice(0, 3).map((a, i) => (
              <div key={i} style={{ background: T.bg, border: `1px solid ${T.panelBorder}`, borderRadius: 6, padding: "8px 12px", flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 10, color: T.accent, fontFamily: T.mono, marginBottom: 4 }}>ACTION {i + 1}</div>
                <div style={{ fontSize: 12, color: T.text }}>{a.action}</div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{a.timeline}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
          <div style={{ fontFamily: T.heading, fontSize: 15, color: T.text, fontWeight: 700, marginBottom: 6 }}>No Intelligence Reports Yet</div>
          <div style={{ fontSize: 13, color: T.textDim, marginBottom: 16 }}>Run the AI agent pipeline to get competitor insights and marketing strategies</div>
          <Btn onClick={() => setView("intelligence")}>Run Intelligence Agents →</Btn>
        </Card>
      )}
    </div>
  );
};

const IntelligenceView = ({ business, competitors, onComplete, addToast }) => {
  const [phase, setPhase] = useState("idle");
  const [agents, setAgents] = useState({ scout: "idle", analyst: "idle", strategist: "idle" });
  const [log, setLog] = useState([]);
  const [scoutResult, setScoutResult] = useState(null);
  const [analystResult, setAnalystResult] = useState(null);
  const [error, setError] = useState("");
  const logRef = useRef(null);
  const addLog = useCallback((msg, type = "info") => {
    setLog(l => [...l, { msg, type, ts: new Date().toLocaleTimeString() }]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 60);
  }, []);
  const run = async () => {
    setPhase("running"); setLog([]); setError("");
    setAgents({ scout: "idle", analyst: "idle", strategist: "idle" });
    setScoutResult(null); setAnalystResult(null);
    try {
      setAgents(a => ({ ...a, scout: "running" }));
      addLog("🔍 Scout Agent initializing…", "system");
      addLog(`Scanning ${competitors.length} competitors, ${competitors.reduce((s, c) => s + c.products.length, 0)} products…`);
      await new Promise(r => setTimeout(r, 500));
      addLog("Extracting price data, promotions and new launches…");
      const scout = await runScoutAgent(competitors, business);
      setScoutResult(scout);
      setAgents(a => ({ ...a, scout: "done" }));
      addLog(`✅ Scout complete: ${scout.scan_summary}`, "success");
      addLog(`🌡️ Market temp: ${(scout.market_temperature || "").toUpperCase()} · Urgency: ${(scout.urgency_level || "").toUpperCase()}`, "data");
      (scout.key_findings || []).forEach(f => addLog(`  → ${f}`, "finding"));
      await new Promise(r => setTimeout(r, 400));
      setAgents(a => ({ ...a, analyst: "running" }));
      addLog("📊 Analyst Agent initializing…", "system");
      addLog("Comparing competitor data with your business profile…");
      await new Promise(r => setTimeout(r, 500));
      const analyst = await runAnalystAgent(business, scout);
      setAnalystResult(analyst);
      setAgents(a => ({ ...a, analyst: "done" }));
      addLog(`✅ Analyst complete: Position = ${(analyst.competitive_position || "").toUpperCase()}`, "success");
      addLog(`⚠️ Risk: ${analyst.risk_score}/10 · Opportunity: ${analyst.opportunity_score}/10`, "data");
      (analyst.immediate_threats || []).slice(0, 2).forEach(t => addLog(`  🔴 ${t.threat}`, "threat"));
      (analyst.opportunities || []).slice(0, 2).forEach(o => addLog(`  💡 ${o.opportunity}`, "opportunity"));
      await new Promise(r => setTimeout(r, 400));
      setAgents(a => ({ ...a, strategist: "running" }));
      addLog("🎯 Strategist Agent initializing…", "system");
      addLog("Generating tailored marketing strategies…");
      await new Promise(r => setTimeout(r, 500));
      const strat = await runStrategistAgent(business, analyst);
      setAgents(a => ({ ...a, strategist: "done" }));
      addLog(`✅ Strategist complete!`, "success");
      addLog(`💡 "${strat.headline_strategy}"`, "action");
      (strat.immediate_actions || []).slice(0, 3).forEach((a, i) => addLog(`  ${i + 1}. [${a.timeline}] ${a.action}`, "action"));
      setPhase("done");
      addLog("🏁 Intelligence pipeline complete. Strategies ready.", "system");
      onComplete(strat);
    } catch (e) {
      setPhase("error"); setError(e.message);
      addLog(`❌ Error: ${e.message}`, "error");
    }
  };
  const agentConfig = [
    { key: "scout", icon: "🔍", label: "Scout Agent", desc: "Scrapes & processes competitor data" },
    { key: "analyst", icon: "📊", label: "Analyst Agent", desc: "Identifies threats & opportunities" },
    { key: "strategist", icon: "🎯", label: "Strategist Agent", desc: "Generates marketing strategies" },
  ];
  const logColors = { system: T.accent, success: T.green, error: T.red, data: "#93c5fd", threat: "#fca5a5", opportunity: "#4ade80", action: T.text, finding: T.textDim };
  return (
    <div style={{ padding: 28, fontFamily: T.body, overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: T.heading, fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>Intelligence Pipeline</div>
        <div style={{ fontSize: 13, color: T.textDim }}>Three AI agents work in sequence: Scout → Analyst → Strategist</div>
      </div>
      <Card style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {agentConfig.map((ag, idx) => {
            const st = agents[ag.key];
            const cols = { idle: { bg: T.bg, border: T.panelBorder, text: T.textDim }, running: { bg: T.accentGlow, border: T.accent, text: T.accent }, done: { bg: "#14532d", border: T.green, text: T.green } };
            const c = cols[st] || cols.idle;
            return (
              <div key={ag.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ flex: 1, border: `2px solid ${c.border}`, borderRadius: 10, padding: "14px 12px", background: c.bg, transition: "all 0.4s", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8, display: "flex", justifyContent: "center", alignItems: "center", height: 36 }}>
                    {st === "running" ? <Spinner size={28} /> : ag.icon}
                  </div>
                  <div style={{ fontFamily: T.heading, fontSize: 12, fontWeight: 700, color: c.text, marginBottom: 3 }}>{ag.label}</div>
                  <div style={{ fontSize: 10, color: T.textDim, marginBottom: 8 }}>{ag.desc}</div>
                  <Badge color={st === "done" ? "green" : st === "running" ? "amber" : "gray"} size="xs">
                    {st === "running" ? "ACTIVE" : st === "done" ? "COMPLETE" : "STANDBY"}
                  </Badge>
                </div>
                {idx < 2 && <div style={{ padding: "0 6px", color: st === "done" ? T.green : T.textMuted, fontSize: 20, fontWeight: 700 }}>→</div>}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 12 }}>
          <Btn onClick={run} disabled={phase === "running"} size="lg">
            {phase === "running" ? <><Spinner size={16} />Agents Running…</> : phase === "done" ? "🔄 Run Again" : "⚡ Launch Intelligence Pipeline"}
          </Btn>
        </div>
        {phase === "error" && <div style={{ color: T.red, fontSize: 12, marginTop: 10, textAlign: "center", fontFamily: T.mono }}>{error}</div>}
      </Card>
      {log.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.panelBorder}`, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>{["#ef4444", "#fbbf24", "#22c55e"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}</div>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.textDim }}>agent.log</span>
          </div>
          <div ref={logRef} style={{ padding: "12px 16px", fontFamily: T.mono, fontSize: 12, maxHeight: 260, overflowY: "auto", background: "#030507" }}>
            {log.map((l, i) => (
              <div key={i} style={{ marginBottom: 3, display: "flex", gap: 10 }}>
                <span style={{ color: T.textMuted, flexShrink: 0 }}>{l.ts}</span>
                <span style={{ color: logColors[l.type] || T.text }}>{l.msg}</span>
              </div>
            ))}
            {phase === "running" && <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center", color: T.accent }}><Spinner size={11} /><span>Processing…</span></div>}
          </div>
        </Card>
      )}
      {scoutResult && (
        <Card style={{ marginBottom: 14, padding: 20 }}>
          <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.green, fontSize: 13, marginBottom: 10 }}>🔍 Scout Report</div>
          <div style={{ fontSize: 13, color: T.text, marginBottom: 10 }}>{scoutResult.scan_summary}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <Badge color="amber">Market: {(scoutResult.market_temperature || "").toUpperCase()}</Badge>
            <Badge color={scoutResult.urgency_level === "high" ? "red" : "blue"}>Urgency: {(scoutResult.urgency_level || "").toUpperCase()}</Badge>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {["price_threats", "new_launches", "active_promotions"].map(key =>
              (scoutResult[key] || []).length > 0 && (
                <div key={key} style={{ background: T.bg, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{key.replace(/_/g, " ")}</div>
                  {scoutResult[key].slice(0, 3).map((item, i) => (
                    <div key={i} style={{ fontSize: 11, color: T.text, marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${T.accent}` }}>
                      {item.competitor || ""}{item.product ? ` — ${item.product}` : ""}{item.promotion ? ` — ${item.promotion}` : ""}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </Card>
      )}
      {analystResult && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.blue, fontSize: 13, marginBottom: 10 }}>📊 Analyst Report</div>
          <div style={{ fontSize: 13, color: T.text, marginBottom: 12 }}>{analystResult.executive_summary}</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            {[{ label: "Risk Score", val: `${analystResult.risk_score}/10`, color: analystResult.risk_score >= 7 ? T.red : analystResult.risk_score >= 4 ? T.yellow : T.green },
              { label: "Opportunity", val: `${analystResult.opportunity_score}/10`, color: T.green },
              { label: "Position", val: (analystResult.competitive_position || "").toUpperCase(), color: T.accent }].map(({ label, val, color }) => (
              <div key={label} style={{ background: T.bg, borderRadius: 8, padding: "10px 16px", textAlign: "center", flex: 1, minWidth: 90 }}>
                <div style={{ fontFamily: T.mono, fontSize: 18, color, fontWeight: 600 }}>{val}</div>
                <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: T.red, fontFamily: T.mono, marginBottom: 6, letterSpacing: "0.06em" }}>⚠ THREATS</div>
              {(analystResult.immediate_threats || []).map((t, i) => <div key={i} style={{ fontSize: 11, color: T.text, marginBottom: 5, paddingLeft: 8, borderLeft: `2px solid ${T.red}` }}>{t.threat}</div>)}
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.green, fontFamily: T.mono, marginBottom: 6, letterSpacing: "0.06em" }}>💡 OPPORTUNITIES</div>
              {(analystResult.opportunities || []).map((o, i) => <div key={i} style={{ fontSize: 11, color: T.text, marginBottom: 5, paddingLeft: 8, borderLeft: `2px solid ${T.green}` }}>{o.opportunity}</div>)}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

const StrategyView = ({ strategies, setView, addToast }) => {
  const s = strategies[strategies.length - 1];
  if (!s) return (
    <div style={{ padding: 40, fontFamily: T.body, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
      <div style={{ fontFamily: T.heading, fontSize: 18, color: T.text, fontWeight: 700, marginBottom: 8 }}>No Strategies Yet</div>
      <div style={{ color: T.textDim, marginBottom: 20 }}>Run the Intelligence Pipeline to generate AI-powered strategies</div>
      <Btn onClick={() => setView("intelligence")}>Run Intelligence Pipeline →</Btn>
    </div>
  );
  return (
    <div style={{ padding: 28, fontFamily: T.body, overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: T.heading, fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>Strategy Recommendations</div>
        <div style={{ fontSize: 13, color: T.textDim }}>AI-generated strategies from your latest intelligence run</div>
      </div>
      <Card glow style={{ padding: 24, marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: T.accent, fontFamily: T.mono, marginBottom: 8, letterSpacing: "0.12em" }}>HEADLINE STRATEGY</div>
        <div style={{ fontFamily: T.heading, fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1.4, marginBottom: 10 }}>{s.headline_strategy}</div>
        <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.7 }}>{s.strategic_rationale}</div>
      </Card>
      <Card style={{ padding: 20, marginBottom: 16, gridColumn: "1/-1" }}>
        <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.text, fontSize: 14, marginBottom: 14 }}>⚡ Immediate Actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(s.immediate_actions || []).map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: T.bg, borderRadius: 8, border: `1px solid ${T.panelBorder}` }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.accentGlow, border: `2px solid ${T.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontSize: 12, color: T.accent, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 3 }}>{a.action}</div>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>{a.rationale}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge color={a.impact === "high" ? "amber" : a.impact === "medium" ? "blue" : "gray"} size="xs">{a.impact} impact</Badge>
                  <Badge color="gray" size="xs">{a.timeline}</Badge>
                  {a.estimated_cost && <Badge color="green" size="xs">{a.estimated_cost}</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.text, fontSize: 14, marginBottom: 14 }}>💰 Pricing Strategy</div>
          {(s.pricing_recommendations || []).map((p, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "10px 12px", background: T.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 500, marginBottom: 4 }}>{p.product}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: T.mono, color: T.textDim, textDecoration: "line-through", fontSize: 12 }}>₹{p.current_price}</span>
                <span style={{ color: T.textDim }}>→</span>
                <span style={{ fontFamily: T.mono, color: T.accent, fontSize: 15, fontWeight: 600 }}>₹{p.recommended_price}</span>
                <Badge color={p.change_type === "reduce" ? "red" : p.change_type === "increase" ? "green" : "gray"} size="xs">{p.change_type}</Badge>
              </div>
              <div style={{ fontSize: 11, color: T.textDim }}>{p.reasoning}</div>
            </div>
          ))}
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.text, fontSize: 14, marginBottom: 14 }}>📣 Campaign Ideas</div>
          {(s.campaign_ideas || []).map((c, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "10px 12px", background: T.bg, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>{c.campaign_name}</span>
                <Badge color="blue" size="xs">{c.platform}</Badge>
              </div>
              <div style={{ fontSize: 11, color: T.text, marginBottom: 3 }}>{c.concept}</div>
              <div style={{ fontSize: 11, color: T.green }}>CTA: {c.cta}</div>
            </div>
          ))}
        </Card>
      </div>
      {(s.usp_to_emphasize || []).length > 0 && (
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.text, fontSize: 14, marginBottom: 12 }}>🌟 Competitive Advantages to Highlight</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {s.usp_to_emphasize.map((u, i) => (
              <div key={i} style={{ background: T.accentGlow, border: `1px solid ${T.accentDim}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, color: T.accent }}>{u}</div>
            ))}
          </div>
        </Card>
      )}
      {s.competitive_response_script && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.text, fontSize: 14, marginBottom: 10 }}>📱 Ready-to-Post Caption</div>
          <div style={{ background: T.bg, borderRadius: 8, padding: "14px 16px", fontSize: 13, color: T.text, lineHeight: 1.7, fontStyle: "italic", borderLeft: `3px solid ${T.accent}` }}>
            {s.competitive_response_script}
          </div>
          <Btn variant="secondary" size="sm" style={{ marginTop: 10 }} onClick={() => { navigator.clipboard?.writeText(s.competitive_response_script); addToast({type:"success",title:"Copied!",message:"Caption copied to clipboard."}); }}>
            📋 Copy Caption
          </Btn>
        </Card>
      )}
    </div>
  );
};

const CompetitorsView = ({ competitors, setCompetitors, addToast }) => {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", website: "" });
  const addCompetitor = () => {
    if (!form.name || !form.website) return;
    setCompetitors(prev => [...prev, { id: Date.now(), name: form.name, website: form.website, category: "General", status: "monitoring", lastScan: "Never", scanCount: 0, products: [] }]);
    setForm({ name: "", website: "" }); setAdding(false);
  };
  const inp = { background: T.bg, border: `1px solid ${T.panelBorder}`, borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ padding: 28, fontFamily: T.body, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: T.heading, fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>Competitor Management</div>
          <div style={{ fontSize: 13, color: T.textDim }}>{competitors.length} competitors being monitored</div>
        </div>
        <Btn onClick={() => setAdding(true)}>+ Add Competitor</Btn>
      </div>
      {adding && (
        <Card style={{ padding: 20, marginBottom: 20, border: `1px solid ${T.accent}` }}>
          <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.accent, marginBottom: 14, fontSize: 14 }}>New Competitor</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 11, color: T.textDim, display: "block", marginBottom: 5, fontFamily: T.mono }}>BUSINESS NAME</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="StyleHub" style={{ ...inp, width: "100%" }} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 11, color: T.textDim, display: "block", marginBottom: 5, fontFamily: T.mono }}>WEBSITE URL</label>
              <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="stylehub.in" style={{ ...inp, width: "100%" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={addCompetitor}>Add & Monitor</Btn>
            <Btn variant="secondary" onClick={() => { setAdding(false); setForm({ name: "", website: "" }); }}>Cancel</Btn>
          </div>
        </Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {competitors.map(c => (
          <Card key={c.id} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentGlow, border: `1px solid ${T.accentDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.heading, fontWeight: 800, color: T.accent, fontSize: 16 }}>
                  {c.name[0]}
                </div>
                <div>
                  <div style={{ fontFamily: T.heading, fontWeight: 700, color: T.text, fontSize: 15 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: T.textDim }}>🔗 {c.website}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge color={c.status === "active" ? "green" : "gray"}>{c.status}</Badge>
                <Btn variant="danger" size="sm" onClick={() => setCompetitors(prev => prev.filter(x => x.id !== c.id))}>Remove</Btn>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: c.products.length ? 14 : 0, flexWrap: "wrap" }}>
              {[["PRODUCTS", c.products.length, T.accent], ["LAST SCAN", c.lastScan, T.text], ["SCANS", c.scanCount, T.text]].map(([label, val, color]) => (
                <div key={label} style={{ background: T.bg, borderRadius: 6, padding: "6px 12px" }}>
                  <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono }}>{label}</div>
                  <div style={{ fontFamily: T.mono, color, fontSize: 14, fontWeight: 600, marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
            {c.products.length > 0 && (
              <>
                <Divider label={`${c.products.length} products`} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {c.products.map((p, i) => (
                    <div key={i} style={{ background: T.bg, border: `1px solid ${T.panelBorder}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: T.text }}>{p.name}</span>
                      <span style={{ fontFamily: T.mono, color: T.accent }}>₹{p.price}</span>
                      {p.change < -5 && <span style={{ color: T.red, fontSize: 11 }}>↓{Math.abs(p.change).toFixed(0)}%</span>}
                      {p.isNew && <Badge color="green" size="xs">NEW</Badge>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ── TOAST ────────────────────────────────────────────────────────────────── */
const Toast = ({ toasts }) => (
  <div style={{position:"fixed",bottom:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
    {toasts.map(t=>(
      <div key={t.id} style={{background:T.panel,border:`1px solid ${t.type==="success"?T.green:t.type==="warning"?T.yellow:T.accent}`,borderRadius:8,padding:"12px 16px",minWidth:260,maxWidth:340,animation:"slideIn 0.3s ease",boxShadow:`0 4px 20px rgba(0,0,0,0.4)`}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{fontSize:18}}>{t.type==="success"?"✅":t.type==="warning"?"⚠️":"📨"}</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:3}}>{t.title}</div>
            <div style={{fontSize:12,color:T.textDim,lineHeight:1.5}}>{t.message}</div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ── PRICE CHARTS ──────────────────────────────────────────────────────────── */
const CHART_COLORS = ["#e8a020","#3b82f6","#22c55e","#a855f7","#f97316","#ec4899"];
const PriceChartsView = ({ competitors }) => {
  const [selectedComp, setSelectedComp] = useState(competitors[0]?.id);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const comp = competitors.find(c=>c.id===selectedComp);
  useEffect(()=>{ if(comp?.products?.length) setSelectedProduct(comp.products[0].id); },[selectedComp]);
  const product = comp?.products?.find(p=>p.id===selectedProduct);
  const allDates = comp?.products?.[0]?.history?.map(h=>h.date)||[];
  const combinedData = allDates.map((date,i)=>({
    date,
    ...(comp?.products||[]).reduce((acc,p)=>({ ...acc, [p.name]: p.history?.[i]?.price||null }),{}),
  }));
  return (
    <div style={{padding:28,fontFamily:T.body,overflowY:"auto",height:"100%"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:T.heading,fontSize:22,fontWeight:800,color:T.text,marginBottom:4}}>Price History Charts</div>
        <div style={{fontSize:13,color:T.textDim}}>Track how competitor prices have moved over the last 14 days</div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {competitors.map(c=>(
          <button key={c.id} onClick={()=>setSelectedComp(c.id)} style={{padding:"8px 16px",borderRadius:20,border:`1px solid ${selectedComp===c.id?T.accent:T.panelBorder}`,background:selectedComp===c.id?T.accentGlow:T.panel,color:selectedComp===c.id?T.accent:T.textDim,cursor:"pointer",fontFamily:T.body,fontSize:13,fontWeight:selectedComp===c.id?600:400,transition:"all 0.15s"}}>
            {c.name}
          </button>
        ))}
      </div>
      {comp&&(
        <>
          <Card style={{padding:20,marginBottom:20}}>
            <div style={{fontFamily:T.heading,fontWeight:700,color:T.text,fontSize:14,marginBottom:4}}>{comp.name} — All Products Price Trend</div>
            <div style={{fontSize:12,color:T.textDim,marginBottom:16}}>14-day price movement across all tracked products</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={combinedData} margin={{top:5,right:20,bottom:5,left:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.panelBorder}/>
                <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:10,fontFamily:T.mono}} tickLine={false} axisLine={{stroke:T.panelBorder}}/>
                <YAxis tick={{fill:T.textDim,fontSize:10,fontFamily:T.mono}} tickLine={false} axisLine={false} tickFormatter={v=>`₹${v}`} width={55}/>
                <Tooltip contentStyle={{background:T.panel,border:`1px solid ${T.panelBorder}`,borderRadius:8,fontFamily:T.body}} labelStyle={{color:T.text,fontSize:12}} formatter={(v,name)=>[`₹${v}`,name]}/>
                <Legend wrapperStyle={{fontSize:11,fontFamily:T.mono,paddingTop:8}} iconType="circle"/>
                {(comp.products||[]).map((p,i)=>(
                  <Line key={p.id} type="monotone" dataKey={p.name} stroke={CHART_COLORS[i%CHART_COLORS.length]} strokeWidth={2} dot={false} activeDot={{r:4}}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card style={{padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontFamily:T.heading,fontWeight:700,color:T.text,fontSize:14}}>Product Deep-Dive</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(comp.products||[]).map((p,i)=>(
                  <button key={p.id} onClick={()=>setSelectedProduct(p.id)} style={{padding:"5px 12px",borderRadius:16,border:`1px solid ${selectedProduct===p.id?CHART_COLORS[i%CHART_COLORS.length]:T.panelBorder}`,background:selectedProduct===p.id?`${CHART_COLORS[i%CHART_COLORS.length]}20`:T.bg,color:selectedProduct===p.id?CHART_COLORS[i%CHART_COLORS.length]:T.textDim,cursor:"pointer",fontFamily:T.mono,fontSize:11,transition:"all 0.15s"}}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            {product&&(
              <>
                <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
                  {[
                    {label:"Current Price",val:`₹${product.price}`,color:T.accent},
                    {label:"Previous Price",val:`₹${product.prevPrice}`,color:T.textDim},
                    {label:"Change",val:`${product.change>0?"+":""}${product.change}%`,color:product.change<0?T.red:product.change>0?T.green:T.textDim},
                    {label:"Discount",val:product.discount,color:T.yellow},
                  ].map(({label,val,color})=>(
                    <div key={label} style={{background:T.bg,borderRadius:8,padding:"10px 16px",flex:1,minWidth:110}}>
                      <div style={{fontSize:10,color:T.textDim,fontFamily:T.mono,marginBottom:4}}>{label}</div>
                      <div style={{fontFamily:T.mono,fontSize:16,color,fontWeight:600}}>{val}</div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={product.history} margin={{top:5,right:20,bottom:5,left:10}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.panelBorder}/>
                    <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:10,fontFamily:T.mono}} tickLine={false} axisLine={{stroke:T.panelBorder}}/>
                    <YAxis tick={{fill:T.textDim,fontSize:10,fontFamily:T.mono}} tickLine={false} axisLine={false} tickFormatter={v=>`₹${v}`} width={55} domain={["auto","auto"]}/>
                    <Tooltip contentStyle={{background:T.panel,border:`1px solid ${T.panelBorder}`,borderRadius:8,fontFamily:T.body}} formatter={v=>[`₹${v}`,"Price"]}/>
                    <Line type="monotone" dataKey="price" stroke={T.accent} strokeWidth={2.5} dot={{r:3,fill:T.accent}} activeDot={{r:5}}/>
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </Card>
        </>
      )}
      {!comp&&<div style={{color:T.textDim,textAlign:"center",marginTop:40}}>No competitors to chart</div>}
    </div>
  );
};

/* ── NOTIFICATIONS VIEW ────────────────────────────────────────────────────── */
const NotificationsView = ({ notifSettings, setNotifSettings, addToast }) => {
  const [form, setForm] = useState({ ...notifSettings });
  const [testing, setTesting] = useState(null);
  const save = () => {
    setNotifSettings(form);
    addToast({ type:"success", title:"Settings Saved", message:"Notification preferences updated." });
  };
  const inp = inputSt({width:"100%"});
  return (
    <div style={{padding:28,fontFamily:T.body,overflowY:"auto",height:"100%"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:T.heading,fontSize:22,fontWeight:800,color:T.text,marginBottom:4}}>Notification Settings</div>
        <div style={{fontSize:13,color:T.textDim}}>Get instant alerts on WhatsApp or Email when competitors change prices</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        <Card style={{padding:22,border:form.whatsappEnabled?`1px solid #25D366`:`1px solid ${T.panelBorder}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <div style={{fontSize:28}}>💬</div>
            <div><div style={{fontFamily:T.heading,fontSize:14,fontWeight:700,color:T.text}}>WhatsApp Alerts</div><div style={{fontSize:12,color:T.textDim}}>Instant messages</div></div>
            <label style={{marginLeft:"auto",cursor:"pointer",position:"relative",display:"inline-block",width:42,height:24}}>
              <input type="checkbox" checked={form.whatsappEnabled} onChange={e=>setForm(f=>({...f,whatsappEnabled:e.target.checked}))} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:form.whatsappEnabled?"#25D366":T.textMuted,borderRadius:12,transition:"0.3s"}}>
                <span style={{position:"absolute",height:18,width:18,left:form.whatsappEnabled?20:3,bottom:3,background:"#fff",borderRadius:"50%",transition:"0.3s"}}/>
              </span>
            </label>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:T.textDim,display:"block",marginBottom:6,fontFamily:T.mono}}>PHONE (with country code)</label>
            <input value={form.whatsappNumber} onChange={e=>setForm(f=>({...f,whatsappNumber:e.target.value}))} placeholder="+91 98765 43210" style={inp} disabled={!form.whatsappEnabled}/>
          </div>
          <Btn size="sm" variant="secondary" onClick={async()=>{setTesting("wa"); await new Promise(r=>setTimeout(r,800)); const msg=encodeURIComponent("⚡ *IntelOps Alert Test*\n\nCompetitor price drop detected."); window.open(`https://wa.me/${form.whatsappNumber?.replace(/\D/g,"")}?text=${msg}`,"_blank"); setTesting(null);}} disabled={!form.whatsappEnabled||!form.whatsappNumber||testing==="wa"} style={{width:"100%",justifyContent:"center"}}>
            {testing==="wa"?<><Spinner size={14}/>Opening…</>:"📨 Send Test"}
          </Btn>
        </Card>
        <Card style={{padding:22,border:form.emailEnabled?`1px solid ${T.blue}`:`1px solid ${T.panelBorder}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <div style={{fontSize:28}}>📧</div>
            <div><div style={{fontFamily:T.heading,fontSize:14,fontWeight:700,color:T.text}}>Email Alerts</div><div style={{fontSize:12,color:T.textDim}}>Daily digest</div></div>
            <label style={{marginLeft:"auto",cursor:"pointer",position:"relative",display:"inline-block",width:42,height:24}}>
              <input type="checkbox" checked={form.emailEnabled} onChange={e=>setForm(f=>({...f,emailEnabled:e.target.checked}))} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:form.emailEnabled?T.blue:T.textMuted,borderRadius:12,transition:"0.3s"}}>
                <span style={{position:"absolute",height:18,width:18,left:form.emailEnabled?20:3,bottom:3,background:"#fff",borderRadius:"50%",transition:"0.3s"}}/>
              </span>
            </label>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:T.textDim,display:"block",marginBottom:6,fontFamily:T.mono}}>EMAIL ADDRESS</label>
            <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="you@business.com" style={inp} disabled={!form.emailEnabled}/>
          </div>
          <Btn size="sm" variant="secondary" onClick={async()=>{setTesting("em"); await new Promise(r=>setTimeout(r,800)); addToast({type:"success",title:"Test Email",message:`Would send to ${form.email}`}); setTesting(null);}} disabled={!form.emailEnabled||!form.email||testing==="em"} style={{width:"100%",justifyContent:"center"}}>
            {testing==="em"?<><Spinner size={14}/>Sending…</>:"📨 Send Test"}
          </Btn>
        </Card>
      </div>
      <Card style={{padding:22,marginBottom:20}}>
        <div style={{fontFamily:T.heading,fontWeight:700,color:T.text,fontSize:14,marginBottom:12}}>Alert Triggers</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            {key:"alertPriceDrop",icon:"📉",label:"Price Drop Alerts",desc:"When competitor drops > threshold"},
            {key:"alertNewLaunch",icon:"🚀",label:"New Product Alerts",desc:"New products detected"},
          ].map(({key,icon,label,desc})=>(
            <label key={key} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"12px 14px",background:T.bg,borderRadius:8,border:`1px solid ${form[key]?T.accentDim:T.panelBorder}`}}>
              <input type="checkbox" checked={form[key]||false} onChange={e=>setForm(f=>({...f,[key]:e.target.checked}))} style={{marginTop:2,accentColor:T.accent}}/>
              <div>
                <div style={{fontSize:13,color:T.text,fontWeight:500}}>{icon} {label}</div>
                <div style={{fontSize:11,color:T.textDim,marginTop:2}}>{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>
      <div style={{display:"flex",gap:12}}>
        <Btn onClick={save} size="lg">💾 Save Settings</Btn>
      </div>
    </div>
  );
};

/* ── ALERTS VIEW ───────────────────────────────────────────────────────────── */
const AlertsView = ({ notifSettings, addToast }) => {
  const [alerts,setAlerts]=useState([
    {id:1,type:"price_drop",competitor:"TrendWear",product:"Graphic Tee Bundle",message:"Price dropped from ₹699 to ₹449 (-35.8%)",time:"30m ago",severity:"high",read:false},
    {id:2,type:"price_drop",competitor:"StyleHub",product:"Cotton T-Shirt Pack",message:"Price dropped from ₹799 to ₹599 (-25%)",time:"1h ago",severity:"medium",read:false},
    {id:3,type:"new_launch",competitor:"TrendWear",product:"Cargo Pants",message:"New product detected: Cargo Pants at ₹1,499",time:"3h ago",severity:"medium",read:false},
    {id:4,type:"price_drop",competitor:"StyleHub",product:"Oversized Hoodie",message:"Price dropped from ₹1,199 to ₹999 (-15%)",time:"2h ago",severity:"high",read:true},
    {id:5,type:"promotion",competitor:"UrbanThreads",product:"Winter Jacket",message:"28% discount — ₹3,499 → ₹2,499",time:"4h ago",severity:"low",read:true},
  ]);
  const icons={price_drop:"📉",new_launch:"🚀",promotion:"🏷️"};
  const sevC={high:T.red,medium:T.yellow,low:T.blue};
  const unread=alerts.filter(a=>!a.read).length;
  const markRead=(id)=>setAlerts(p=>p.map(a=>a.id===id?{...a,read:true}:a));
  const markAllRead=()=>setAlerts(p=>p.map(a=>({...a,read:true})));
  const fwdAlert=async(a)=>{
    if(!notifSettings.whatsappEnabled&&!notifSettings.emailEnabled){addToast({type:"warning",title:"No channels",message:"Enable WhatsApp or Email first."}); return;}
    if(notifSettings.whatsappEnabled&&notifSettings.whatsappNumber){
      const msg=encodeURIComponent(`⚡ *IntelOps Alert*\n\n${icons[a.type]} *${a.competitor}* — ${a.product}\n${a.message}`);
      window.open(`https://wa.me/${notifSettings.whatsappNumber.replace(/\D/g,"")}?text=${msg}`,"_blank");
    }
    addToast({type:"success",title:"Alert Forwarded",message:"Sent to notification channels."});
  };
  return (
    <div style={{padding:28,fontFamily:T.body,overflowY:"auto",height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <div style={{fontFamily:T.heading,fontSize:22,fontWeight:800,color:T.text,marginBottom:4}}>Competitor Alerts</div>
          <div style={{fontSize:13,color:T.textDim}}>{unread} unread · {alerts.length} total</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {unread>0&&<Btn size="sm" variant="secondary" onClick={markAllRead}>Mark All Read</Btn>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {alerts.map(a=>(
          <Card key={a.id} style={{padding:"14px 18px",borderLeft:`3px solid ${sevC[a.severity]}`,opacity:a.read?0.7:1,transition:"opacity 0.2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start",flex:1}}>
                <span style={{fontSize:20}}>{icons[a.type]}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:600,color:T.text}}>{a.competitor}</span>
                    <span style={{color:T.textDim}}>·</span>
                    <span style={{fontSize:12,color:T.textDim}}>{a.product}</span>
                    <Badge color={a.severity==="high"?"red":a.severity==="medium"?"amber":"blue"} size="xs">{a.severity}</Badge>
                    {!a.read&&<Badge color="purple" size="xs">NEW</Badge>}
                  </div>
                  <div style={{fontSize:13,color:T.text,marginBottom:8}}>{a.message}</div>
                  <div style={{display:"flex",gap:8}}>
                    {!a.read&&<Btn size="sm" variant="secondary" onClick={()=>markRead(a.id)}>✓ Mark Read</Btn>}
                    <Btn size="sm" variant="secondary" onClick={()=>fwdAlert(a)}>📲 Forward</Btn>
                  </div>
                </div>
              </div>
              <span style={{fontSize:11,color:T.textDim,fontFamily:T.mono,flexShrink:0,marginLeft:12}}>{a.time}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [competitors, setCompetitors] = useState(INIT_COMPETITORS);
  const [strategies, setStrategies] = useState([]);
  const [view, setView] = useState("dashboard");
  const [notifSettings, setNotifSettings] = useState({
    whatsappEnabled:false, whatsappNumber:"", emailEnabled:false, email:"",
    alertPriceDrop:true, alertNewLaunch:true, alertPromotion:false, alertDaily:false, threshold:10,
  });
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((t) => {
    const id = Date.now();
    setToasts(p=>[...p,{...t,id}]);
    setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)), 3500);
  },[]);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `*{box-sizing:border-box;margin:0;padding:0}body{background:${T.bg};color:${T.text}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:${T.bg}}::-webkit-scrollbar-thumb{background:${T.panelBorder};border-radius:3px}input,select{outline:none}`;
    document.head.appendChild(style);
  }, []);

  if (screen === "login") return <LoginScreen onLogin={u => { setUser(u); setScreen("setup"); }} />;
  if (screen === "setup") return <SetupScreen onComplete={b => { setBusiness(b); setScreen("main"); }} />;

  const unread = 5;
  const views = {
    dashboard:     <DashboardView business={business} competitors={competitors} strategies={strategies} setView={setView} />,
    competitors:   <CompetitorsView competitors={competitors} setCompetitors={setCompetitors} addToast={addToast} />,
    intelligence:  <IntelligenceView business={business} competitors={competitors} onComplete={s=>{ setStrategies(p=>[...p,s]); setView("strategy"); }} addToast={addToast} />,
    charts:        <PriceChartsView competitors={competitors} />,
    strategy:      <StrategyView strategies={strategies} setView={setView} addToast={addToast} />,
    alerts:        <AlertsView notifSettings={notifSettings} addToast={addToast} />,
    notifications: <NotificationsView notifSettings={notifSettings} setNotifSettings={setNotifSettings} addToast={addToast} />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: T.body, overflow: "hidden" }}>
      <Sidebar view={view} setView={setView} business={business} unread={unread} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ background: T.panel, borderBottom: `1px solid ${T.panelBorder}`, padding: "11px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}` }} />
            <span style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>LIVE MONITORING</span>
            <span style={{ color: T.textMuted, fontFamily: T.mono }}>·</span>
            <span style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>{competitors.length} COMPETITORS · {competitors.reduce((s, c) => s + c.products.length, 0)} PRODUCTS</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg, borderRadius: 20, padding: "5px 12px", border: `1px solid ${T.panelBorder}` }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: T.accentGlow, border: `1px solid ${T.accentDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.accent, fontWeight: 700 }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: T.text }}>{user?.name}</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>{views[view]}</div>
      </div>
      <Toast toasts={toasts} />
    </div>
  );
}

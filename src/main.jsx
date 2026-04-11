import React from “react”
import { useState, useEffect, useCallback, useRef } from “react”
import ReactDOM from “react-dom/client”

// ╔══════════════════════════════════════════════════════════════╗
// ║  SUPABASE CONFIG                                            ║
// ╚══════════════════════════════════════════════════════════════╝
const SUPABASE_URL = “https://nociphzezdjzumznesya.supabase.co”;
const SUPABASE_ANON_KEY = “eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vY2lwaHplemRqenVtem5lc3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzM4MjAsImV4cCI6MjA5MTQwOTgyMH0.0WZxfZE8I2cZHAG55N2XMxdxYTpsh06yqtcpBxB5RIQ”;

// Supabase anon key — selamat di frontend, dilindungi oleh RLS

const ADMIN_PASS = “sal2026”; // ← TUKAR password ini sebelum deploy!

const WORKSHOP = {
name: “SALSPRAYWORKLEGACY”,
address: “32, Jalan Setia 4/6, Taman Setia Indah, 81100 Johor Bahru, Johor Darul Ta’zim”,
phone: “012-601 6205”,
whatsapp: “60126016205”,
};

// Lightweight Supabase REST client
const sb = {
from: (table) => {
const headers = {
apikey: SUPABASE_ANON_KEY,
Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
“Content-Type”: “application/json”,
Prefer: “return=representation”,
};
const base = `${SUPABASE_URL}/rest/v1/${table}`;
return {
select: async (order = “created_at.desc”) => {
const r = await fetch(`${base}?select=*&order=${order}`, { headers });
return r.ok ? { data: await r.json(), error: null } : { data: [], error: await r.json() };
},
insert: async (rows) => {
const r = await fetch(base, { method: “POST”, headers, body: JSON.stringify(rows) });
return r.ok ? { data: await r.json(), error: null } : { data: null, error: await r.json() };
},
update: (updates) => ({
eq: async (col, val) => {
const r = await fetch(`${base}?${col}=eq.${val}`, { method: “PATCH”, headers, body: JSON.stringify(updates) });
return r.ok ? { data: await r.json(), error: null } : { data: null, error: await r.json() };
},
}),
delete: () => ({
eq: async (col, val) => {
const r = await fetch(`${base}?${col}=eq.${val}`, { method: “DELETE”, headers });
return { error: r.ok ? null : await r.json() };
},
}),
};
},
};

const LOGO = “data:image/jpeg;base64,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”;

const STAGES = [
{ id: “received”, label: “Diterima / Received”, icon: “📋”, color: “#6366f1” },
{ id: “assessment”, label: “Penilaian / Assessment”, icon: “🔍”, color: “#f59e0b” },
{ id: “body_work”, label: “Kerja Badan / Body Work”, icon: “🔨”, color: “#0ea5e9” },
{ id: “primer”, label: “Primer & Putty”, icon: “🪣”, color: “#8b5cf6” },
{ id: “painting”, label: “Mengecat / Painting”, icon: “🎨”, color: “#ec4899” },
{ id: “polishing”, label: “Menggilap / Polishing”, icon: “✨”, color: “#14b8a6” },
{ id: “assembly”, label: “Pemasangan / Reassembly”, icon: “🔧”, color: “#f97316” },
{ id: “qc”, label: “Semakan / Quality Check”, icon: “✅”, color: “#6366f1” },
{ id: “ready”, label: “Sedia Diambil / Ready”, icon: “🚗”, color: “#10b981” },
];

const font = `'DM Sans', sans-serif`;
const fontDisplay = `'Playfair Display', serif`;
const P = {
bg: “#f4f5f9”, white: “#ffffff”, surfaceAlt: “#eef0f6”,
border: “#e0e3ed”, borderLight: “#eceef5”,
text: “#1a1d2e”, textMuted: “#6b7194”,
accent: “#dc2626”, accentDark: “#991b1b”, accentLight: “#fef2f2”,
success: “#10b981”, danger: “#ef4444”,
};

const isConfigured = !SUPABASE_URL.includes(“YOUR_”);
const RM = (n) => `RM ${(Number(n) || 0).toFixed(2)}`;

function App() {
const [view, setView] = useState(“customer”);
const [jobs, setJobs] = useState([]);
const [loading, setLoading] = useState(true);
const [plateSearch, setPlateSearch] = useState(””);
const [foundJob, setFoundJob] = useState(null);
const [searched, setSearched] = useState(false);
const [adminPass, setAdminPass] = useState(””);
const [adminError, setAdminError] = useState(””);
const [loginShake, setLoginShake] = useState(false);
const [editingJob, setEditingJob] = useState(null);
const [showAddForm, setShowAddForm] = useState(false);
const [invoiceJob, setInvoiceJob] = useState(null);
const [fadeIn, setFadeIn] = useState(true);

const loadJobs = useCallback(async () => {
setLoading(true);
if (isConfigured) {
try {
const { data, error } = await sb.from(“jobs”).select();
if (!error && data) setJobs(data);
} catch (e) { console.error(“DB error:”, e); }
} else {
try { setJobs(JSON.parse(localStorage.getItem(“pw_jobs_v8”) || “[]”)); } catch { setJobs([]); }
}
setLoading(false);
}, []);

useEffect(() => { loadJobs(); }, [loadJobs]);
useEffect(() => { if (!isConfigured) try { localStorage.setItem(“pw_jobs_v8”, JSON.stringify(jobs)); } catch {} }, [jobs]);
useEffect(() => { setFadeIn(true); const t = setTimeout(() => setFadeIn(false), 500); return () => clearTimeout(t); }, [view]);

const handleSearch = () => {
const q = plateSearch.trim().toUpperCase().replace(/[\s-]/g, “”);
setFoundJob(jobs.find(j => j.plate.toUpperCase().replace(/[\s-]/g, “”) === q) || null);
setSearched(true);
};

const handleAdminLogin = () => {
if (adminPass === ADMIN_PASS) {
setView(“adminPanel”); setAdminError(””); setAdminPass(””);
} else {
setAdminError(“Kata laluan salah / Wrong password”);
setLoginShake(true);
setTimeout(() => setLoginShake(false), 600);
}
};

const updateJobStage = async (id, s) => {
setJobs(p => p.map(j => j.id === id ? { …j, stage: s } : j));
if (isConfigured) await sb.from(“jobs”).update({ stage: s }).eq(“id”, id);
};

const updateJob = async (id, u) => {
setJobs(p => p.map(j => j.id === id ? { …j, …u } : j));
setEditingJob(null);
if (isConfigured) await sb.from(“jobs”).update(u).eq(“id”, id);
};

const deleteJob = async (id) => {
setJobs(p => p.filter(j => j.id !== id));
if (isConfigured) await sb.from(“jobs”).delete().eq(“id”, id);
};

const addJob = async (job) => {
if (isConfigured) {
const { data } = await sb.from(“jobs”).insert([job]);
if (data?.[0]) setJobs(p => [data[0], …p]);
else await loadJobs();
} else {
setJobs(p => […p, { …job, id: crypto.randomUUID() }]);
}
setShowAddForm(false);
};

// Invoice overlay
if (invoiceJob) {
return <InvoicePage job={invoiceJob} onClose={() => setInvoiceJob(null)} />;
}

return (
<div style={{ fontFamily: font, background: P.bg, minHeight: “100vh”, color: P.text }}>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
<style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}@media print{.no-print{display:none!important}}`}</style>

```
  <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "260px", background: "linear-gradient(135deg, #1a1a1a 0%, #2d1010 40%, #991b1b 100%)", zIndex: 0 }} />
  <div style={{ position: "fixed", top: "240px", left: 0, right: 0, height: "40px", background: P.bg, borderRadius: "24px 24px 0 0", zIndex: 0 }} />

  <header className="no-print" style={{ padding: "12px 20px", position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <img src={LOGO} alt="Logo" style={{ width: "44px", height: "44px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", objectFit: "cover" }} />
      <div>
        <h1 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>SALSPRAYWORKLEGACY</h1>
        <p style={{ margin: 0, fontSize: "9px", color: "rgba(255,255,255,0.6)", letterSpacing: "2.5px", textTransform: "uppercase" }}>Body & Paint Workshop</p>
      </div>
    </div>
    <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.12)", borderRadius: "10px", padding: "3px", backdropFilter: "blur(10px)" }}>
      <TabBtn active={view === "customer"} onClick={() => { setView("customer"); setSearched(false); setPlateSearch(""); setFoundJob(null); }}>Pelanggan</TabBtn>
      <TabBtn active={view === "admin" || view === "adminPanel"} onClick={() => setView(view === "adminPanel" ? "adminPanel" : "admin")}>Staf</TabBtn>
    </div>
  </header>

  <main style={{
    maxWidth: "680px", margin: "0 auto", padding: "8px 16px 80px", position: "relative", zIndex: 1,
    opacity: fadeIn ? 0 : 1, transform: fadeIn ? "translateY(10px)" : "none",
    transition: "all 0.45s cubic-bezier(0.16,1,0.3,1)",
  }}>
    {!isConfigured && (
      <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "12px", padding: "12px 16px", marginBottom: "12px", fontSize: "12px", color: "#92400e" }}>
        ⚠️ <strong>Demo Mode</strong> — Data hanya dalam browser. Setup Supabase untuk production.
      </div>
    )}
    {view === "customer" && <CustomerView {...{ plateSearch, setPlateSearch, handleSearch, foundJob, searched, loading }} />}
    {view === "admin" && <AdminLogin {...{ adminPass, setAdminPass, adminError, handleAdminLogin, loginShake }} />}
    {view === "adminPanel" && <AdminPanel {...{ jobs, updateJobStage, editingJob, setEditingJob, updateJob, deleteJob, showAddForm, setShowAddForm, addJob, loading, setInvoiceJob }} onLogout={() => setView("admin")} />}
  </main>

  {/* WhatsApp FAB */}
  {view === "customer" && (
    <a href={`https://wa.me/${WORKSHOP.whatsapp}?text=Assalamualaikum%2C%20saya%20nak%20tanya%20tentang%20servis%20cat%20kereta`}
      target="_blank" rel="noopener noreferrer" className="no-print"
      style={{
        position: "fixed", bottom: "24px", right: "20px", zIndex: 20,
        width: "56px", height: "56px", borderRadius: "50%",
        background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 16px rgba(37,211,102,0.4)", textDecoration: "none", fontSize: "28px",
      }}>💬</a>
  )}
</div>
```

);
}

function TabBtn({ active, onClick, children }) {
return <button onClick={onClick} style={{
padding: “7px 16px”, borderRadius: “8px”, border: “none”, fontSize: “12px”, fontWeight: 600,
cursor: “pointer”, fontFamily: font, background: active ? “#fff” : “transparent”,
color: active ? P.accent : “rgba(255,255,255,0.8)”,
boxShadow: active ? “0 2px 8px rgba(0,0,0,0.08)” : “none”,
}}>{children}</button>;
}

function Card({ children, style = {} }) {
return <div style={{ background: P.white, borderRadius: “16px”, border: `1px solid ${P.borderLight}`, boxShadow: “0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)”, …style }}>{children}</div>;
}

function StatusBadge({ stage }) {
const s = STAGES.find(st => st.id === stage);
return <div style={{ padding: “5px 12px”, borderRadius: “8px”, fontSize: “11px”, fontWeight: 700, background: s.color + “12”, color: s.color, border: `1px solid ${s.color}25` }}>{s.label.split(” / “)[0]}</div>;
}

function TypeBadge({ type }) {
const b = type === “booking”;
return <span style={{ padding: “3px 10px”, borderRadius: “6px”, fontSize: “10px”, fontWeight: 700, background: b ? “#dbeafe” : “#fef3c7”, color: b ? “#2563eb” : “#b45309”, textTransform: “uppercase” }}>{b ? “📅 Booking” : “🚶 Walk-in”}</span>;
}

function PaymentInfo({ job, compact }) {
const total = Number(job.total_amount) || 0;
const dp = Number(job.downpayment) || 0;
const balance = total - dp;
const paid = job.paid;
if (total === 0 && !compact) return null;
return (
<div style={{ display: “flex”, gap: compact ? “8px” : “12px”, flexWrap: “wrap”, fontSize: compact ? “11px” : “12px” }}>
{total > 0 && <span style={{ color: P.textMuted }}>Jumlah: <b style={{ color: P.text }}>{RM(total)}</b></span>}
{dp > 0 && <span style={{ color: P.textMuted }}>Deposit: <b style={{ color: “#2563eb” }}>{RM(dp)}</b></span>}
{total > 0 && <span style={{ color: P.textMuted }}>Baki: <b style={{ color: balance > 0 ? P.danger : P.success }}>{RM(balance)}</b></span>}
{paid && <span style={{ background: “#dcfce7”, color: “#166534”, padding: “2px 8px”, borderRadius: “6px”, fontWeight: 700, fontSize: “10px” }}>✅ LUNAS</span>}
</div>
);
}

// ═══════════════════════════════════════════════════
// CUSTOMER VIEW
// ═══════════════════════════════════════════════════
function CustomerView({ plateSearch, setPlateSearch, handleSearch, foundJob, searched, loading }) {
return (
<div>
<Card style={{ padding: “28px 20px”, textAlign: “center”, marginBottom: “16px” }}>
<img src={LOGO} alt=“Logo” style={{ width: “72px”, height: “72px”, borderRadius: “50%”, objectFit: “cover”, marginBottom: “10px”, border: “3px solid #f0f0f0” }} />
<h2 style={{ fontFamily: fontDisplay, fontSize: “20px”, fontWeight: 700, margin: “0 0 4px” }}>Semak Status Kenderaan</h2>
<p style={{ color: P.textMuted, fontSize: “13px”, margin: “0 0 20px” }}>Masukkan nombor plat untuk lihat perkembangan</p>
<div style={{ display: “flex”, gap: “8px”, background: P.surfaceAlt, borderRadius: “12px”, padding: “5px” }}>
<input value={plateSearch} onChange={e => setPlateSearch(e.target.value.toUpperCase())}
onKeyDown={e => e.key === “Enter” && handleSearch()} placeholder=“cth: WA1234X”
style={{ flex: 1, padding: “13px 16px”, borderRadius: “9px”, border: “none”, background: P.white, color: P.text, fontSize: “16px”, fontWeight: 600, fontFamily: font, letterSpacing: “2px”, outline: “none” }} />
<button onClick={handleSearch} disabled={loading} style={{
padding: “13px 24px”, borderRadius: “9px”, border: “none”,
background: “linear-gradient(135deg, #dc2626, #991b1b)”, color: “#fff”,
fontSize: “14px”, fontWeight: 700, cursor: “pointer”, fontFamily: font, opacity: loading ? 0.6 : 1,
}}>{loading ? “…” : “Cari”}</button>
</div>
</Card>

```
  {searched && !foundJob && (
    <Card style={{ padding: "28px", textAlign: "center" }}>
      <div style={{ fontSize: "36px", marginBottom: "8px" }}>😕</div>
      <p style={{ fontWeight: 600, margin: "0 0 4px" }}>Kenderaan tidak dijumpai</p>
      <p style={{ color: P.textMuted, fontSize: "13px", margin: "0 0 12px" }}>Sila semak semula nombor plat</p>
      <a href={`https://wa.me/${WORKSHOP.whatsapp}?text=Salam%2C%20saya%20nak%20semak%20status%20kereta%20plat%20${plateSearch}`}
        target="_blank" rel="noopener noreferrer"
        style={{ display: "inline-block", padding: "10px 20px", borderRadius: "10px", background: "#25D366", color: "#fff", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
        💬 Hubungi WhatsApp
      </a>
    </Card>
  )}

  {foundJob && (
    <Card style={{ overflow: "hidden", animation: "slideUp 0.4s ease" }}>
      <div style={{ padding: "20px", borderBottom: `1px solid ${P.borderLight}`, background: P.accentLight }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "10px", color: P.textMuted, textTransform: "uppercase", letterSpacing: "1.5px" }}>Kenderaan</p>
            <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700 }}>{foundJob.car}</h3>
            <p style={{ margin: "0 0 6px", fontSize: "13px", color: P.textMuted }}>Plat: <span style={{ color: P.text, fontWeight: 700, letterSpacing: "1.5px" }}>{foundJob.plate}</span></p>
            <TypeBadge type={foundJob.type} />
          </div>
          <StatusBadge stage={foundJob.stage} />
        </div>
      </div>

      {/* Payment summary for customer */}
      {(Number(foundJob.total_amount) > 0) && (
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${P.borderLight}`, background: "#f8fafc" }}>
          <PaymentInfo job={foundJob} />
        </div>
      )}

      <div style={{ padding: "24px 20px" }}>
        <p style={{ margin: "0 0 16px", fontSize: "11px", fontWeight: 700, color: P.textMuted, textTransform: "uppercase", letterSpacing: "1.5px" }}>Perkembangan</p>
        {STAGES.map((stage, i) => {
          const ci = STAGES.findIndex(s => s.id === foundJob.stage);
          const done = i <= ci; const isCurrent = i === ci;
          return (
            <div key={stage.id} style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "30px", flexShrink: 0 }}>
                <div style={{
                  width: isCurrent ? "30px" : "22px", height: isCurrent ? "30px" : "22px",
                  borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isCurrent ? "14px" : "10px",
                  background: done ? stage.color + "15" : P.surfaceAlt,
                  border: `2px solid ${done ? stage.color : P.border}`,
                  boxShadow: isCurrent ? `0 0 0 4px ${stage.color}18` : "none",
                }}>{done ? stage.icon : ""}</div>
                {i < STAGES.length - 1 && <div style={{ width: "2px", height: "20px", background: i < ci ? stage.color + "40" : P.borderLight }} />}
              </div>
              <div style={{ paddingBottom: "8px", paddingTop: isCurrent ? "4px" : "1px" }}>
                <p style={{ margin: 0, fontSize: isCurrent ? "13px" : "12px", fontWeight: isCurrent ? 700 : 500, color: done ? P.text : P.textMuted }}>{stage.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {foundJob.notes && (
        <div style={{ margin: "0 20px 20px", padding: "14px 16px", borderRadius: "10px", background: P.surfaceAlt, fontSize: "13px", color: P.textMuted, lineHeight: 1.6, borderLeft: `3px solid ${P.accent}` }}>
          <span style={{ fontWeight: 700, color: P.text }}>Nota: </span>{foundJob.notes}
        </div>
      )}

      <div style={{ padding: "14px 20px", borderTop: `1px solid ${P.borderLight}`, fontSize: "11px", color: P.textMuted }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span>Tarikh masuk: {foundJob.date_in}</span>
          <span>Job #{foundJob.id?.substring(0, 8)}</span>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "11px", color: P.textMuted }}>
          <span>📍 {WORKSHOP.address}</span>
        </div>
        <div style={{ marginTop: "4px" }}>📞 {WORKSHOP.phone}</div>
      </div>
    </Card>
  )}

  {/* Workshop info footer */}
  <div style={{ marginTop: "24px", textAlign: "center", fontSize: "11px", color: P.textMuted, lineHeight: 1.8 }}>
    <p style={{ margin: "0 0 4px", fontWeight: 600, color: P.text }}>📍 SALSPRAYWORKLEGACY</p>
    <p style={{ margin: 0 }}>{WORKSHOP.address}</p>
    <p style={{ margin: 0 }}>📞 {WORKSHOP.phone}</p>
  </div>
</div>
```

);
}

// ═══════════════════════════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════════════════════════
function AdminLogin({ adminPass, setAdminPass, adminError, handleAdminLogin, loginShake }) {
const [attempts, setAttempts] = useState(0);
const [locked, setLocked] = useState(false);

const tryLogin = () => {
if (locked) return;
if (adminPass.trim() === “”) {
return;
}
handleAdminLogin();
const newAttempts = attempts + 1;
setAttempts(newAttempts);
if (newAttempts >= 5) {
setLocked(true);
setTimeout(() => { setLocked(false); setAttempts(0); }, 30000);
}
};

return (
<div style={{ maxWidth: “360px”, margin: “40px auto” }}>
<Card style={{
padding: “28px”, textAlign: “center”,
animation: loginShake ? “shake 0.5s ease” : “none”,
}}>
<div style={{ fontSize: “44px”, marginBottom: “8px” }}>🔐</div>
<h2 style={{ fontFamily: fontDisplay, fontSize: “20px”, fontWeight: 700, margin: “0 0 6px” }}>Log Masuk Staf</h2>
<p style={{ color: P.textMuted, fontSize: “13px”, marginBottom: “20px” }}>Masukkan kata laluan untuk urus kerja</p>

```
    <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
      onKeyDown={e => e.key === "Enter" && tryLogin()}
      placeholder="Kata laluan" disabled={locked}
      style={{
        width: "100%", padding: "13px 16px", borderRadius: "10px",
        border: `1px solid ${adminError ? P.danger : P.border}`,
        background: locked ? "#f3f4f6" : P.surfaceAlt,
        color: P.text, fontSize: "14px", fontFamily: font, outline: "none",
        boxSizing: "border-box", marginBottom: "6px",
      }} />

    {adminError && !locked && (
      <p style={{ color: P.danger, fontSize: "12px", margin: "0 0 6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
        ⚠️ {adminError} {attempts >= 3 && `(${5 - attempts} percubaan lagi)`}
      </p>
    )}
    {locked && (
      <p style={{ color: P.danger, fontSize: "12px", margin: "0 0 6px" }}>
        🔒 Terlalu banyak percubaan. Cuba lagi dalam 30 saat.
      </p>
    )}

    <button onClick={tryLogin} disabled={locked || !adminPass.trim()} style={{
      width: "100%", padding: "13px", borderRadius: "10px", border: "none",
      background: locked ? "#d1d5db" : "linear-gradient(135deg, #dc2626, #991b1b)",
      color: "#fff", fontSize: "14px", fontWeight: 700, cursor: locked ? "not-allowed" : "pointer", fontFamily: font,
      marginTop: "4px",
    }}>Masuk</button>
  </Card>
</div>
```

);
}

// ═══════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════
function AdminPanel({ jobs, updateJobStage, editingJob, setEditingJob, updateJob, deleteJob, showAddForm, setShowAddForm, addJob, onLogout, loading, setInvoiceJob }) {
const [filter, setFilter] = useState(“all”);
const filtered = filter === “all” ? jobs : filter === “unpaid” ? jobs.filter(j => !j.paid && Number(j.total_amount) > 0) : jobs.filter(j => j.type === filter);

const totalRevenue = jobs.reduce((s, j) => s + (Number(j.total_amount) || 0), 0);
const totalCollected = jobs.reduce((s, j) => s + (Number(j.downpayment) || 0) + (j.paid ? (Number(j.total_amount) || 0) - (Number(j.downpayment) || 0) : 0), 0);
const activeJobs = jobs.filter(j => j.stage !== “ready”).length;

return (
<div>
{/* Stats */}
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr 1fr”, gap: “8px”, marginBottom: “14px” }}>
{[
{ label: “Kerja Aktif”, val: activeJobs, icon: “🔧”, color: “#3b82f6” },
{ label: “Jumlah”, val: RM(totalRevenue), icon: “💰”, color: “#10b981” },
{ label: “Diterima”, val: RM(totalCollected), icon: “✅”, color: “#8b5cf6” },
].map((s, i) => (
<Card key={i} style={{ padding: “14px”, textAlign: “center” }}>
<div style={{ fontSize: “18px” }}>{s.icon}</div>
<div style={{ fontSize: “16px”, fontWeight: 700, color: s.color, marginTop: “2px” }}>{s.val}</div>
<div style={{ fontSize: “10px”, color: P.textMuted, marginTop: “2px” }}>{s.label}</div>
</Card>
))}
</div>

```
  <Card style={{ padding: "14px 20px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
    <h2 style={{ fontFamily: fontDisplay, fontSize: "18px", fontWeight: 700, margin: 0 }}>Pengurusan Kerja</h2>
    <div style={{ display: "flex", gap: "8px" }}>
      <button onClick={() => { setShowAddForm(true); setEditingJob(null); }} style={{
        padding: "9px 16px", borderRadius: "10px", border: "none",
        background: P.accent, color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: font,
      }}>+ Baru</button>
      <button onClick={onLogout} style={{
        padding: "9px 14px", borderRadius: "10px", border: `1px solid ${P.border}`,
        background: P.white, color: P.textMuted, fontSize: "12px", cursor: "pointer", fontFamily: font,
      }}>Keluar</button>
    </div>
  </Card>

  <div style={{ display: "flex", gap: "5px", marginBottom: "12px", flexWrap: "wrap" }}>
    {[["all", "Semua"], ["walk-in", "🚶 Walk-in"], ["booking", "📅 Booking"], ["unpaid", "💰 Belum bayar"]].map(([val, label]) => (
      <button key={val} onClick={() => setFilter(val)} style={{
        padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
        border: filter === val ? `2px solid ${P.accent}` : `1px solid ${P.border}`,
        background: filter === val ? P.accentLight : P.white,
        color: filter === val ? P.accent : P.textMuted, cursor: "pointer", fontFamily: font,
      }}>{label}</button>
    ))}
  </div>

  {showAddForm && <JobForm onSave={addJob} onCancel={() => setShowAddForm(false)} />}

  {loading ? (
    <p style={{ textAlign: "center", color: P.textMuted, padding: "30px" }}>Memuat data...</p>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {filtered.map(job =>
        editingJob === job.id
          ? <JobForm key={job.id} job={job} onSave={u => updateJob(job.id, u)} onCancel={() => setEditingJob(null)} />
          : <JobCard key={job.id} job={job} onStageChange={s => updateJobStage(job.id, s)} onEdit={() => { setEditingJob(job.id); setShowAddForm(false); }} onDelete={() => deleteJob(job.id)} onInvoice={() => setInvoiceJob(job)} />
      )}
      {filtered.length === 0 && <p style={{ textAlign: "center", color: P.textMuted, fontSize: "13px", padding: "20px" }}>Tiada kerja</p>}
    </div>
  )}
</div>
```

);
}

function JobCard({ job, onStageChange, onEdit, onDelete, onInvoice }) {
const [expanded, setExpanded] = useState(false);
const stage = STAGES.find(s => s.id === job.stage);
return (
<Card>
<div onClick={() => setExpanded(!expanded)} style={{ padding: “14px 16px”, cursor: “pointer”, display: “flex”, justifyContent: “space-between”, alignItems: “center” }}>
<div style={{ display: “flex”, gap: “12px”, alignItems: “center”, minWidth: 0 }}>
<div style={{ width: “38px”, height: “38px”, borderRadius: “10px”, background: stage.color + “12”, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: “17px”, flexShrink: 0 }}>{stage.icon}</div>
<div style={{ minWidth: 0 }}>
<p style={{ margin: 0, fontWeight: 700, fontSize: “14px” }}>{job.plate} <span style={{ fontWeight: 400, color: P.textMuted, fontSize: “12px” }}>• {job.car}</span></p>
<p style={{ margin: “3px 0 0”, fontSize: “11px”, color: P.textMuted, display: “flex”, alignItems: “center”, gap: “6px”, flexWrap: “wrap” }}>
{job.owner} — {stage.label.split(” / “)[0]}
<TypeBadge type={job.type} />
{job.paid && <span style={{ background: “#dcfce7”, color: “#166534”, padding: “1px 6px”, borderRadius: “4px”, fontSize: “9px”, fontWeight: 700 }}>LUNAS</span>}
</p>
</div>
</div>
<span style={{ color: P.textMuted, fontSize: “16px”, transition: “transform 0.2s”, transform: expanded ? “rotate(180deg)” : “none”, flexShrink: 0 }}>▾</span>
</div>
{expanded && (
<div style={{ padding: “0 16px 16px”, borderTop: `1px solid ${P.borderLight}`, paddingTop: “14px” }}>
<p style={{ fontSize: “11px”, color: P.textMuted, margin: “0 0 6px” }}>
Tel: {job.phone || “—”}  |  Masuk: {job.date_in}
</p>

```
      <PaymentInfo job={job} compact />

      {job.notes && <p style={{ fontSize: "12px", color: P.textMuted, margin: "8px 0", lineHeight: 1.5, borderLeft: `3px solid ${P.accent}`, paddingLeft: "10px" }}>{job.notes}</p>}

      <p style={{ fontSize: "10px", fontWeight: 700, color: P.textMuted, margin: "14px 0 8px", textTransform: "uppercase", letterSpacing: "1px" }}>Kemaskini Status</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "14px" }}>
        {STAGES.map(s => (
          <button key={s.id} onClick={() => onStageChange(s.id)} style={{
            padding: "5px 10px", borderRadius: "7px", fontSize: "10px", fontWeight: 600,
            border: s.id === job.stage ? `2px solid ${s.color}` : `1px solid ${P.border}`,
            background: s.id === job.stage ? s.color + "12" : P.white,
            color: s.id === job.stage ? s.color : P.textMuted, cursor: "pointer", fontFamily: font,
          }}>{s.icon} {s.label.split(" / ")[0]}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <button onClick={onEdit} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${P.border}`, background: P.white, color: P.text, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: font }}>✏️ Edit</button>
        <button onClick={onInvoice} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid #6366f133`, background: "#eef2ff", color: "#4f46e5", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: font }}>🧾 Invois</button>
        <button onClick={() => { if (confirm("Padam kerja ini?")) onDelete(); }} style={{ padding: "10px 14px", borderRadius: "8px", border: `1px solid ${P.danger}30`, background: P.danger + "08", color: P.danger, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: font }}>🗑</button>
      </div>
    </div>
  )}
</Card>
```

);
}

function JobForm({ job, onSave, onCancel }) {
const [f, setF] = useState({
plate: job?.plate || “”, owner: job?.owner || “”, car: job?.car || “”,
phone: job?.phone || “”, notes: job?.notes || “”, stage: job?.stage || “received”,
date_in: job?.date_in || new Date().toISOString().split(“T”)[0],
type: job?.type || “walk-in”,
total_amount: job?.total_amount || 0, downpayment: job?.downpayment || 0,
paid: job?.paid || false,
});
const [saving, setSaving] = useState(false);
const set = (k, v) => setF(p => ({ …p, [k]: v }));

const handleSubmit = async () => {
if (!f.plate.trim() || !f.owner.trim() || !f.car.trim()) return alert(“Sila isi plat, nama & model kereta.”);
setSaving(true);
await onSave({ …f, plate: f.plate.toUpperCase(), total_amount: Number(f.total_amount) || 0, downpayment: Number(f.downpayment) || 0 });
setSaving(false);
};

const iS = { padding: “11px 14px”, borderRadius: “8px”, border: `1px solid ${P.border}`, background: P.surfaceAlt, color: P.text, fontSize: “13px”, fontFamily: font, outline: “none”, width: “100%”, boxSizing: “border-box” };

return (
<Card style={{ padding: “20px”, marginBottom: “12px”, border: `1px solid ${P.accent}30` }}>
<h3 style={{ margin: “0 0 14px”, fontSize: “15px”, fontWeight: 700 }}>{job ? “Edit Kerja” : “Kerja Baru”}</h3>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: “8px” }}>
<input value={f.plate} onChange={e => set(“plate”, e.target.value)} placeholder=“Nombor Plat *” style={iS} />
<input value={f.owner} onChange={e => set(“owner”, e.target.value)} placeholder=“Nama Pemilik *” style={iS} />
<input value={f.car} onChange={e => set(“car”, e.target.value)} placeholder=“Model Kereta *” style={iS} />
<input value={f.phone} onChange={e => set(“phone”, e.target.value)} placeholder=“No. Telefon” style={iS} />
<input type=“date” value={f.date_in} onChange={e => set(“date_in”, e.target.value)} style={iS} />
<select value={f.stage} onChange={e => set(“stage”, e.target.value)} style={{ …iS, cursor: “pointer” }}>
{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
</select>
</div>

```
  {/* Walk-in / Booking toggle */}
  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
    {[["walk-in", "🚶 Walk-in"], ["booking", "📅 Booking"]].map(([v, l]) => (
      <button key={v} onClick={() => set("type", v)} style={{
        flex: 1, padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
        border: f.type === v ? `2px solid ${P.accent}` : `1px solid ${P.border}`,
        background: f.type === v ? P.accentLight : P.white,
        color: f.type === v ? P.accent : P.textMuted, cursor: "pointer", fontFamily: font,
      }}>{l}</button>
    ))}
  </div>

  {/* Payment section */}
  <div style={{ marginTop: "12px", padding: "14px", background: P.surfaceAlt, borderRadius: "10px" }}>
    <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: P.textMuted }}>💰 Maklumat Bayaran</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
      <div>
        <label style={{ fontSize: "11px", color: P.textMuted }}>Jumlah Harga (RM)</label>
        <input type="number" value={f.total_amount} onChange={e => set("total_amount", e.target.value)} placeholder="0.00" style={{ ...iS, background: P.white }} />
      </div>
      <div>
        <label style={{ fontSize: "11px", color: P.textMuted }}>Deposit / DP (RM)</label>
        <input type="number" value={f.downpayment} onChange={e => set("downpayment", e.target.value)} placeholder="0.00" style={{ ...iS, background: P.white }} />
      </div>
    </div>
    <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", fontSize: "13px", cursor: "pointer", color: P.text }}>
      <input type="checkbox" checked={f.paid} onChange={e => set("paid", e.target.checked)} style={{ width: "18px", height: "18px" }} />
      <span>Sudah bayar penuh (Lunas) ✅</span>
    </label>
    {Number(f.total_amount) > 0 && (
      <p style={{ margin: "8px 0 0", fontSize: "12px", color: P.textMuted }}>
        Baki: <b style={{ color: (Number(f.total_amount) - Number(f.downpayment)) > 0 && !f.paid ? P.danger : P.success }}>
          {RM(Number(f.total_amount) - Number(f.downpayment))}
        </b>
      </p>
    )}
  </div>

  <textarea value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Nota (cth: warna cat, bahagian rosak)" rows={2} style={{ ...iS, marginTop: "8px", resize: "vertical" }} />

  <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
    <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #dc2626, #991b1b)", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: font, opacity: saving ? 0.6 : 1 }}>{saving ? "Menyimpan..." : "💾 Simpan"}</button>
    <button onClick={onCancel} style={{ padding: "12px 20px", borderRadius: "8px", border: `1px solid ${P.border}`, background: P.white, color: P.textMuted, fontSize: "13px", cursor: "pointer", fontFamily: font }}>Batal</button>
  </div>
</Card>
```

);
}

// ═══════════════════════════════════════════════════
// INVOICE PAGE
// ═══════════════════════════════════════════════════
function InvoicePage({ job, onClose }) {
const total = Number(job.total_amount) || 0;
const dp = Number(job.downpayment) || 0;
const balance = total - dp;
const invoiceNo = `INV-${(job.date_in || "").replace(/-/g, "")}-${(job.plate || "").replace(/\s/g, "")}`;
const today = new Date().toLocaleDateString(“ms-MY”, { year: “numeric”, month: “long”, day: “numeric” });

return (
<div style={{ fontFamily: font, background: “#fff”, minHeight: “100vh”, color: “#1a1d2e” }}>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />

```
  {/* Action bar */}
  <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", padding: "12px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: "10px", justifyContent: "space-between" }}>
    <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "13px", cursor: "pointer", fontFamily: font }}>← Kembali</button>
    <div style={{ display: "flex", gap: "8px" }}>
      <button onClick={() => window.print()} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", background: "#4f46e5", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: font }}>🖨️ Print / Save PDF</button>
      <button onClick={() => {
        const text = `Invois ${invoiceNo}\nPelanggan: ${job.owner}\nKereta: ${job.car} (${job.plate})\nJumlah: ${RM(total)}\nDeposit: ${RM(dp)}\nBaki: ${RM(balance)}${job.paid ? "\n✅ LUNAS" : ""}`;
        const url = `https://wa.me/${job.phone?.replace(/\D/g, "") || WORKSHOP.whatsapp}?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
      }} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#25D366", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: font }}>💬 WhatsApp</button>
    </div>
  </div>

  {/* Invoice body */}
  <div style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 24px" }}>
    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <img src={LOGO} alt="Logo" style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e5e7eb" }} />
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{WORKSHOP.name}</h1>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#6b7280", lineHeight: 1.5, maxWidth: "260px" }}>{WORKSHOP.address}</p>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#6b7280" }}>📞 {WORKSHOP.phone}</p>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: "28px", fontWeight: 700, margin: 0, color: P.accent }}>INVOIS</h2>
        <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6b7280" }}>{invoiceNo}</p>
        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#6b7280" }}>{today}</p>
      </div>
    </div>

    {/* Customer info */}
    <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px" }}>
      <p style={{ margin: 0, fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px" }}>Bil Kepada / Bill To</p>
      <p style={{ margin: "6px 0 2px", fontSize: "16px", fontWeight: 700 }}>{job.owner}</p>
      <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>📞 {job.phone || "—"}</p>
    </div>

    {/* Vehicle & Job details */}
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "13px" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
          <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "11px", color: "#6b7280", textTransform: "uppercase" }}>Butiran / Description</th>
          <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "11px", color: "#6b7280", textTransform: "uppercase" }}>Jumlah (RM)</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
          <td style={{ padding: "14px 12px" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Kerja Cat & Badan Kereta</p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>
              {job.car} — <span style={{ fontWeight: 600, letterSpacing: "1px" }}>{job.plate}</span>
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
              Tarikh masuk: {job.date_in} &nbsp;|&nbsp; Status: {STAGES.find(s => s.id === job.stage)?.label.split(" / ")[0]}
            </p>
            {job.notes && <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#6b7280", fontStyle: "italic" }}>"{job.notes}"</p>}
          </td>
          <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: 700, fontSize: "15px" }}>{RM(total)}</td>
        </tr>
      </tbody>
    </table>

    {/* Totals */}
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: "260px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px", borderBottom: "1px solid #f3f4f6" }}>
          <span style={{ color: "#6b7280" }}>Jumlah Keseluruhan</span>
          <span style={{ fontWeight: 600 }}>{RM(total)}</span>
        </div>
        {dp > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ color: "#6b7280" }}>Deposit Diterima</span>
            <span style={{ fontWeight: 600, color: "#2563eb" }}>- {RM(dp)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: "16px", borderTop: "2px solid #1a1d2e", marginTop: "4px" }}>
          <span style={{ fontWeight: 700 }}>Baki / Balance</span>
          <span style={{ fontWeight: 700, color: job.paid ? P.success : (balance > 0 ? P.accent : P.success) }}>
            {job.paid ? "✅ LUNAS" : RM(balance)}
          </span>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: "11px", color: "#9ca3af", lineHeight: 1.8 }}>
      <p style={{ margin: 0 }}>Terima kasih kerana memilih <b style={{ color: "#6b7280" }}>Salsprayworklegacy</b></p>
      <p style={{ margin: 0 }}>📍 {WORKSHOP.address}</p>
      <p style={{ margin: 0 }}>📞 {WORKSHOP.phone} &nbsp;|&nbsp; TikTok: @salsprayworklegacy</p>
    </div>
  </div>
</div>
```

);
}

ReactDOM.createRoot(document.getElementById(‘root’)).render(
<React.StrictMode>
<App />
</React.StrictMode>,
)
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Cat, Dashboard, Exec, Project, ProjectView } from "./types";
import { api } from "./api/client";
import { useAuth } from "./hooks/useAuth";
import type { Auth } from "./hooks/useAuth";
import { useDashboard } from "./hooks/useDashboard";
import { useScale } from "./hooks/useScale";
import { CAT, pct, rpShort } from "./lib/format";
import { Login } from "./components/Login";
import { Modal } from "./components/ui";
import { Admin } from "./components/admin/Admin";
import {
  AgentEventPanel,
  AlertPanel,
  CashPanel,
  ChannelPanel,
  ExecutivePanel,
  FunnelPanel,
  LeadQualityPanel,
  ProjectPanel,
  ReasonPanel,
  SalesPanel,
} from "./components/panels";
import {
  AgentEventDetail,
  AlertDetail,
  CashDetail,
  ChannelDetail,
  ExecutiveDetail,
  FunnelDetail,
  LeadQualityDetail,
  ProjectDetail,
  ReasonDetail,
  SalesDetail,
} from "./components/details";

interface Filter {
  cat: "all" | Cat;
  proj: string | null;
}

interface DrillDef {
  title: string;
  tag: string;
  render: (d: Dashboard) => ReactNode;
  wide?: boolean;
}

const DRILLS: Record<string, DrillDef> = {
  exec: { title: "Executive Sales Snapshot", tag: "Panel 1 · Posisi menuju target 500 unit", render: (d) => <ExecutiveDetail d={d} />, wide: true },
  funnel: { title: "Main Funnel Monitoring", tag: "Panel 2 · Funnel LEADS → Purchaser", render: (d) => <FunnelDetail d={d} />, wide: true },
  project: { title: "Project Sales Monitoring", tag: "Panel 5 · Project monitoring", render: (d) => <ProjectDetail d={d} />, wide: true },
  sales: { title: "Sales Performance", tag: "Panel 4 · Ranking sales", render: (d) => <SalesDetail d={d} />, wide: true },
  lq: { title: "Lead Quality & Ads Efficiency", tag: "Panel 3 · Kualitas leads & cost/akad", render: (d) => <LeadQualityDetail d={d} />, wide: true },
  reason: { title: "Opportunity Loss · Reason Code", tag: "Panel 7 · 3-layer system", render: (d) => <ReasonDetail d={d} />, wide: true },
  cash: { title: "Booking → Akad → Cash-In", tag: "Panel 8 · Kontrol transaksi", render: (d) => <CashDetail d={d} /> },
  chan: { title: "Sumber Penjualan", tag: "Panel 6 · Channel performance", render: (d) => <ChannelDetail d={d} /> },
  agent: { title: "Agent Performance", tag: "Panel 9 · Kontribusi eksternal", render: (d) => <AgentEventDetail d={d} />, wide: true },
  alert: { title: "AI Alert & Daily Action Plan", tag: "Panel 10 · Prioritas eksekusi", render: (d) => <AlertDetail d={d} />, wide: true },
};

/**
 * Build a filtered copy of the dataset. When a single project (or a category)
 * is selected, every panel is driven by the per-project breakdown (byProject)
 * so funnel/channel/sales/reason/agent/trend all follow the filter — using the
 * same logic the backend used for the global view.
 */
function applyFilter(base: Dashboard, filter: Filter): Dashboard & { _filtered: boolean } {
  if (filter.proj) {
    const projects = base.projects.filter((p) => p.code === filter.proj);
    const v = base.byProject?.[filter.proj];
    if (v) return { ...base, ...viewToDash(base, v), projects, _filtered: true };
    return { ...base, projects, _filtered: true };
  }
  if (filter.cat !== "all") {
    const projects = base.projects.filter((p) => p.cat === filter.cat);
    const views = projects.map((p) => base.byProject?.[p.code]).filter((x): x is ProjectView => !!x);
    if (views.length) return { ...base, ...viewToDash(base, mergeViews(views)), projects, _filtered: true };
    return { ...base, projects, _filtered: true };
  }
  return { ...base, _filtered: false };
}

/** Overlay a ProjectView onto the base dashboard (panels follow the project). */
function viewToDash(base: Dashboard, v: ProjectView): Partial<Dashboard> {
  return {
    exec: { ...base.exec, ...v.exec },
    funnel: v.funnel,
    channels: v.channels,
    sales: v.sales,
    reasons: v.reasons,
    agents: v.agents,
    monthly: v.monthly,
    events: v.events,
  };
}

/** Sum several per-project views into one (for a category filter). */
function mergeViews(views: ProjectView[]): ProjectView {
  const sumExec = views.reduce(
    (a, v) => {
      a.booking += v.exec.booking;
      a.akad += v.exec.akad;
      a.proses += v.exec.proses;
      a.batal += v.exec.batal;
      a.revenueAkad += v.exec.revenueAkad;
      a.potentialRevenue += v.exec.potentialRevenue;
      a.adsSpent += v.exec.adsSpent;
      return a;
    },
    { booking: 0, akad: 0, proses: 0, batal: 0, revenueAkad: 0, potentialRevenue: 0, adsSpent: 0 },
  );
  const exec: Exec = { ...views[0].exec, ...sumExec, totalPenjualan: sumExec.akad + sumExec.proses };

  // funnel: sum by stage key, recompute standard targets
  const fkeys = views[0].funnel.map((s) => s.key);
  const funnel = fkeys.map((key, i) => {
    const value = views.reduce((s, v) => s + (v.funnel[i]?.value ?? 0), 0);
    return { ...views[0].funnel[i], key, value };
  });

  const sumBy = <T, K extends string>(
    arrs: T[][],
    keyOf: (t: T) => K,
    add: (acc: T, t: T) => T,
  ): T[] => {
    const m = new Map<K, T>();
    for (const arr of arrs)
      for (const t of arr) {
        const k = keyOf(t);
        m.set(k, m.has(k) ? add(m.get(k)!, t) : { ...t });
      }
    return [...m.values()];
  };

  const channels = sumBy(
    views.map((v) => v.channels),
    (c) => c.name,
    (a, c) => ({ ...a, total: a.total + c.total, akad: a.akad + c.akad }),
  ).map((c) => ({ ...c, conv: c.total ? Math.round((c.akad / c.total) * 100) : 0 }));

  const sales = sumBy(
    views.map((v) => v.sales),
    (s) => s.name,
    (a, s) => ({ ...a, akad: a.akad + s.akad, proses: a.proses + s.proses, batal: a.batal + s.batal, total: a.total + s.total, rev: (a.rev ?? 0) + (s.rev ?? 0) }),
  )
    .map((s) => ({ ...s, conv: s.total ? Math.round((s.akad / s.total) * 100) : 0 }))
    .sort((a, b) => b.akad - a.akad);

  const reasons = sumBy(
    views.map((v) => v.reasons),
    (r) => r.code,
    (a, r) => ({ ...a, count: a.count + r.count }),
  ).sort((a, b) => b.count - a.count);

  const agents = sumBy(
    views.map((v) => v.agents),
    (a) => a.name,
    (acc, a) => ({ ...acc, akad: acc.akad + a.akad, total: acc.total + a.total }),
  )
    .map((a) => ({ ...a, conv: a.total ? Math.round((a.akad / a.total) * 100) : 0 }))
    .sort((a, b) => b.akad - a.akad);

  const monthly = sumBy(
    views.map((v) => v.monthly),
    (m) => m.m,
    (a, m) => ({ ...a, akad: a.akad + m.akad, booking: a.booking + m.booking }),
  );

  const evB = views.reduce((s, v) => s + v.events.attributed.booking, 0);
  const evA = views.reduce((s, v) => s + v.events.attributed.akad, 0);
  const events = {
    attributed: { name: "Walk-in / Undangan", booking: evB, akad: evA, conv: evB ? Math.round((evA / evB) * 100) : 0 },
    note: views[0].events.note,
  };

  return { exec, funnel, channels, sales, reasons, agents, monthly, events };
}

export function App() {
  const auth = useAuth();

  if (auth.status === "checking") {
    return (
      <Splash>
        <div className="spinner" />
        Memeriksa sesi…
      </Splash>
    );
  }
  if (auth.status === "anon") {
    return <Login onLogin={auth.login} />;
  }
  return <AuthedApp auth={auth} />;
}

function AuthedApp({ auth }: { auth: Auth }) {
  useScale();
  const [state, reload] = useDashboard(auth.expire);
  const [view, setView] = useState<"dash" | "admin">("dash");

  // Realtime auto-refresh: a WebSocket pushes the data-revision the instant the
  // backend changes (auto-sync or any write) → reload, no manual refresh. Falls
  // back to lightweight polling if the socket is unavailable, and reconnects.
  useEffect(() => {
    let last = -1;
    let alive = true;
    let ws: WebSocket | null = null;
    let pollTimer = 0;
    let reconnectTimer = 0;

    const onRev = (rev: number) => {
      if (last === -1) last = rev;
      else if (rev !== last) {
        last = rev;
        reload();
      }
    };
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = window.setInterval(async () => {
        try {
          onRev((await api.version()).rev);
        } catch {
          /* ignore */
        }
      }, 7000);
    };
    const stopPolling = () => {
      if (pollTimer) window.clearInterval(pollTimer);
      pollTimer = 0;
    };
    const connect = () => {
      const url = api.realtimeURL();
      if (!url) return startPolling();
      try {
        ws = new WebSocket(url);
        ws.onopen = () => stopPolling();
        ws.onmessage = (e) => {
          try {
            const d = JSON.parse(e.data);
            if (typeof d.rev === "number") onRev(d.rev);
          } catch {
            /* ignore */
          }
        };
        ws.onclose = () => {
          ws = null;
          if (!alive) return;
          startPolling(); // fallback while reconnecting
          reconnectTimer = window.setTimeout(connect, 5000);
        };
      } catch {
        startPolling();
      }
    };

    connect();
    return () => {
      alive = false;
      stopPolling();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [reload]);

  if (state.status === "loading") {
    return (
      <Splash>
        <div className="spinner" />
        Memuat data sales…
      </Splash>
    );
  }
  if (state.status === "error") {
    return (
      <Splash tone="error">
        <div className="splash-title">Gagal memuat data</div>
        <div className="splash-msg">{state.error}</div>
        <div className="splash-msg">API: {api.base}</div>
        <button className="splash-btn" onClick={reload}>
          Coba lagi
        </button>
      </Splash>
    );
  }

  const isAdmin = auth.user?.role === "admin";
  if (view === "admin" && isAdmin) {
    return (
      <div className="gp-root">
        <AdminHeader auth={auth} onBack={() => setView("dash")} />
        <Admin data={state.data} reload={reload} />
      </div>
    );
  }
  return <DashboardView base={state.data} auth={auth} onOpenAdmin={isAdmin ? () => setView("admin") : undefined} />;
}

function Splash({ tone, children }: { tone?: "error"; children: ReactNode }) {
  return <div className={`splash ${tone ?? ""}`}>{children}</div>;
}

function Tools({ auth, onOpenAdmin, onBack }: { auth: Auth; onOpenAdmin?: () => void; onBack?: () => void }) {
  return (
    <div className="gp-tools">
      {onBack && (
        <button className="gp-tool-btn" onClick={onBack}>
          ← Dashboard
        </button>
      )}
      {onOpenAdmin && (
        <button className="gp-tool-btn" onClick={onOpenAdmin}>
          ⚙ Master Data
        </button>
      )}
      <span className="gp-user">
        {auth.user?.name}
        <small>{auth.user?.role}</small>
      </span>
      <button className="gp-tool-btn ghost" onClick={() => void auth.logout()}>
        Logout
      </button>
    </div>
  );
}

function AdminHeader({ auth, onBack }: { auth: Auth; onBack: () => void }) {
  return (
    <header className="gp-header adm-header">
      <div className="hdr-brand">
        <div className="hdr-logo">GP</div>
        <div className="hdr-titles">
          <h1>
            MASTER DATA <span>· Input & Kelola</span>
          </h1>
          <p>Perubahan langsung tampil di dashboard setelah disimpan</p>
        </div>
      </div>
      <span />
      <Tools auth={auth} onBack={onBack} />
    </header>
  );
}

function DashboardView({ base, auth, onOpenAdmin }: { base: Dashboard; auth: Auth; onOpenAdmin?: () => void }) {
  const [filter, setFilter] = useState<Filter>({ cat: "all", proj: null });
  const [drill, setDrill] = useState<string | null>(null);
  const d = useMemo(() => applyFilter(base, filter), [base, filter]);

  const open = (k: string) => setDrill(k);
  const pickProject = (p: Project) => setFilter({ cat: "all", proj: p.code });

  // A fresh store (or fully rolled-back state) has no data to chart. Render a
  // friendly empty state instead of letting the panels index empty arrays.
  // Null-safe: a missing array counts as empty.
  const empty =
    (base.funnel?.length ?? 0) === 0 &&
    (base.projects?.length ?? 0) === 0 &&
    (base.sales?.length ?? 0) === 0;
  if (empty) {
    return (
      <div className="gp-root">
        <Header d={d} auth={auth} onOpenAdmin={onOpenAdmin} />
        <div className="empty-state">
          <div className="empty-emoji">📊</div>
          <div className="empty-title">Belum ada data dashboard</div>
          <div className="empty-msg">
            Upload file <b>DASHBOARD SALES_GREENPARK_2026.xlsx</b> melalui menu admin untuk mengisi
            semua panel secara otomatis (Validasi → Cleaning → Mapping → Preview → Approve).
          </div>
          {onOpenAdmin && (
            <button className="splash-btn" onClick={onOpenAdmin}>
              📤 Buka Upload Excel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="gp-root">
      <Header d={d} auth={auth} onOpenAdmin={onOpenAdmin} />
      <FilterBar projects={base.projects} filter={filter} setFilter={setFilter} />
      {d._filtered && (
        <div className="filter-flag">
          Menampilkan: <b>{filter.proj ? filter.proj : filter.cat !== "all" ? CAT[filter.cat].label : ""}</b> — angka snapshot, funnel & cash
          menyesuaikan project terpilih.{" "}
          <button onClick={() => setFilter({ cat: "all", proj: null })}>tampilkan semua</button>
        </div>
      )}

      <main className="bento">
        <div className="bento-col bento-col-1">
          <ExecutivePanel d={d} onExpand={() => open("exec")} />
          <CashPanel d={d} onExpand={() => open("cash")} />
        </div>
        <div className="bento-col bento-col-2">
          <FunnelPanel d={d} onExpand={() => open("funnel")} />
          <div className="bento-row">
            <LeadQualityPanel d={d} onExpand={() => open("lq")} />
            <ChannelPanel d={d} onExpand={() => open("chan")} />
          </div>
          <ReasonPanel d={d} onExpand={() => open("reason")} />
        </div>
        <div className="bento-col bento-col-3">
          <ProjectPanel d={d} onExpand={() => open("project")} onPick={pickProject} />
          <SalesPanel d={d} onExpand={() => open("sales")} />
        </div>
        <div className="bento-col bento-col-4">
          <AlertPanel d={d} onExpand={() => open("alert")} />
          <AgentEventPanel d={d} onExpand={() => open("agent")} />
        </div>
      </main>

      <Modal
        open={!!drill}
        title={drill ? DRILLS[drill].title : ""}
        tag={drill ? DRILLS[drill].tag : ""}
        wide={drill ? DRILLS[drill].wide : false}
        onClose={() => setDrill(null)}
      >
        {drill ? DRILLS[drill].render(d) : null}
      </Modal>
    </div>
  );
}

function Header({ d, auth, onOpenAdmin }: { d: Dashboard; auth: Auth; onOpenAdmin?: () => void }) {
  const e = d.exec;
  const ach = (e.akad / e.target2026) * 100;
  return (
    <header className="gp-header">
      <div className="hdr-brand">
        <div className="hdr-logo">GP</div>
        <div className="hdr-titles">
          <h1>
            DASHBOARD SALES <span>· CEO WAR ROOM</span>
          </h1>
          <p>
            {d.period} &nbsp;·&nbsp; One Team · One System · One Goal: <b>500 Unit</b>
          </p>
        </div>
      </div>
      <div className="hdr-mid">
        <div className="hdr-target">
          <div className="ht-bar">
            <div className="ht-fill" style={{ width: ach + "%" }} />
            <span className="ht-mark" style={{ left: "20%" }} />
          </div>
          <div className="ht-meta">
            <span>
              <b>{e.akad}</b> akad
            </span>
            <span className="muted">/ {e.target2026} target</span>
            <span className="ht-pct">{pct(ach, 1)}</span>
          </div>
        </div>
      </div>
      <div className="hdr-right">
        <div className="hdr-stat">
          <span>Cash-In</span>
          <b>{rpShort(e.revenueAkad)}</b>
        </div>
        <div className="hdr-stat">
          <span>Booking</span>
          <b>{e.booking}</b>
        </div>
        <Tools auth={auth} onOpenAdmin={onOpenAdmin} />
      </div>
    </header>
  );
}

function FilterBar({ projects, filter, setFilter }: { projects: Project[]; filter: Filter; setFilter: (f: Filter | ((f: Filter) => Filter)) => void }) {
  const cats: { k: "all" | Cat; label: string }[] = [
    { k: "all", label: "Semua Project" },
    { k: "utama", label: "Mesin Utama" },
    { k: "pendukung", label: "Pendukung" },
    { k: "pembenahan", label: "Pembenahan" },
  ];
  return (
    <div className="filter-bar">
      <span className="fb-label">Fokus:</span>
      <div className="fb-chips">
        {cats.map((c) => (
          <button
            key={c.k}
            className={"fb-chip" + (filter.cat === c.k ? " active" : "")}
            onClick={() => setFilter((f) => ({ ...f, cat: c.k, proj: null }))}
          >
            {c.k !== "all" && <i className={"fb-dot fb-" + c.k} />}
            {c.label}
          </button>
        ))}
      </div>
      <div className="fb-sep" />
      <select
        className="fb-select"
        value={filter.proj || ""}
        onChange={(e) => setFilter((f) => ({ ...f, proj: e.target.value || null }))}
      >
        <option value="">Semua Unit Bisnis</option>
        {projects.map((p) => (
          <option key={p.code} value={p.code}>
            {p.code} — {p.name}
          </option>
        ))}
      </select>
      {(filter.cat !== "all" || filter.proj) && (
        <button className="fb-reset" onClick={() => setFilter({ cat: "all", proj: null })}>
          Reset
        </button>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Cat, Dashboard, Project } from "./types";
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
  project: { title: "Project Sales Monitoring", tag: "Panel 5 · 12 project", render: (d) => <ProjectDetail d={d} />, wide: true },
  sales: { title: "Sales Performance", tag: "Panel 4 · 21 kontributor", render: (d) => <SalesDetail d={d} />, wide: true },
  lq: { title: "Lead Quality & Ads Efficiency", tag: "Panel 3 · Kualitas leads & cost/akad", render: (d) => <LeadQualityDetail d={d} />, wide: true },
  reason: { title: "Opportunity Loss · Reason Code", tag: "Panel 7 · 3-layer system", render: (d) => <ReasonDetail d={d} />, wide: true },
  cash: { title: "Booking → Akad → Cash-In", tag: "Panel 8 · Kontrol transaksi", render: (d) => <CashDetail d={d} /> },
  chan: { title: "Sumber Penjualan", tag: "Panel 6 · Channel performance", render: (d) => <ChannelDetail d={d} /> },
  agent: { title: "Agent & Event", tag: "Panel 9 · Kontribusi eksternal", render: (d) => <AgentEventDetail d={d} />, wide: true },
  alert: { title: "AI Alert & Daily Action Plan", tag: "Panel 10 · Prioritas eksekusi", render: (d) => <AlertDetail d={d} />, wide: true },
};

/** Build a filtered copy of the dataset based on the active project/category filter. */
function applyFilter(base: Dashboard, filter: Filter): Dashboard & { _filtered: boolean } {
  let projects = base.projects;
  if (filter.proj) projects = projects.filter((p) => p.code === filter.proj);
  else if (filter.cat !== "all") projects = projects.filter((p) => p.cat === filter.cat);

  const filtered = filter.cat !== "all" || !!filter.proj;
  let exec = base.exec;
  if (filtered) {
    const t = projects.reduce(
      (a, p) => {
        a.booking += p.total;
        a.akad += p.akad;
        a.proses += p.proses;
        a.batal += p.batal;
        a.rev += p.rev;
        a.ads += p.ads;
        return a;
      },
      { booking: 0, akad: 0, proses: 0, batal: 0, rev: 0, ads: 0 },
    );
    exec = {
      ...base.exec,
      booking: t.booking,
      akad: t.akad,
      proses: t.proses,
      batal: t.batal,
      revenueAkad: t.rev,
      adsSpent: t.ads,
      potentialRevenue: Math.round(t.proses * 700000000),
    };
  }
  return { ...base, projects, exec, _filtered: filtered };
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

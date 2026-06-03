// Domain types mirroring the Go backend JSON contract (see backend/sales).
// Monetary values are in full Rupiah.

/** Status keys used by the sales status palette. */
export type StatusKey = "hijau" | "kuning" | "merah" | "hitam";

/** Alert severity keys. */
export type Sev = "merah" | "kuning" | "hijau";

/** Project category. */
export type Cat = "utama" | "pendukung" | "pembenahan";

export interface Exec {
  target2026: number;
  booking: number;
  akad: number;
  proses: number;
  batal: number;
  totalPenjualan: number;
  revenueAkad: number;
  potentialRevenue: number;
  adsSpent: number;
  adsSpentQ1: number;
  adsSpentQ2: number;
}

export interface MonthPoint {
  m: string;
  akad: number;
  booking: number;
}

export interface FunnelStage {
  key: string;
  value: number;
  target: number;
  owner: string;
  std: number | null;
  isMoney?: boolean;
}

export interface Stock {
  total: number;
  closed: number;
  booking: number;
  avail: number;
}

export interface Project {
  _id?: string;
  code: string;
  name: string;
  total: number;
  akad: number;
  proses: number;
  batal: number;
  rev: number;
  ads: number;
  cpa: number;
  eff: string;
  cat: Cat;
  stock: Stock;
}

export interface Channel {
  _id?: string;
  code: string;
  name: string;
  total: number;
  akad: number;
  conv: number;
}

export interface SalesRep {
  _id?: string;
  name: string;
  role: string;
  project: string;
  akad: number;
  proses: number;
  batal: number;
  total: number;
  conv: number;
  rev?: number;
}

export interface ReasonMetaItem {
  stage: string;
  target: string;
}

export interface Reason {
  _id?: string;
  code: string;
  name: string;
  id: string;
  layer: "L1" | "L2" | "L3";
  count: number;
}

export interface Agent {
  _id?: string;
  name: string;
  project: string;
  leads: string;
  akad: number;
  total: number;
  conv: number;
  status: string;
}

export interface MasterStock {
  total: number;
  closed: number;
  booking: number;
  hold: number;
  avail: number;
  pctSold: number;
}

export interface Events {
  attributed: { name: string; booking: number; akad: number; conv: number };
  note: string;
}

export interface Alert {
  _id?: string;
  sev: Sev;
  title: string;
  detail: string;
  pic: string;
  deadline: string;
  action: string;
}

export interface KPI {
  _id?: string;
  no: number;
  name: string;
  value: number;
  target: number;
  unit: string;
  owner: string;
  good: boolean;
  lowerBetter?: boolean;
}

export interface Summary {
  target2026: number;
  akad: number;
  booking: number;
  proses: number;
  batal: number;
  achievement: number;
  gapToTarget: number;
  pipelineActive: number;
  cancelRate: number;
  bookingToAkad: number;
  cashIn: number;
  potentialRevenue: number;
  adsSpent: number;
  avgCostPerAkad: number;
  totalProjects: number;
  totalSalesReps: number;
  stockSold: number;
  status: string;
}

/** Full payload returned by GET /api/dashboard. */
export interface Dashboard {
  period: string;
  updated: string;
  exec: Exec;
  monthly: MonthPoint[];
  funnel: FunnelStage[];
  projects: Project[];
  channels: Channel[];
  sales: SalesRep[];
  reasonMeta: Record<string, ReasonMetaItem>;
  reasons: Reason[];
  agents: Agent[];
  stock: MasterStock;
  events: Events;
  alerts: Alert[];
  kpis: KPI[];
  summary: Summary;
}

/** Authenticated account (mirrors backend domain.User, no password material). */
export interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "viewer";
}

/** Response of POST /api/auth/login. */
export interface LoginResponse {
  token: string;
  user: User;
}

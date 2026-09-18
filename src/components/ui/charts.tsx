"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, FunnelChart, Funnel, LabelList, AreaChart, Area,
} from "recharts";

export const CHART_COLORS = ["#4f46e5", "#0ea5e9", "#12b76a", "#f79009", "#f04438", "#8b5cf6"];

const tooltipStyle = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" },
  labelStyle: { color: "var(--muted)" },
};

export function RevenueAreaChart({ data }: { data: { month: string; revenue: number; target?: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -20, right: 10, top: 10 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Area type="monotone" dataKey="revenue" stroke="var(--brand)" fill="url(#revFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DealsBarChart({ data }: { data: { month: string; won: number; lost: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -20, right: 10, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="won" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="lost" fill="var(--danger)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DoughnutChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LeadFunnelChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <FunnelChart>
        <Tooltip {...tooltipStyle} />
        <Funnel dataKey="value" data={data} isAnimationActive>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          <LabelList position="right" dataKey="name" fill="var(--foreground)" fontSize={12} />
          <LabelList position="center" dataKey="value" fill="#fff" fontSize={12} fontWeight={600} />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

export function SimpleLineChart({ data, dataKey = "value" }: { data: Record<string, string | number>[]; dataKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -20, right: 10, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Line type="monotone" dataKey={dataKey} stroke="var(--brand)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

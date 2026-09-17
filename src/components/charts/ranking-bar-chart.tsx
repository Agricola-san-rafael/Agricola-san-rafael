"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCLP } from "@/modules/shared/money";

interface RankingBarChartProps {
  data: { nombre: string; totalMonto: number }[];
}

/** Barra horizontal simple para "top clientes/proveedores por volumen" (sección Reportes). */
export function RankingBarChart({ data }: RankingBarChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.12)" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatCLP(v)}
          tick={{ fill: "#a3a3a3", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          width={140}
          tick={{ fill: "#f2f2f0", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => formatCLP(Number(value))}
          contentStyle={{
            background: "#1c1c1c",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            color: "#f2f2f0",
            fontSize: 12,
          }}
          cursor={{ fill: "rgba(255,255,255,0.06)" }}
        />
        <Bar dataKey="totalMonto" name="Total" fill="#9be15d" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

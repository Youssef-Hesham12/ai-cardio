import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { AssessmentResult } from "@/data/mockData";
export const riskColors: Record<string, string> = {
  Low: "#65bba3",
  Moderate: "#d8ad64",
  High: "#d97d8c",
};
export const chartTick = { fill: "var(--muted-foreground)", fontSize: 10 };
export const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  borderRadius: 6,
  fontSize: 12,
};
export function ExplanationChart({ result }: { result: AssessmentResult }) {
  return (
    <>
      <div
        className="chart tall"
        role="img"
        aria-label="feature contributions, positive and negative score points"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={result.contributions}
            layout="vertical"
            margin={{ left: 0, right: 25, top: 10, bottom: 5 }}
          >
            <CartesianGrid
              stroke="var(--border)"
              horizontal={false}
              strokeDasharray="3 4"
            />
            <XAxis
              type="number"
              tick={chartTick}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="feature"
              width={140}
              tick={chartTick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [
                `${Number(value) > 0 ? "+" : ""}${value} points`,
                "Contribution",
              ]}
            />
            <ReferenceLine x={0} stroke="var(--muted-foreground)" />
            <Bar
              isAnimationActive={false}
              dataKey="value"
              radius={3}
              barSize={18}
            >
              {result.contributions.map((c) => (
                <Cell
                  key={c.feature}
                  fill={c.value >= 0 ? "#d97d8c" : "#65bba3"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-dot" style={{ background: "#d97d8c" }} />
          Positive contribution
        </span>
        <span>
          <i className="legend-dot" style={{ background: "#65bba3" }} />
          Negative contribution
        </span>
      </div>
      <p className="muted" style={{ fontSize: 11 }}>
        Feature contributions are not clinically validated and do not establish
        causation or treatment effects.
      </p>
    </>
  );
}

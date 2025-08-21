'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { SimulationResults } from "@/lib/types";

type PlotViewProps = {
  results: SimulationResults;
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function PlotView({ results }: PlotViewProps) {
  if (!results || !results.counts) return null;

  const chartData = Object.entries(results.counts)
    .map(([state, count]) => ({
      state: `|${parseInt(state).toString(2).padStart(results.num_qubits, '0')}⟩`,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const pieData = chartData.slice(0, 5).map(d => ({ name: d.state, value: d.count }));
  const otherCount = chartData.slice(5).reduce((acc, curr) => acc + curr.count, 0);
  if (otherCount > 0) {
    pieData.push({ name: 'Other', value: otherCount });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>State Distribution</CardTitle>
          <CardDescription>Frequency of measured quantum states.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="state" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-chart-1)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>State Probabilities</CardTitle>
          <CardDescription>Probability distribution of top states.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

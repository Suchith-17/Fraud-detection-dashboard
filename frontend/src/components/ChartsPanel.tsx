import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ChartsPanelProps {
  transactions: any[];
}

const COLORS = {
  fraud: "hsl(var(--destructive))",
  legitimate: "hsl(var(--primary))",
  chart1: "hsl(var(--chart-1))",
  chart2: "hsl(var(--chart-2))",
  chart3: "hsl(var(--chart-3))",
  chart4: "hsl(var(--chart-4))",
  chart5: "hsl(var(--chart-5))",
};

export default function ChartsPanel({ transactions }: ChartsPanelProps) {
  // Fraud vs Legitimate
  const fraudData = [
    {
      name: "Fraudulent",
      value: transactions.filter((t) => t.label).length,
      fill: COLORS.fraud,
    },
    {
      name: "Legitimate",
      value: transactions.filter((t) => !t.label).length,
      fill: COLORS.legitimate,
    },
  ];

  // Amount by Country
  const countryData = transactions.reduce((acc: any, t) => {
    const country = t.tx.country;
    if (!acc[country]) {
      acc[country] = { country, total: 0, fraud: 0, legitimate: 0 };
    }
    acc[country].total += t.tx.amount;
    if (t.label) {
      acc[country].fraud += t.tx.amount;
    } else {
      acc[country].legitimate += t.tx.amount;
    }
    return acc;
  }, {});

  const countryChartData = Object.values(countryData).map((data: any) => ({
    country: data.country,
    Fraud: Math.round(data.fraud),
    Legitimate: Math.round(data.legitimate),
  }));

  // Transactions by Hour
  const hourlyData = transactions.reduce((acc: any, t) => {
    const hour = new Date(t.tx.timestamp).getHours();
    if (!acc[hour]) {
      acc[hour] = { hour: `${hour}:00`, count: 0, fraudCount: 0 };
    }
    acc[hour].count += 1;
    if (t.label) acc[hour].fraudCount += 1;
    return acc;
  }, {});

  const hourlyChartData = Object.values(hourlyData).sort(
    (a: any, b: any) => parseInt(a.hour) - parseInt(b.hour)
  );

  // Merchant Distribution
  const merchantData = transactions.reduce((acc: any, t) => {
    const merchant = t.tx.merchant;
    if (!acc[merchant]) {
      acc[merchant] = { name: merchant, value: 0, fraud: 0 };
    }
    acc[merchant].value += 1;
    if (t.label) acc[merchant].fraud += 1;
    return acc;
  }, {});

  const merchantChartData = Object.values(merchantData)
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-6 text-foreground">Analytics Dashboard</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fraud Distribution Pie Chart */}
          <div className="chart-container">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Fraud Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fraudData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fraudData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Amount by Country */}
          <div className="chart-container">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Amount by Country</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="country" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Legend />
                <Bar dataKey="Fraud" fill={COLORS.fraud} />
                <Bar dataKey="Legitimate" fill={COLORS.legitimate} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly Transaction Pattern */}
          <div className="chart-container">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Hourly Transaction Pattern</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="count" stroke={COLORS.chart1} strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="fraudCount" stroke={COLORS.fraud} strokeWidth={2} name="Fraudulent" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Merchants */}
          <div className="chart-container">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Top 5 Merchants</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={merchantChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Legend />
                <Bar dataKey="value" fill={COLORS.chart2} name="Total Transactions" />
                <Bar dataKey="fraud" fill={COLORS.fraud} name="Fraudulent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

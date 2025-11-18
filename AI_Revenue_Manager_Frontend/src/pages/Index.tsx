import { Users, Megaphone, TrendingUp, DollarSign } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import AIInsights from "@/components/dashboard/AIInsights";
import ClientTypeChart from "@/components/dashboard/ClientTypeChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const revenueData = [
  { month: "Sep", revenue: 45000 },
  { month: "Oct", revenue: 52000 },
  { month: "Nov", revenue: 48000 },
  { month: "Dec", revenue: 61000 },
  { month: "Jan", revenue: 55000 },
];

const Index = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to The Grand Budapest Hotel AI Revenue Management System
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clients"
          value="365"
          change="+12%"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Active Campaigns"
          value="8"
          change="+2"
          changeType="positive"
          icon={Megaphone}
        />
        <StatCard
          title="Revenue Generated"
          value="$55,000"
          change="-9.8%"
          changeType="negative"
          icon={DollarSign}
        />
        <StatCard
          title="Conversion Rate"
          value="24.5%"
          change="+4.3%"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(345, 65%, 35%)"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <ClientTypeChart />
      </div>

      <AIInsights />
    </div>
  );
};

export default Index;

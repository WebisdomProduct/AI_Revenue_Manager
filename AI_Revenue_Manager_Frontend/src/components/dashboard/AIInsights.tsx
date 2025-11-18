import { Sparkles, TrendingUp, Users, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const insights = [
  {
    icon: TrendingUp,
    title: "High-Value Opportunity",
    description:
      "VIP clients show 40% higher engagement with spa packages. Consider launching a premium wellness campaign.",
    priority: "high",
  },
  {
    icon: Users,
    title: "Segment Growth",
    description:
      "Business traveler segment has grown 25% this quarter. Ideal time for corporate package promotion.",
    priority: "medium",
  },
  {
    icon: Target,
    title: "Campaign Optimization",
    description:
      "Messages sent between 2-4 PM show 35% better open rates. Adjust scheduling for maximum impact.",
    priority: "medium",
  },
];

export default function AIInsights() {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-gold flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent-foreground" />
          </div>
          <CardTitle>AI-Powered Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <insight.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-foreground">{insight.title}</h3>
                  <Badge variant={getPriorityColor(insight.priority)}>
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

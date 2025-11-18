import { useState, useMemo } from "react";
import { Plus, RefreshCw, Search, Filter, Edit, Pause, Play } from "lucide-react";
import { Chatbot } from "@/components/Chatbot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useGoogleSheets } from "@/hooks/useGoogleSheets";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

export default function Campaigns() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data, loading, refetch } = useGoogleSheets("Campaigns", "A2:AB");

  // --- STEP 1: Transform Google Sheet rows into objects ---------------------
  const campaigns = useMemo(() => {
    if (!data?.values) return [];

    return data.values.map((row, index) => {
      const base = {
        id: row[0] || `CP${String(index + 1).padStart(3, "0")}`,
        text: row[1] || "",
        targetCategory: row[2] || "",
        startDateTime: row[3] || "",
        endDateTime: row[4] || "",
        targetCount: parseInt(row[5]) || 0,
        messageCount: parseInt(row[6]) || 0,
        status: row[7] || "Scheduled"
      };

      // Extract up to 10 template/timing pairs dynamically
      const templateTimingPairs: { template: string; timing: string }[] = [];

      // Google Sheets columns: starting index 8 = template #1
      let colIndex = 8;
      for (let i = 1; i <= 10; i++) {
        const template = row[colIndex] || "";
        const timing = row[colIndex + 1] || "";
        templateTimingPairs.push({ template, timing });
        colIndex += 2;
      }

      return { ...base, templateTimingPairs };
    });
  }, [data]);

  // --- STEP 2: Determine maximum pair count across all campaigns ------------
  const maxPairs = useMemo(() => {
    if (!campaigns.length) return 3; // fallback
    return Math.max(...campaigns.map((c) => c.messageCount || 0), 3);
  }, [campaigns]);

  // --- STEP 3: Filters -----------------------------------------------------
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.targetCategory.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || campaign.targetCategory === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "Scheduled":
        return "secondary";
      case "Paused":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- MAIN RENDER ---------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your marketing campaigns
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Sync
          </Button>

          <Button
            className="bg-gradient-primary text-primary-foreground"
            onClick={() => navigate("/create-campaign")}
          >
            <Plus className="h-4 w-4 mr-2" /> Create Campaign
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-elegant overflow-x-auto">
        <CardHeader>
          <CardTitle>Active & Scheduled Campaigns</CardTitle>

          {/* Search + Filters */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Campaign Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Target Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                </SelectContent>
              </Select>

              {(statusFilter !== "all" || categoryFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setCategoryFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Dynamic Table */}
        <CardContent>
          <div className="rounded-md border min-w-max">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Campaign Text</TableHead>
                  <TableHead>Target Category</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Targets</TableHead>
                  <TableHead>Msgs</TableHead>
                  <TableHead>Status</TableHead>

                  {/* Dynamically generated column headers */}
                  {Array.from({ length: maxPairs }).map((_, i) => (
                    <>
                      <TableHead key={`template-h-${i}`}>Template #{i + 1}</TableHead>
                      <TableHead key={`timing-h-${i}`}>Timing #{i + 1}</TableHead>
                    </>
                  ))}

                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>{campaign.id}</TableCell>
                    <TableCell className="max-w-[200px] text-sm">{campaign.text}</TableCell>
                    <TableCell>{campaign.targetCategory}</TableCell>
                    <TableCell>{campaign.startDateTime}</TableCell>
                    <TableCell>{campaign.endDateTime}</TableCell>
                    <TableCell>{campaign.targetCount}</TableCell>

                    <TableCell>
                      {campaign.messageCount} <span className="text-muted-foreground">/ {maxPairs}</span>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </TableCell>

                    {/* Dynamic template/timing pairs */}
                    {campaign.templateTimingPairs.slice(0, maxPairs).map((pair, i) => (
                      <>
                        <TableCell
                          key={`template-${campaign.id}-${i}`}
                          className="max-w-[200px] text-xs text-muted-foreground"
                        >
                          {pair.template}
                        </TableCell>
                        <TableCell
                          key={`timing-${campaign.id}-${i}`}
                          className="whitespace-nowrap text-sm"
                        >
                          {pair.timing}
                        </TableCell>
                      </>
                    ))}

                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          {campaign.status === "Active" ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Chatbot />
    </div>
  );
}

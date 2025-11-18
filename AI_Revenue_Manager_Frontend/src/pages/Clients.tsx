import { useState, useMemo } from "react";
import { Download, Search, RefreshCw, Filter } from "lucide-react";
import { Chatbot } from "@/components/Chatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useGoogleSheets } from "@/hooks/useGoogleSheets";
import { Skeleton } from "@/components/ui/skeleton";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data, loading, refetch } = useGoogleSheets('Clients', 'A2:L');

  const clients = useMemo(() => {
    if (!data?.values) return [];
    return data.values.map((row, index) => ({
      id: row[0] || `CL${String(index + 1).padStart(3, '0')}`,
      name: row[1] || '',
      email: row[2] || '',
      phone: row[3] || '',
      chatId: row[4] || '',
      date: row[5] || '',
      time: row[6] || '',
      chatText: row[7] || '',
      type: row[8] || '',
      interests: row[9] || '',
      traits: row[10] || '',
      category: row[11] || '',
    }));
  }, [data]);

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || client.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || client.category === categoryFilter;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const downloadCSV = () => {
    // CSV export functionality - to be implemented
    const csv = [
      ["Client ID", "Name", "Email", "Phone", "Chat ID", "Date", "Time", "Chat Text", "Type", "Interests", "Traits", "Category"],
      ...filteredClients.map((c) => [
        c.id,
        c.name,
        c.email,
        c.phone,
        c.chatId,
        c.date,
        c.time,
        c.chatText,
        c.type,
        c.interests,
        c.traits,
        c.category,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients-report.csv";
    a.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all your client information
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button onClick={downloadCSV} className="bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Client Database</CardTitle>
          <div className="flex flex-col gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, email or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Client Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Basic">Basic</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Client Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                </SelectContent>
              </Select>
              {(typeFilter !== "all" || categoryFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTypeFilter("all");
                    setCategoryFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="min-w-[200px]">Chat Text</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Interests</TableHead>
                  <TableHead>Traits</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.id}</TableCell>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.chatId}</TableCell>
                    <TableCell className="text-sm">{client.date}</TableCell>
                    <TableCell className="text-sm">{client.time}</TableCell>
                    <TableCell className="min-w-[200px]">
                      <div className="max-h-20 overflow-y-auto text-sm text-muted-foreground">
                        {client.chatText}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={client.type === "Premium" ? "default" : "secondary"}
                      >
                        {client.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {client.interests}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {client.traits}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          client.category === "VIP"
                            ? "default"
                            : client.category === "Business"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {client.category}
                      </Badge>
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

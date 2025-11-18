import { CampaignForm } from "@/components/CampaignForm";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function CreateCampaignPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate("/campaigns")}>
        ← Back to Campaigns
      </Button>

      <h1 className="text-3xl font-bold text-foreground">Create New Campaign</h1>
      <p className="text-muted-foreground">
        Fill out the details below to create a new campaign.
      </p>

      <CampaignForm />
    </div>
  );
}

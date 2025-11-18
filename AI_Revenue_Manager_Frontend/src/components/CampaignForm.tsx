import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { postCampaign } from '@/config/api';
import { format } from 'date-fns';
import { CalendarIcon, Send, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageTemplate {
  template: string;
  timing: string;
}

export function CampaignForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    campaignText: 'Frontend: Campaign Text',
    targetClientCategory: '',
    startDate: undefined as Date | undefined,
    startTime: '09:00',
    endDate: undefined as Date | undefined,
    endTime: '21:00',
    campaignMessageCount: 0,
  });

  // Initialize 10 message templates
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(
    Array.from({ length: 10 }, (_, i) => ({
      template: `Frontend Message Template ${i+1}`,
      // timing: `${9+i}:00`, // Default times: 09:00, 10:00, 11:00, etc.
      timing: `${String(9+i).padStart(2,"0")}:00`, // 09:00, 10:00 ... 18:00
    }))
  );

  const updateMessageTemplate = (index: number, field: 'template' | 'timing', value: string) => {
    setMessageTemplates(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.campaignText || !formData.targetClientCategory || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    /* if (formData.campaignMessageCount < 1 || formData.campaignMessageCount > 10) { */
    if (formData.campaignMessageCount < 0 || formData.campaignMessageCount > 10) {
      toast.error('Message count must be either 0 (Initial Value) or between 1 and 10');
      return;
    }

    // Validate message templates based on count
    if  (formData.campaignMessageCount > 0) {
      for (let i = 0; i < formData.campaignMessageCount; i++) {
        if (!messageTemplates[i].template.trim()) {
          toast.error(`Please provide Message Template #${i + 1}`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Format dates and times
      const startDateTime = `${format(formData.startDate, 'yyyy-MM-dd')} ${formData.startTime}`;
      const endDateTime = `${format(formData.endDate, 'yyyy-MM-dd')} ${formData.endTime}`;

      // Prepare payload
      const payload: any = {
        campaignText: formData.campaignText,
        targetClientCategory: formData.targetClientCategory,
        startDateTime,
        endDateTime,
        campaignMessageCount: formData.campaignMessageCount,
      };

      // Add only the required message templates
      if  (formData.campaignMessageCount > 0) {
        for (let i = 0; i < formData.campaignMessageCount && i < 10; i++) {
          payload[`messageTemplate${i+1}`] = messageTemplates[i].template;
          payload[`messageTiming${i+1}`] = messageTemplates[i].timing;
        }
      }

      await postCampaign(payload);
      toast.success('Campaign created successfully!');
      
      // Reset form
      setFormData({
        campaignText: 'Frontend: Campaign Text',
        targetClientCategory: '',
        startDate: undefined,
        startTime: '09:00',
        endDate: undefined,
        endTime: '21:00',
        campaignMessageCount: 0,
      });
      setMessageTemplates(
        Array.from({ length: 10 }, (_, i) => ({
          template: `Frontend Message Template ${i+1}`,
          timing: `${9+i}:00`, // Default times: 09:00, 10:00, 11:00, etc.
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Configure your marketing campaign settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign Text */}
          <div className="space-y-2">
            <Label htmlFor="campaignText">Campaign Text *</Label>
            <Textarea
              id="campaignText"
              /* placeholder="Enter your campaign description..." */
              /* placeholder="Frontend: Campaign Text ..." */
              value={formData.campaignText}
              onChange={(e) => setFormData({ ...formData, campaignText: e.target.value })}
              rows={4}
              required
            />
          </div>

          {/* Target Category */}
          <div className="space-y-2">
            <Label htmlFor="targetCategory">Target Client Category *</Label>
            <Select
              value={formData.targetClientCategory}
              onValueChange={(value) => setFormData({ ...formData, targetClientCategory: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Romantic">Romantic</SelectItem>
                <SelectItem value="Foodie">Foodie</SelectItem>
                <SelectItem value="Family">Family</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Budget">Budget</SelectItem>
                <SelectItem value="Adventurer">Adventurer</SelectItem>
                <SelectItem value="Leisure">Leisure</SelectItem>
                <SelectItem value="Group">Group</SelectItem>
                <SelectItem value="Spa">Spa</SelectItem>
                <SelectItem value="Solo">Solo</SelectItem>
                <SelectItem value="Kid-Friendly">Kid-Friendly</SelectItem>
                <SelectItem value="wellness">wellness</SelectItem>
                <SelectItem value="anniversary">anniversary</SelectItem>
                <SelectItem value="villa">villa</SelectItem>
                <SelectItem value="productivity">productivity</SelectItem>
                <SelectItem value="connectivity">connectivity</SelectItem>
                <SelectItem value="unique">unique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date/Time Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Date-Time */}
            <div className="space-y-4">
              <Label>Start Date & Time *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => setFormData({ ...formData, startDate: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* End Date-Time */}
            <div className="space-y-4">
              <Label>End Date & Time *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? format(formData.endDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => setFormData({ ...formData, endDate: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Message Count */}
          <div className="space-y-2">
            <Label htmlFor="messageCount">Campaign Message Count (1-10, Initially 0) *</Label>
            <Input
              id="messageCount"
              type="number"
              /* min="1" */
              min="0"
              max="10"
              value={formData.campaignMessageCount}
              //onChange={(e) => setFormData({ ...formData, campaignMessageCount: parseInt(e.target.value) || 1 })}
              onChange={(e) => setFormData({ ...formData, campaignMessageCount: Number(e.target.value)})}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Message Templates */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Message Templates</CardTitle>
          <CardDescription>Configure your campaign messages and timing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: formData.campaignMessageCount }, (_, index) => (
            <div key={index} className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <h4 className="font-semibold text-sm">Message #{index + 1}</h4>
              <div className="space-y-2">
                <Label htmlFor={`template${index}`}>Message Template *</Label>
                <Textarea
                  id={`template${index}`}
                  placeholder="Enter message template..."
                  value={messageTemplates[index].template}
                  onChange={(e) => updateMessageTemplate(index, 'template', e.target.value)}
                  rows={3}
                  /* required */
                  required={formData.campaignMessageCount > 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`timing${index}`}>Send Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`timing${index}`}
                    type="time"
                    value={messageTemplates[index].timing}
                    onChange={(e) => updateMessageTemplate(index, 'timing', e.target.value)}
                    className="pl-10"
                    /* required */
                    required={formData.campaignMessageCount > 0}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[200px]">
          {isSubmitting ? (
            <>Submitting...</>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Create Campaign
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

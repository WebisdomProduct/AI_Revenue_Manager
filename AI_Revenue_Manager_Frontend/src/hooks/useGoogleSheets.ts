import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GoogleSheetsData {
  values: any[][];
}

export function useGoogleSheets(sheet: string, range: string) {
  const [data, setData] = useState<GoogleSheetsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.functions.invoke('google-sheets-sync', {
        body: {
          action: 'read',
          sheet,
          range,
        },
      });

      if (error) throw error;
      setData(result);
    } catch (error) {
      console.error('Error fetching from Google Sheets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data from Google Sheets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const writeData = async (newData: any[][]) => {
    try {
      const { error } = await supabase.functions.invoke('google-sheets-sync', {
        body: {
          action: 'write',
          sheet,
          range,
          data: newData,
        },
      });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Data synced to Google Sheets',
      });
      
      await fetchData();
    } catch (error) {
      console.error('Error writing to Google Sheets:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync data to Google Sheets',
        variant: 'destructive',
      });
    }
  };

  const appendData = async (newData: any[][]) => {
    try {
      const { error } = await supabase.functions.invoke('google-sheets-sync', {
        body: {
          action: 'append',
          sheet,
          range,
          data: newData,
        },
      });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Data added to Google Sheets',
      });
      
      await fetchData();
    } catch (error) {
      console.error('Error appending to Google Sheets:', error);
      toast({
        title: 'Error',
        description: 'Failed to add data to Google Sheets',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [sheet, range]);

  return {
    data,
    loading,
    refetch: fetchData,
    writeData,
    appendData,
  };
}

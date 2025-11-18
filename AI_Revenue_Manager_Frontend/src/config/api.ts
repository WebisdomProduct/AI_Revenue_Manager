// API Configuration
// TODO: For production, consider using Lovable Cloud to securely store sensitive API keys
// For now, you can update these values directly:

export const API_CONFIG = {
  // Your Google Apps Script Web App URL
  // Example: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
  CAMPAIGN_API_URL: import.meta.env.VITE_CAMPAIGN_API_URL || 'YOUR_API_URL_HERE',
  
  // Optional API key for authentication (if your backend requires it)
  API_KEY: import.meta.env.VITE_API_KEY || '',
};

export async function postCampaign(payload: any) {
  try {
    const body: any = {
      campaignText: payload.campaignText,
      targetClientCategory: payload.targetClientCategory,
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      campaignMessageCount: payload.campaignMessageCount,
    };

    // Dynamically add up to 10 template/timing pairs
    for (let i = 1; i <= 10; i++) {
      const t = payload[`messageTemplate${i}`];
      const tm = payload[`messageTiming${i}`];

      if (t !== undefined) body[`messageTemplate${i}`] = t;
      if (tm !== undefined) body[`messageSendTiming${i}`] = tm;  
    }

    const response = await fetch(
      // "https://script.google.com/macros/s/AKfycbzQnNqEnU9afxdLzajHXKfH0lZFfoTi40GkHCOsnMo-H-g2FwvL1JQPsPjLa0jOmARY/exec",
      API_CONFIG.CAMPAIGN_API_URL,
      {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    return { success: true };
  } catch (error) {
    console.error("Error posting campaign:", error);
    throw error;
  }
}

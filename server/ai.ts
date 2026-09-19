import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn('Could not initialize GoogleGenAI client:', err);
    }
  }
  return aiClient;
}

export async function summarizeCircular(content: string, title?: string): Promise<{
  summary: string;
  suggestedTags: string[];
  suggestedUrgency: 'urgent' | 'normal' | 'info';
}> {
  const client = getAIClient();

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an institutional executive secretary and campus registrar assistant.
Analyze the following circular notice content:
Title: "${title || 'Institutional Notice'}"
Content:
"""
${content}
"""

Respond with a JSON object in this format:
{
  "summary": "1 to 2 clear, authoritative sentences summarizing what students and staff must know and any critical dates/actions.",
  "suggestedTags": ["Tag1", "Tag2", "Tag3"],
  "suggestedUrgency": "urgent" or "normal" or "info"
}
Output only valid JSON.`,
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        summary: parsed.summary || 'Official institutional announcement.',
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : ['Campus', 'Circular'],
        suggestedUrgency: ['urgent', 'normal', 'info'].includes(parsed.suggestedUrgency) ? parsed.suggestedUrgency : 'normal',
      };
    } catch (err) {
      console.warn('Gemini summarization fallback to heuristics:', err);
    }
  }

  // Graceful rule-based heuristic fallback
  const firstParagraph = content.split('\n\n')[0].replace(/[#*`_]/g, '').trim();
  const summary = firstParagraph.length > 150 ? firstParagraph.slice(0, 147) + '...' : firstParagraph;
  const isUrgent = /urgent|emergency|immediate|deadline|warning|caution/i.test(content + ' ' + (title || ''));
  const isInfo = /library|club|seminar|exhibition|cultural|hours/i.test(content + ' ' + (title || ''));

  return {
    summary: summary || 'Institutional circular notice issued by administrative authorities.',
    suggestedTags: ['General', 'Notice', 'Circular'],
    suggestedUrgency: isUrgent ? 'urgent' : isInfo ? 'info' : 'normal',
  };
}

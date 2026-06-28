import { z } from 'zod';
import { openai } from './openai';
import { getAnalysisPrompt, ReportType, AnalysisLanguage } from '@/lib/analysis/prompts';
import type { BusinessType } from '@/lib/businessTypes';
import { normalizeSaleStatus } from '@/lib/analysis/saleStatus';

const AnalysisSchema = z.object({
  summary:        z.string(),
  product:        z.string(),
  saleStatus:     z.enum(['sold', 'not_sold', 'potential_sale', 'junk']),
  customerIntent: z.string(),
  nextStep:       z.string(),
  score:          z.number().min(1).max(10).nullable(),

  issues:          z.array(z.string()).default([]),
  positives:       z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),

  objections:      z.array(z.string()).optional().default([]),
  managerMistakes: z.array(z.string()).optional().default([]),

  detailedReport: z.object({
    salesOutcomeReason:  z.string().optional(),
    needDiscovery:       z.string().optional(),
    objectionHandling:   z.string().optional(),
    upsellCrossSell:     z.string().optional(),
    communicationTone:   z.string().optional(),
    customerMood:        z.string().optional(),
    coachingFeedback:    z.string().optional(),
  }).optional().default({}),

  // Industry-specific insights (present when businessType !== "other")
  industryData: z.object({
    insights:             z.array(z.string()).default([]),
    warnings:             z.array(z.string()).default([]),
    missedOpportunities:  z.array(z.string()).default([]),
    kpis:                 z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).default({}),
  }).optional(),
});

export type CallAnalysis = z.infer<typeof AnalysisSchema>;

export { normalizeSaleStatus } from '@/lib/analysis/saleStatus';

export async function analyzeCall(
  transcript:   string,
  reportType:   ReportType = 'medium',
  language:     AnalysisLanguage = 'uk',
  businessType: BusinessType = 'other',
): Promise<CallAnalysis> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role:    'system',
        content: getAnalysisPrompt(reportType, language, businessType),
      },
      {
        role:    'user',
        content: `Transcript:\n\n${transcript}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty AI analysis response');

  const parsed = JSON.parse(content);

  if (parsed.saleStatus) {
    parsed.saleStatus = normalizeSaleStatus(parsed.saleStatus);
  }

  // Junk calls have no meaningful quality score — null it out so it's excluded from averages
  if (parsed.saleStatus === "junk") {
    parsed.score = null;
  }

  return AnalysisSchema.parse(parsed);
}

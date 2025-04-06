
import { analyzeWithTransformers } from "./transformersService";

interface AnalysisResult {
  summary: string;
  keyFindings: Array<{ name: string; value: string; status: 'normal' | 'abnormal' | 'warning' }>;
  recommendations: string[];
}

/**
 * Analyzes medical report text using the server-side ClinicalBERT model
 * This function simply delegates to the transformersService for consistency
 */
export async function analyzeReport(text: string): Promise<AnalysisResult> {
  try {
    console.log("Delegating to server-side ClinicalBERT analysis...");
    return await analyzeWithTransformers(text);
  } catch (error) {
    console.error('Error analyzing report:', error);
    throw error;
  }
}

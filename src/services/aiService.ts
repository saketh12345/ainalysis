
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
    console.log("aiService: Starting analysis with ClinicalBERT...");
    console.log(`aiService: Text length to analyze: ${text.length} characters`);
    
    // Add a sample of the text being sent (first 100 chars)
    if (text.length > 0) {
      console.log(`aiService: Text sample: "${text.substring(0, 100)}..."`);
    }
    
    const result = await analyzeWithTransformers(text);
    
    console.log("aiService: Analysis complete. Results received:");
    console.log(`aiService: Summary length: ${result.summary.length} characters`);
    console.log(`aiService: Key findings: ${result.keyFindings.length} items`);
    console.log(`aiService: Recommendations: ${result.recommendations.length} items`);
    
    return result;
  } catch (error) {
    console.error('aiService: Error analyzing report:', error);
    throw error;
  }
}

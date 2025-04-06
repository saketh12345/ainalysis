
import { pipeline, env } from '@huggingface/transformers';

// Configure the transformers library
env.allowLocalModels = false;
env.useBrowserCache = true;

interface AnalysisResult {
  summary: string;
  keyFindings: Array<{ name: string; value: string; status: 'normal' | 'abnormal' | 'warning' }>;
  recommendations: string[];
}

let biomedicalModelLoading = false;
let biomedicalAnalyzer: any = null;

/**
 * Initialize the medical text analysis pipeline
 * This loads the model into memory, so should be called early
 */
export async function initBiomedicalAnalyzer() {
  if (biomedicalAnalyzer !== null || biomedicalModelLoading) return;
  
  try {
    biomedicalModelLoading = true;
    console.log("Loading biomedical text analysis model...");
    
    // Use a smaller, more browser-friendly model
    biomedicalAnalyzer = await pipeline(
      'text-generation',
      'Xenova/distilgpt2',  // Using Xenova's browser-optimized version of distilgpt2
      { 
        quantized: true,    // Use quantized model for better browser performance
        device: 'cpu'       // Explicitly use CPU for compatibility
      }
    );
    
    console.log("Biomedical model loaded successfully");
    return true;
  } catch (error) {
    console.error("Error loading biomedical model:", error);
    return false;
  } finally {
    biomedicalModelLoading = false;
  }
}

/**
 * Analyzes medical report text using Hugging Face transformers
 * @param text The medical report text
 */
export async function analyzeWithTransformers(text: string): Promise<AnalysisResult> {
  try {
    // Make sure model is loaded
    if (biomedicalAnalyzer === null) {
      const success = await initBiomedicalAnalyzer();
      if (!success) {
        throw new Error("Could not load biomedical model");
      }
    }
    
    console.log("Analyzing text with transformers model...");
    
    // Extract key medical terms using regex patterns
    // (since we don't have a specialized biomedical NER model in browser yet)
    const bloodGlucoseMatch = text.match(/(?:blood glucose|glucose)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i);
    const cholesterolMatch = text.match(/(?:total cholesterol)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i);
    const bloodPressureMatch = text.match(/(?:blood pressure|BP)[:\s]+(\d+\/\d+)\s*(?:mmHg)/i);
    
    // Create findings based on extracted values
    const findings = [];
    
    if (bloodGlucoseMatch) {
      const value = parseFloat(bloodGlucoseMatch[1]);
      findings.push({
        name: "Blood Glucose",
        value: `${bloodGlucoseMatch[1]} mg/dL`,
        status: value > 140 ? 'abnormal' : value > 100 ? 'warning' : 'normal'
      });
    }
    
    if (cholesterolMatch) {
      const value = parseFloat(cholesterolMatch[1]);
      findings.push({
        name: "Total Cholesterol",
        value: `${cholesterolMatch[1]} mg/dL`,
        status: value > 240 ? 'abnormal' : value > 200 ? 'warning' : 'normal'
      });
    }
    
    if (bloodPressureMatch) {
      const [systolic, diastolic] = bloodPressureMatch[1].split('/').map(Number);
      findings.push({
        name: "Blood Pressure",
        value: `${bloodPressureMatch[1]} mmHg`,
        status: systolic > 140 || diastolic > 90 ? 'abnormal' : 
               systolic > 120 || diastolic > 80 ? 'warning' : 'normal'
      });
    }
    
    // If we didn't find any structured data, add a generic finding
    if (findings.length === 0) {
      findings.push({
        name: "Text Analysis",
        value: "Report processed",
        status: 'normal'
      });
    }
    
    // Generate a simple analysis summary with the text generation model
    let summary;
    try {
      const promptText = `Medical report summary: ${text.substring(0, 100)}...`;
      const summaryResult = await biomedicalAnalyzer(
        promptText,
        { 
          max_new_tokens: 50, 
          do_sample: true,
          temperature: 0.7
        }
      );
      
      // Extract the generated text and clean it up
      summary = summaryResult[0]?.generated_text || "";
      // Remove the input prompt from the output
      summary = summary.replace(promptText, "").trim();
      
      // If the summary is empty or too short, use a default message
      if (!summary || summary.length < 20) {
        summary = "Medical report processed. Please consult a healthcare professional for interpretation.";
      }
    } catch (summaryError) {
      console.error("Error generating summary:", summaryError);
      summary = "Medical report processed. The browser-based analysis provides basic insights only.";
    }
    
    return {
      summary,
      keyFindings: findings,
      recommendations: [
        "Please consult with a healthcare professional for interpretation of these results",
        "Regular check-ups are recommended for monitoring your health"
      ]
    };
  } catch (error) {
    console.error("Error analyzing with transformers:", error);
    
    // Return a fallback analysis
    return {
      summary: "We could not automatically analyze this report using the browser-based model. Please consult with your healthcare provider for interpretation.",
      keyFindings: [
        { 
          name: "Analysis Status", 
          value: "Failed to process", 
          status: 'warning' 
        }
      ],
      recommendations: [
        "Please share this report with your healthcare provider for proper interpretation",
        "Consider trying the cloud-based analysis option for better results"
      ]
    };
  }
}

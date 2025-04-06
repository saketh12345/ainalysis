
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
    
    // Load a text generation model suitable for biomedical text
    // We're using a smaller model that can run in the browser
    biomedicalAnalyzer = await pipeline(
      'text-generation',
      'onnx-community/distilgpt2',
      { device: 'cpu' }
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
    
    // Use the text generation model to create a simple summary
    // This is not ideal for medical analysis but demonstrates the integration
    const summaryResult = await biomedicalAnalyzer(
      `Medical report summary: ${text.substring(0, 100)}...`,
      { max_new_tokens: 50, do_sample: true }
    );
    
    const summary = summaryResult[0].generated_text || 
      "This medical report has been processed using transformer models. Please consult a healthcare professional for accurate interpretation.";
    
    // For a real application, you would want to use a model specifically fine-tuned for medical report analysis
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

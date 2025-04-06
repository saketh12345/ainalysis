
import { pipeline, env } from '@huggingface/transformers';

// Configure the transformers library
env.allowLocalModels = false;
env.useBrowserCache = true;
// Set the Hugging Face token
env.apiToken = "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";

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
    console.log("Loading Llama 3 text analysis model...");
    
    // Use Meta-Llama-3-8B-Instruct model
    biomedicalAnalyzer = await pipeline(
      'text-generation',
      'meta-llama/Meta-Llama-3-8B-Instruct',
      { 
        device: 'cpu',       // Explicitly use CPU for compatibility
      }
    );
    
    console.log("Llama 3 model loaded successfully");
    return true;
  } catch (error) {
    console.error("Error loading Llama 3 model:", error);
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
        throw new Error("Could not load Llama 3 model");
      }
    }
    
    console.log("Analyzing text with Llama 3 model...");
    
    // Create a medical-specific prompt for better results
    const promptText = `
    You are a medical AI assistant analyzing a patient's medical report. 
    Extract key health metrics, identify abnormal values, and provide a concise summary.
    
    Medical report: ${text}
    
    Format your response as follows:
    SUMMARY: [Brief overview of patient health based on the report]
    KEY FINDINGS: [List key metrics with their values and status (normal/abnormal/warning)]
    RECOMMENDATIONS: [Provide 2-3 simple recommendations based on the findings]
    `;
    
    // Extract key medical terms using regex patterns
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
    
    // Generate a comprehensive analysis using the Llama 3 model
    let summary;
    let recommendations = [
      "Please consult with a healthcare professional for interpretation of these results",
      "Regular check-ups are recommended for monitoring your health"
    ];
    
    try {
      const llmResult = await biomedicalAnalyzer(
        promptText,
        { 
          max_new_tokens: 500,
          do_sample: true,
          temperature: 0.2,
          top_p: 0.95
        }
      );
      
      // Extract the generated text
      const generatedText = llmResult[0]?.generated_text || "";
      
      // Try to extract the summary from the response
      const summaryMatch = generatedText.match(/SUMMARY:(.*?)(?=KEY FINDINGS:|$)/s);
      if (summaryMatch && summaryMatch[1]) {
        summary = summaryMatch[1].trim();
      } else {
        summary = "Medical report processed. Please consult a healthcare professional for interpretation.";
      }
      
      // Try to extract recommendations
      const recommendationsMatch = generatedText.match(/RECOMMENDATIONS:(.*?)(?=$)/s);
      if (recommendationsMatch && recommendationsMatch[1]) {
        const recommendationsText = recommendationsMatch[1].trim();
        const extractedRecommendations = recommendationsText
          .split(/\d+\.|\n-|\n\*/)
          .map(item => item.trim())
          .filter(item => item.length > 10);
        
        if (extractedRecommendations.length > 0) {
          recommendations = extractedRecommendations;
        }
      }
      
    } catch (summaryError) {
      console.error("Error generating analysis with Llama 3:", summaryError);
      summary = "Medical report processed. The browser-based analysis provides basic insights only.";
    }
    
    return {
      summary,
      keyFindings: findings,
      recommendations: recommendations
    };
  } catch (error) {
    console.error("Error analyzing with transformers:", error);
    
    // Return a fallback analysis
    return {
      summary: "We could not automatically analyze this report using the Llama 3 model. Please consult with your healthcare provider for interpretation.",
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

/**
 * This file handles communication with the server-side transformer model via edge function
 */

interface AnalysisResult {
  summary: string;
  keyFindings: Array<{ name: string; value: string; status: 'normal' | 'abnormal' | 'warning' }>;
  recommendations: string[];
}

/**
 * Analyzes medical report text using a server-side edge function
 * @param text The medical report text to analyze
 */
export async function analyzeWithTransformers(text: string): Promise<AnalysisResult> {
  try {
    console.log("transformersService: Starting edge function call for analysis...");
    const startTime = performance.now();
    
    // Call the edge function to analyze the text
    const response = await fetch('/api/analyze-medical-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    const endTime = performance.now();
    console.log(`transformersService: Edge function call completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`transformersService: Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`transformersService: Edge function error: ${errorText}`);
      throw new Error(`Edge function returned status ${response.status}`);
    }
    
    const analysisResult = await response.json();
    console.log("transformersService: Successfully parsed JSON response");
    
    // Log the shape of the response
    console.log("transformersService: Response structure:", {
      hasSummary: !!analysisResult.summary,
      hasKeyFindings: Array.isArray(analysisResult.keyFindings),
      hasRecommendations: Array.isArray(analysisResult.recommendations),
    });
    
    // If the edge function provided a complete analysis, use it
    if (analysisResult && analysisResult.summary) {
      return analysisResult;
    }
    
    console.log("transformersService: Incomplete response from edge function, using fallback");
    // Return a fallback analysis if the response is incomplete
    return createFallbackAnalysis(text);
    
  } catch (error) {
    console.error("transformersService: Error analyzing with edge function:", error);
    console.log("transformersService: Using fallback analysis");
    return createFallbackAnalysis(text);
  }
}

/**
 * Creates a basic fallback analysis when the edge function fails
 */
function createFallbackAnalysis(text: string): AnalysisResult {
  console.log("transformersService: Creating fallback analysis");
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
  
  return {
    summary: "Medical report processed. Please consult a healthcare professional for interpretation.",
    keyFindings: findings,
    recommendations: [
      "Please consult with a healthcare professional for interpretation of these results",
      "Regular check-ups are recommended for monitoring your health"
    ]
  };
}

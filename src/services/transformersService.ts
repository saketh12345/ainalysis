
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
    console.log(`transformersService: Text length being sent: ${text.length} characters`);
    if (text.length > 0) {
      // Log a sample of the text being sent for debugging
      console.log(`transformersService: Text sample: "${text.substring(0, 100)}..."`);
    }
    
    const startTime = performance.now();
    
    // Call the Supabase edge function to analyze the text
    const response = await fetch('https://ddrcidbvmdukwlhtiagx.supabase.co/functions/v1/analyze-clinical-text', {
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
      throw new Error(`Edge function returned status ${response.status}: ${errorText}`);
    }
    
    const analysisResult = await response.json();
    console.log("transformersService: Successfully parsed JSON response");
    
    // Log the shape of the response for debugging
    console.log("transformersService: Response structure:", {
      hasSummary: !!analysisResult.summary,
      hasKeyFindings: Array.isArray(analysisResult.keyFindings),
      hasRecommendations: Array.isArray(analysisResult.recommendations),
      keyFindingsCount: analysisResult.keyFindings?.length,
      recommendationsCount: analysisResult.recommendations?.length,
      summaryPreview: analysisResult.summary ? analysisResult.summary.substring(0, 50) + "..." : "none"
    });
    
    // If the edge function provided a complete analysis, use it
    if (analysisResult && analysisResult.summary && 
        Array.isArray(analysisResult.keyFindings) && 
        Array.isArray(analysisResult.recommendations)) {
      
      console.log("transformersService: Returning complete analysis from edge function");
      return analysisResult;
    }
    
    console.log("transformersService: Incomplete response from edge function, using fallback");
    // Log the actual response to understand what's missing
    console.log("transformersService: Actual response:", JSON.stringify(analysisResult).substring(0, 200));
    
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
  const cholesterolMatch = text.match(/(?:total cholesterol|cholesterol)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i);
  const bloodPressureMatch = text.match(/(?:blood pressure|BP)[:\s]+(\d+\/\d+)\s*(?:mmHg)?/i);
  const hdlMatch = text.match(/(?:hdl|hdl cholesterol)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i);
  const ldlMatch = text.match(/(?:ldl|ldl cholesterol)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i);
  const a1cMatch = text.match(/(?:a1c|hba1c|hemoglobin a1c)[:\s]+(\d+\.?\d*)\s*(?:%)/i);
  const triglyceridesMatch = text.match(/(?:triglycerides)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i);
  
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
  
  if (hdlMatch) {
    const value = parseFloat(hdlMatch[1]);
    findings.push({
      name: "HDL Cholesterol",
      value: `${hdlMatch[1]} mg/dL`,
      status: value < 40 ? 'abnormal' : value < 60 ? 'warning' : 'normal'
    });
  }
  
  if (ldlMatch) {
    const value = parseFloat(ldlMatch[1]);
    findings.push({
      name: "LDL Cholesterol",
      value: `${ldlMatch[1]} mg/dL`,
      status: value > 160 ? 'abnormal' : value > 130 ? 'warning' : 'normal'
    });
  }
  
  if (triglyceridesMatch) {
    const value = parseFloat(triglyceridesMatch[1]);
    findings.push({
      name: "Triglycerides",
      value: `${triglyceridesMatch[1]} mg/dL`,
      status: value > 200 ? 'abnormal' : value > 150 ? 'warning' : 'normal'
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
  
  if (a1cMatch) {
    const value = parseFloat(a1cMatch[1]);
    findings.push({
      name: "Hemoglobin A1C",
      value: `${a1cMatch[1]} %`,
      status: value > 6.5 ? 'abnormal' : value > 5.7 ? 'warning' : 'normal'
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
  
  // Generate basic summary based on findings
  let summary = "Based on the available information in your lab report, we've identified some key metrics.";
  
  const abnormalFindings = findings.filter(f => f.status === 'abnormal');
  const warningFindings = findings.filter(f => f.status === 'warning');
  
  if (abnormalFindings.length > 0) {
    summary += " There are some abnormal values that may require medical attention.";
  } else if (warningFindings.length > 0) {
    summary += " There are some values that are borderline and may require monitoring.";
  } else {
    summary += " The values we could identify appear to be within normal ranges.";
  }
  
  // Generate recommendations based on findings
  const recommendations = [
    "Please consult with a healthcare professional for interpretation of these results",
    "Regular check-ups are recommended for monitoring your health"
  ];
  
  if (abnormalFindings.length > 0) {
    recommendations.push(
      `Consider discussing the abnormal ${abnormalFindings.map(f => f.name).join(', ')} values with your doctor`
    );
  }
  
  return {
    summary,
    keyFindings: findings,
    recommendations
  };
}

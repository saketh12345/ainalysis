
// Edge function for analyzing medical reports using the Hugging Face API

export async function handler(req, context) {
  try {
    const { text } = await req.json();
    
    if (!text || text.trim() === '') {
      return new Response(JSON.stringify({ 
        error: "No text provided for analysis" 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
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

    // Make a request to the Hugging Face API
    const response = await fetch("https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY || "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"}`
      },
      body: JSON.stringify({
        inputs: promptText,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.2,
          top_p: 0.95,
          return_full_text: false
        }
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error:", errorText);
      throw new Error(`Hugging Face API returned status ${response.status}`);
    }
    
    const result = await response.json();
    const generatedText = result && result[0] && result[0].generated_text 
      ? result[0].generated_text 
      : "";
      
    // Extract the summary from the response
    const summaryMatch = generatedText.match(/SUMMARY:(.*?)(?=KEY FINDINGS:|$)/s);
    const summary = summaryMatch && summaryMatch[1] 
      ? summaryMatch[1].trim() 
      : "Medical report processed. Please consult a healthcare professional for interpretation.";
    
    // Extract key findings from the response
    const keyFindingsMatch = generatedText.match(/KEY FINDINGS:(.*?)(?=RECOMMENDATIONS:|$)/s);
    const keyFindingsText = keyFindingsMatch && keyFindingsMatch[1] ? keyFindingsMatch[1].trim() : "";
    
    // Process the key findings text into structured data
    // For simplicity, we'll extract lines that look like "[metric]: [value] - [status]"
    const findingsRegex = /([^:]+):\s*([^-]+)-\s*(\w+)/g;
    let match;
    const keyFindings = [];
    
    while ((match = findingsRegex.exec(keyFindingsText)) !== null) {
      const name = match[1].trim();
      const value = match[2].trim();
      const statusText = match[3].toLowerCase().trim();
      
      // Map the status text to our defined statuses
      let status = 'normal';
      if (statusText.includes('abnormal') || statusText.includes('high') || 
          statusText.includes('low') || statusText.includes('critical')) {
        status = 'abnormal';
      } else if (statusText.includes('warning') || statusText.includes('borderline') || 
                statusText.includes('elevated') || statusText.includes('moderate')) {
        status = 'warning';
      }
      
      keyFindings.push({ name, value, status });
    }
    
    // If we couldn't extract structured findings, add a generic one
    if (keyFindings.length === 0) {
      keyFindings.push({
        name: "Text Analysis",
        value: "Report processed",
        status: 'normal'
      });
    }
    
    // Extract recommendations from the response
    const recommendationsMatch = generatedText.match(/RECOMMENDATIONS:(.*?)(?=$)/s);
    const recommendationsText = recommendationsMatch && recommendationsMatch[1] 
      ? recommendationsMatch[1].trim() 
      : "";
      
    // Split recommendations by line breaks or bullet points
    const recommendations = recommendationsText
      .split(/\d+\.|\n-|\n\*/)
      .map(item => item.trim())
      .filter(item => item.length > 10);
      
    // If we couldn't extract recommendations, add generic ones
    if (recommendations.length === 0) {
      recommendations.push(
        "Please consult with a healthcare professional for interpretation of these results",
        "Regular check-ups are recommended for monitoring your health"
      );
    }
    
    return new Response(JSON.stringify({
      summary,
      keyFindings,
      recommendations
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Edge function error:", error);
    
    return new Response(JSON.stringify({
      error: "Failed to analyze medical report",
      summary: "We could not automatically analyze this report. Please consult with your healthcare provider for interpretation.",
      keyFindings: [{ name: "Analysis Status", value: "Failed to process", status: 'warning' }],
      recommendations: [
        "Please share this report with your healthcare provider for proper interpretation",
        "Regular health check-ups are recommended"
      ]
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

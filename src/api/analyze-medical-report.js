
// Edge function for analyzing medical reports using the Hugging Face Meta-Llama-3-8B-Instruct model

export async function handler(req, context) {
  try {
    console.log("Edge function: Starting medical report analysis");
    const { text } = await req.json();
    
    if (!text || text.trim() === '') {
      console.error("Edge function: No text provided for analysis");
      return new Response(JSON.stringify({ 
        error: "No text provided for analysis" 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    console.log(`Edge function: Received text of length ${text.length}`);
    
    // Create a medical-specific prompt for the Llama model
    const promptText = `
    <|system|>
    You are a medical AI assistant specialized in analyzing lab reports. Analyze the following lab report carefully and provide:
    1. A summary of the patient's overall health status
    2. A list of only the abnormal values (too high or too low) with their status
    3. 2-3 key insights or possible risks based on the report

    Format your response exactly as follows:
    SUMMARY: [Brief overview of patient health based on the report]
    KEY FINDINGS: [List only abnormal metrics with their values and status]
    RECOMMENDATIONS: [Provide 2-3 key insights based on the findings]
    <|end|>
    
    <|user|>
    Analyze this lab report text:
    
    ${text}
    <|end|>
    
    <|assistant|>
    `;

    console.log("Edge function: Sending request to Hugging Face API");
    console.log("Edge function: Using model: meta-llama/Meta-Llama-3-8B-Instruct");
    
    const startTime = Date.now();
    
    // Make a request to the Hugging Face API with Meta-Llama-3-8B-Instruct model
    const response = await fetch("https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer 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`
      },
      body: JSON.stringify({
        inputs: promptText,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.2,
          return_full_text: false
        }
      }),
    });
    
    const endTime = Date.now();
    console.log(`Edge function: Hugging Face API response received in ${endTime - startTime}ms`);
    console.log(`Edge function: Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Edge function: Hugging Face API error:", errorText);
      throw new Error(`Hugging Face API returned status ${response.status}`);
    }
    
    const result = await response.json();
    console.log("Edge function: Successfully parsed JSON response from Hugging Face");
    
    // Extract the generated text from the response
    let generatedText = "";
    if (result && Array.isArray(result) && result[0] && result[0].generated_text) {
      generatedText = result[0].generated_text;
    } else if (result && typeof result === 'string') {
      generatedText = result;
    } else if (result && result.generated_text) {
      generatedText = result.generated_text;
    } else {
      // Log the actual shape of the response
      console.log("Edge function: Unexpected response format:", JSON.stringify(result).substring(0, 200));
      generatedText = JSON.stringify(result);
    }
    
    console.log(`Edge function: Generated text length: ${generatedText.length} characters`);
    if (generatedText.length > 0) {
      console.log(`Edge function: Generated text sample: "${generatedText.substring(0, 100)}..."`);
    }
      
    // Extract the summary from the response
    const summaryMatch = generatedText.match(/SUMMARY:(.*?)(?=KEY FINDINGS:|$)/s);
    const summary = summaryMatch && summaryMatch[1] 
      ? summaryMatch[1].trim() 
      : "Medical report processed. Please consult a healthcare professional for interpretation.";
    
    // Extract key findings from the response
    const keyFindingsMatch = generatedText.match(/KEY FINDINGS:(.*?)(?=RECOMMENDATIONS:|$)/s);
    const keyFindingsText = keyFindingsMatch && keyFindingsMatch[1] ? keyFindingsMatch[1].trim() : "";
    
    // Process the key findings text into structured data
    // Look for patterns like "- Blood Pressure: 140/90 mmHg - Elevated" or "- Cholesterol: 240 mg/dL - High"
    const findingsRegex = /[•\-\*]\s*([^:]+):\s*([^-]+)-\s*(\w+)/g;
    let match;
    const keyFindings = [];
    
    while ((match = findingsRegex.exec(keyFindingsText)) !== null) {
      const name = match[1].trim();
      const value = match[2].trim();
      const statusText = match[3].toLowerCase().trim();
      
      // Map the status text to our defined statuses
      let status = 'normal';
      if (statusText.includes('abnormal') || statusText.includes('high') || 
          statusText.includes('low') || statusText.includes('critical') ||
          statusText.includes('elevated')) {
        status = 'abnormal';
      } else if (statusText.includes('warning') || statusText.includes('borderline') || 
                statusText.includes('moderate')) {
        status = 'warning';
      }
      
      keyFindings.push({ name, value, status });
    }
    
    // If we couldn't extract structured findings, attempt direct extraction from text
    if (keyFindings.length === 0) {
      console.log("Edge function: No structured findings extracted from model response, attempting direct extraction");
      
      // Direct extraction of common lab values using regex patterns
      const bloodGlucoseMatch = text.match(/(?:blood glucose|glucose)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i);
      const cholesterolMatch = text.match(/(?:total cholesterol|cholesterol)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i);
      const bloodPressureMatch = text.match(/(?:blood pressure|BP)[:\s]+(\d+\/\d+)\s*(?:mmHg)?/i);
      
      if (bloodGlucoseMatch) {
        const value = parseFloat(bloodGlucoseMatch[1]);
        keyFindings.push({
          name: "Blood Glucose",
          value: `${bloodGlucoseMatch[1]} mg/dL`,
          status: value > 140 ? 'abnormal' : value > 100 ? 'warning' : 'normal'
        });
      }
      
      if (cholesterolMatch) {
        const value = parseFloat(cholesterolMatch[1]);
        keyFindings.push({
          name: "Total Cholesterol",
          value: `${cholesterolMatch[1]} mg/dL`,
          status: value > 240 ? 'abnormal' : value > 200 ? 'warning' : 'normal'
        });
      }
      
      if (bloodPressureMatch) {
        const [systolic, diastolic] = bloodPressureMatch[1].split('/').map(Number);
        keyFindings.push({
          name: "Blood Pressure",
          value: `${bloodPressureMatch[1]} mmHg`,
          status: systolic > 140 || diastolic > 90 ? 'abnormal' : 
                systolic > 120 || diastolic > 80 ? 'warning' : 'normal'
        });
      }
    }
    
    // If we still couldn't extract any structured findings, add a generic one
    if (keyFindings.length === 0) {
      console.log("Edge function: No structured findings extracted, adding generic finding");
      keyFindings.push({
        name: "Text Analysis",
        value: "Report processed",
        status: 'normal'
      });
    } else {
      console.log(`Edge function: Extracted ${keyFindings.length} key findings`);
    }
    
    // Extract recommendations from the response
    const recommendationsMatch = generatedText.match(/RECOMMENDATIONS:(.*?)(?=$)/s);
    const recommendationsText = recommendationsMatch && recommendationsMatch[1] 
      ? recommendationsMatch[1].trim() 
      : "";
      
    // Split recommendations by line breaks or bullet points
    const recommendations = recommendationsText
      .split(/[•\-\*]|\d+\.|\n/)
      .map(item => item.trim())
      .filter(item => item.length > 10);
      
    // If we couldn't extract recommendations, add generic ones
    if (recommendations.length === 0) {
      console.log("Edge function: No recommendations extracted, adding generic recommendations");
      recommendations.push(
        "Please consult with a healthcare professional for interpretation of these results",
        "Regular check-ups are recommended for monitoring your health"
      );
    } else {
      console.log(`Edge function: Extracted ${recommendations.length} recommendations`);
    }
    
    console.log("Edge function: Analysis complete. Returning results.");
    
    return new Response(JSON.stringify({
      summary,
      keyFindings,
      recommendations
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Edge function: Error processing request:", error);
    
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

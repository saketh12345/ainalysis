
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()
    console.log("Edge function: Received medical text for analysis")
    
    if (!text || text.trim() === '') {
      console.error("Edge function: No text provided for analysis")
      return new Response(JSON.stringify({ 
        error: "No text provided for analysis" 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }
    
    console.log(`Edge function: Processing text of length ${text.length} characters`)
    
    // Create a medical analysis prompt for the Llama model
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
    `

    console.log("Edge function: Sending request to Hugging Face API")
    console.log("Edge function: Using model: meta-llama/Meta-Llama-3-8B-Instruct")
    
    const startTime = Date.now()
    
    // Make a request to the Hugging Face API with Meta-Llama-3-8B-Instruct model
    const response = await fetch("https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("HUGGING_FACE_ACCESS_TOKEN")}`
      },
      body: JSON.stringify({
        inputs: promptText,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.2,
          return_full_text: false
        }
      }),
    })
    
    const endTime = Date.now()
    console.log(`Edge function: Hugging Face API response received in ${endTime - startTime}ms`)
    console.log(`Edge function: Response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Edge function: Hugging Face API error: ${errorText}`)
      
      // Try using a fallback approach
      console.log("Edge function: Attempting to use fallback extraction")
      return await useFallbackModel(text, corsHeaders)
    }
    
    const result = await response.json()
    console.log("Edge function: Successfully parsed JSON response from Hugging Face")
    
    // Extract the generated text from the response
    let generatedText = ""
    if (result && Array.isArray(result) && result[0] && result[0].generated_text) {
      generatedText = result[0].generated_text
    } else if (result && typeof result === 'string') {
      generatedText = result
    } else if (result && result.generated_text) {
      generatedText = result.generated_text
    } else {
      // Log the actual shape of the response
      console.log("Edge function: Unexpected response format:", JSON.stringify(result).substring(0, 200))
      generatedText = JSON.stringify(result)
    }
    
    console.log(`Edge function: Generated text length: ${generatedText.length} characters`)
    if (generatedText.length > 0) {
      console.log(`Edge function: Generated text sample: "${generatedText.substring(0, 100)}..."`)
    } else {
      console.log("Edge function: Empty response from model, using fallback")
      return await useFallbackModel(text, corsHeaders)
    }
      
    // Extract the summary from the response
    const summaryMatch = generatedText.match(/SUMMARY:(.*?)(?=KEY FINDINGS:|$)/s)
    const summary = summaryMatch && summaryMatch[1] 
      ? summaryMatch[1].trim() 
      : "Medical report processed. Please consult a healthcare professional for interpretation."
    
    // Extract key findings from the response
    const keyFindingsMatch = generatedText.match(/KEY FINDINGS:(.*?)(?=RECOMMENDATIONS:|$)/s)
    const keyFindingsText = keyFindingsMatch && keyFindingsMatch[1] ? keyFindingsMatch[1].trim() : ""
    
    // Process the key findings text into structured data
    // Look for patterns like "- Blood Pressure: 140/90 mmHg - Elevated" or "- Cholesterol: 240 mg/dL - High"
    const findingsRegex = /[•\-\*]\s*([^:]+):\s*([^-]+)-\s*(\w+)/g
    let match
    const keyFindings = []
    
    while ((match = findingsRegex.exec(keyFindingsText)) !== null) {
      const name = match[1].trim()
      const value = match[2].trim()
      const statusText = match[3].toLowerCase().trim()
      
      // Map the status text to our defined statuses
      let status = 'normal'
      if (statusText.includes('abnormal') || statusText.includes('high') || 
          statusText.includes('low') || statusText.includes('critical') ||
          statusText.includes('elevated')) {
        status = 'abnormal'
      } else if (statusText.includes('warning') || statusText.includes('borderline') || 
                statusText.includes('moderate')) {
        status = 'warning'
      }
      
      keyFindings.push({ name, value, status })
    }
    
    // If we couldn't extract structured findings from the model response,
    // try to extract them directly from the text using regex patterns
    if (keyFindings.length === 0) {
      console.log("Edge function: No structured findings extracted from model response, attempting direct extraction")
      const extractedFindings = extractFindingsFromText(text)
      keyFindings.push(...extractedFindings)
    }
    
    // If we still don't have any findings, add a generic one
    if (keyFindings.length === 0) {
      console.log("Edge function: No structured findings extracted, adding generic finding")
      keyFindings.push({
        name: "Text Analysis",
        value: "Report processed",
        status: 'normal'
      })
    } else {
      console.log(`Edge function: Extracted ${keyFindings.length} key findings`)
    }
    
    // Extract recommendations from the response
    const recommendationsMatch = generatedText.match(/RECOMMENDATIONS:(.*?)(?=$)/s)
    const recommendationsText = recommendationsMatch && recommendationsMatch[1] 
      ? recommendationsMatch[1].trim() 
      : ""
      
    // Split recommendations by line breaks or bullet points
    const recommendations = recommendationsText
      .split(/[•\-\*]|\d+\.|\n/)
      .map(item => item.trim())
      .filter(item => item.length > 10)
      
    // If we couldn't extract recommendations, add generic ones
    if (recommendations.length === 0) {
      console.log("Edge function: No recommendations extracted, adding generic recommendations")
      recommendations.push(
        "Please consult with a healthcare professional for interpretation of these results",
        "Regular check-ups are recommended for monitoring your health"
      )
    } else {
      console.log(`Edge function: Extracted ${recommendations.length} recommendations`)
    }
    
    console.log("Edge function: Analysis complete. Returning results.")
    
    return new Response(JSON.stringify({
      summary,
      keyFindings,
      recommendations
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    console.error("Edge function: Error processing request:", error)
    
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})

// Function to extract findings directly from text using regex patterns
function extractFindingsFromText(text) {
  const findings = []
  
  // Common lab test patterns with their normal ranges
  const patterns = [
    {
      name: "Blood Glucose",
      pattern: /(?:blood\s+glucose|glucose)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i,
      unit: "mg/dL",
      evaluate: (value) => ({
        status: value > 140 ? 'abnormal' : value > 100 ? 'warning' : 'normal'
      })
    },
    {
      name: "Total Cholesterol",
      pattern: /(?:total\s+cholesterol|cholesterol)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i,
      unit: "mg/dL",
      evaluate: (value) => ({
        status: value > 240 ? 'abnormal' : value > 200 ? 'warning' : 'normal'
      })
    },
    {
      name: "HDL Cholesterol",
      pattern: /(?:hdl|hdl\s+cholesterol)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i,
      unit: "mg/dL",
      evaluate: (value) => ({
        status: value < 40 ? 'abnormal' : value < 60 ? 'warning' : 'normal'
      })
    },
    {
      name: "LDL Cholesterol",
      pattern: /(?:ldl|ldl\s+cholesterol)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i,
      unit: "mg/dL",
      evaluate: (value) => ({
        status: value > 160 ? 'abnormal' : value > 130 ? 'warning' : 'normal'
      })
    },
    {
      name: "Triglycerides",
      pattern: /(?:triglycerides)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i,
      unit: "mg/dL",
      evaluate: (value) => ({
        status: value > 200 ? 'abnormal' : value > 150 ? 'warning' : 'normal'
      })
    },
    {
      name: "Blood Pressure",
      pattern: /(?:blood\s+pressure|bp)[:\s]+(\d+)\/(\d+)\s*(?:mmHg)?/i,
      unit: "mmHg",
      evaluateSpecial: (match) => {
        const systolic = parseInt(match[1])
        const diastolic = parseInt(match[2])
        const value = `${match[1]}/${match[2]}`
        const status = systolic > 140 || diastolic > 90 ? 'abnormal' : 
                      systolic > 120 || diastolic > 80 ? 'warning' : 'normal'
        return { value, status }
      }
    },
    {
      name: "Hemoglobin A1C",
      pattern: /(?:a1c|hba1c|hemoglobin\s+a1c)[:\s]+(\d+\.?\d*)\s*(?:%)/i,
      unit: "%",
      evaluate: (value) => ({
        status: value > 6.5 ? 'abnormal' : value > 5.7 ? 'warning' : 'normal'
      })
    }
  ]
  
  // Check each pattern against the text
  for (const test of patterns) {
    const match = text.match(test.pattern)
    
    if (match) {
      if (test.evaluateSpecial) {
        // For special cases like blood pressure that need custom handling
        const { value, status } = test.evaluateSpecial(match)
        findings.push({
          name: test.name,
          value: `${value} ${test.unit}`,
          status
        })
      } else {
        // Standard numeric value evaluation
        const value = parseFloat(match[1])
        const { status } = test.evaluate(value)
        findings.push({
          name: test.name,
          value: `${match[1]} ${test.unit}`,
          status
        })
      }
    }
  }
  
  return findings
}

// Function to use a different model as a fallback
async function useFallbackModel(text, corsHeaders) {
  console.log("Edge function: Using text-generation model as fallback")
  
  try {
    // Use simpler text extraction with regex patterns
    const extractedFindings = extractFindingsFromText(text)
    
    // Generate basic summary and recommendations based on findings
    let summary = "Based on the available information in your lab report, we've identified some key metrics."
    
    const abnormalFindings = extractedFindings.filter(f => f.status === 'abnormal')
    const warningFindings = extractedFindings.filter(f => f.status === 'warning')
    
    if (abnormalFindings.length > 0) {
      summary += " There are some abnormal values that may require medical attention."
    } else if (warningFindings.length > 0) {
      summary += " There are some values that are borderline and may require monitoring."
    } else {
      summary += " The values we could identify appear to be within normal ranges."
    }
    
    // Generate recommendations
    const recommendations = [
      "Please consult with a healthcare professional for a complete interpretation of your lab results",
      "Regular check-ups are recommended for monitoring your health"
    ]
    
    if (abnormalFindings.length > 0) {
      recommendations.push(
        `Consider discussing the abnormal ${abnormalFindings.map(f => f.name).join(', ')} values with your doctor`
      )
    }
    
    if (extractedFindings.length === 0) {
      extractedFindings.push({
        name: "Text Analysis",
        value: "Report processed",
        status: 'normal'
      })
    }
    
    console.log("Edge function: Fallback analysis complete")
    console.log(`Edge function: Generated ${extractedFindings.length} findings`)
    
    return new Response(JSON.stringify({
      summary,
      keyFindings: extractedFindings,
      recommendations
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
    
  } catch (error) {
    console.error("Edge function: Error in fallback model:", error)
    
    // Return a very basic response if everything fails
    return new Response(JSON.stringify({
      summary: "We could not automatically analyze this report. Please consult with your healthcare provider for interpretation.",
      keyFindings: [{ name: "Analysis Status", value: "Could not process", status: 'warning' }],
      recommendations: [
        "Please share this report with your healthcare provider for proper interpretation",
        "Regular health check-ups are recommended"
      ]
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
}

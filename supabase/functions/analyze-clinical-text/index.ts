
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
    
    // Create a medical-specific prompt for the ClinicalBERT model
    const promptText = `
    Analyze this medical report and extract key health information:
    
    ${text}
    
    Format your response as follows:
    SUMMARY: [Brief overview of patient health based on the report]
    KEY FINDINGS: [List key metrics with their values and status (normal/abnormal/warning)]
    RECOMMENDATIONS: [Provide 2-3 simple recommendations based on the findings]
    `

    console.log("Edge function: Sending request to Hugging Face API")
    console.log("Edge function: Using model: medicalai/ClinicalBERT")
    
    const startTime = Date.now()
    
    // Make a request to the Hugging Face API with ClinicalBERT model
    const response = await fetch("https://api-inference.huggingface.co/models/medicalai/ClinicalBERT", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("HUGGING_FACE_ACCESS_TOKEN")}`
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
    })
    
    const endTime = Date.now()
    console.log(`Edge function: Hugging Face API response received in ${endTime - startTime}ms`)
    console.log(`Edge function: Response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Edge function: Hugging Face API error: ${errorText}`)
      throw new Error(`Hugging Face API returned status ${response.status}`)
    }
    
    const result = await response.json()
    console.log("Edge function: Successfully parsed JSON response from Hugging Face")
    
    const generatedText = result && result[0] && result[0].generated_text 
      ? result[0].generated_text 
      : ""
    
    console.log(`Edge function: Generated text length: ${generatedText.length} characters`)
    if (generatedText.length > 0) {
      console.log(`Edge function: Generated text sample: "${generatedText.substring(0, 100)}..."`)
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
    const findingsRegex = /([^:]+):\s*([^-]+)-\s*(\w+)/g
    let match
    const keyFindings = []
    
    while ((match = findingsRegex.exec(keyFindingsText)) !== null) {
      const name = match[1].trim()
      const value = match[2].trim()
      const statusText = match[3].toLowerCase().trim()
      
      // Map the status text to our defined statuses
      let status = 'normal'
      if (statusText.includes('abnormal') || statusText.includes('high') || 
          statusText.includes('low') || statusText.includes('critical')) {
        status = 'abnormal'
      } else if (statusText.includes('warning') || statusText.includes('borderline') || 
                statusText.includes('elevated') || statusText.includes('moderate')) {
        status = 'warning'
      }
      
      keyFindings.push({ name, value, status })
    }
    
    // If we couldn't extract structured findings, add a generic one
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
      .split(/\d+\.|\n-|\n\*/)
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

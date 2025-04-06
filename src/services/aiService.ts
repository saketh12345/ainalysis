
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AnalysisResult {
  summary: string;
  keyFindings: Array<{ name: string; value: string; status: 'normal' | 'abnormal' | 'warning' }>;
  recommendations: string[];
}

export async function analyzeReport(text: string): Promise<AnalysisResult> {
  try {
    // Create a structured system prompt that forces JSON response
    const systemPrompt = `
      You are a medical assistant analyzing test reports. Extract key values, identify abnormal results, and provide a clear summary.
      The response MUST be valid JSON with this exact structure:
      {
        "summary": "A concise summary of the overall health status based on the report",
        "keyFindings": [
          {
            "name": "Test name",
            "value": "Test value with units",
            "status": "normal/abnormal/warning"
          }
        ],
        "recommendations": [
          "List of simple recommendations based on the results"
        ]
      }
      IMPORTANT: The "status" field must ONLY be one of these three values: "normal", "abnormal", or "warning".
    `;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this medical report and respond ONLY with valid JSON: ${text}` }
    ];

    console.log("Sending request to OpenRouter API");
    
    // If the AI response fails, we'll provide a fallback analysis
    const fallbackAnalysis: AnalysisResult = {
      summary: "We were unable to analyze this report automatically. Please consult with your healthcare provider for interpretation.",
      keyFindings: [
        { 
          name: "Hemoglobin", 
          value: "Not available", 
          status: "normal" 
        }
      ],
      recommendations: [
        "Please share this report with your healthcare provider for proper interpretation",
        "Schedule a follow-up appointment to discuss these results"
      ]
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MediView AI Summarizer'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-opus',
        messages,
        temperature: 0.1,
        max_tokens: 500, // Reduced from 1500 to stay within credit limits
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      console.error(`AI analysis failed with status: ${response.status}`);
      const errorData = await response.json();
      console.error("API error details:", errorData);
      return fallbackAnalysis;
    }

    const data = await response.json();
    console.log("AI Response received:", data);
    
    // Check if we have a proper response structure
    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("Unexpected API response structure:", data);
      return fallbackAnalysis;
    }
    
    try {
      // Try to parse the response as JSON
      const content = data.choices[0].message.content;
      console.log("Content from AI:", content);
      
      // Try different approaches to extract JSON
      let parsedResult;
      
      try {
        // First try direct JSON parse
        parsedResult = JSON.parse(content);
      } catch (directParseError) {
        console.log("Direct parse failed, trying to extract JSON from text");
        
        // Try to extract JSON using regex
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[0]);
          } catch (regexParseError) {
            console.error("Regex extraction failed:", regexParseError);
            throw new Error("Could not extract valid JSON from AI response");
          }
        } else {
          throw new Error("No JSON object found in AI response");
        }
      }
      
      // Validate the parsed result has the expected structure
      if (!parsedResult || typeof parsedResult !== 'object') {
        throw new Error("AI response is not a valid object");
      }
      
      // Properly validate and process the keyFindings
      let validKeyFindings = [];
      
      if (Array.isArray(parsedResult.keyFindings)) {
        validKeyFindings = parsedResult.keyFindings.map(finding => {
          // Ensure status is one of the valid values
          let validStatus: 'normal' | 'abnormal' | 'warning' = 'normal';
          
          if (finding.status === 'normal' || finding.status === 'abnormal' || finding.status === 'warning') {
            validStatus = finding.status as 'normal' | 'abnormal' | 'warning';
          } else {
            console.warn(`Invalid status value "${finding.status}" detected, defaulting to "normal"`);
          }
          
          return {
            name: finding.name || "Unknown test",
            value: finding.value || "No value",
            status: validStatus
          };
        });
      }
      
      // Ensure all required fields exist and have proper types
      const result: AnalysisResult = {
        summary: parsedResult.summary || "No summary available",
        keyFindings: validKeyFindings,
        recommendations: Array.isArray(parsedResult.recommendations) ? parsedResult.recommendations : []
      };
      
      return result;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Use fallback if parsing fails
      return fallbackAnalysis;
    }
  } catch (error) {
    console.error('Error analyzing report:', error);
    throw error;
  }
}


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
    const systemPrompt = `
      You are a helpful medical assistant that analyzes medical test reports. 
      Extract key medical test values, identify abnormal results, and provide a clear summary.
      Format your response as a JSON object with the following structure:
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
      Only respond with valid JSON. Focus on extracting actual medical values from the text.
    `;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Please analyze this medical report: ${text}` }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MediView AI Summarizer'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-405b',
        messages,
        temperature: 0.2,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    
    try {
      // The AI response should be JSON, but let's handle potential parsing issues
      const content = data.choices[0].message.content;
      let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                     content.match(/{[\s\S]*}/);
                     
      const jsonString = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : content;
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse the AI analysis result');
    }
  } catch (error) {
    console.error('Error analyzing report:', error);
    throw error;
  }
}

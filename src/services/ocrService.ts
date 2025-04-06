
export interface OCRResult {
  ParsedResults: Array<{
    ParsedText: string;
    ErrorMessage: string;
    FileParseExitCode: number;
  }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage: string;
}

export async function performOCR(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('apikey', 'K82772512288957');
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status}`);
    }

    const data: OCRResult = await response.json();
    
    if (data.IsErroredOnProcessing || data.OCRExitCode !== 1) {
      throw new Error(data.ErrorMessage || 'OCR processing failed');
    }

    return data.ParsedResults[0]?.ParsedText || '';
  } catch (error) {
    console.error('Error performing OCR:', error);
    throw error;
  }
}

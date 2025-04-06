
export interface OCRResult {
  ParsedResults: Array<{
    ParsedText: string;
    ErrorMessage: string;
    FileParseExitCode: number;
  }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage: string | string[];
}

export async function performOCR(file: File): Promise<string> {
  try {
    // Check file size before sending to API
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB limit for OCR.space free API
    
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds the maximum permissible file size limit of 1024 KB`);
    }
    
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
      const errorMessage = Array.isArray(data.ErrorMessage) 
        ? data.ErrorMessage.join(', ') 
        : data.ErrorMessage || 'OCR processing failed';
      throw new Error(errorMessage);
    }

    return data.ParsedResults[0]?.ParsedText || '';
  } catch (error) {
    console.error('Error performing OCR:', error);
    throw error;
  }
}

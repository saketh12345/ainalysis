
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import FileUploader from "@/components/FileUploader";
import AnalysisResult from "@/components/AnalysisResult";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { performOCR } from "@/services/ocrService";
import { analyzeReport } from "@/services/aiService";

interface AnalysisData {
  summary: string;
  keyFindings: Array<{ name: string; value: string; status: 'normal' | 'abnormal' | 'warning' }>;
  recommendations: string[];
}

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setAnalysisData(null);
      
      // First perform OCR to extract text from the image/PDF
      toast.info("Extracting text from your report...");
      const extractedText = await performOCR(file);
      
      if (!extractedText) {
        throw new Error("Could not extract text from the uploaded file");
      }
      
      // Then analyze the extracted text
      toast.info("Analyzing medical data...");
      const analysisResult = await analyzeReport(extractedText);
      
      setAnalysisData(analysisResult);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error processing your medical report. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-medical-dark mb-2">Medical Report Analyzer</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Upload your medical test report and our AI will analyze it to provide you with a 
              clear summary, highlight key findings, and offer personalized recommendations.
            </p>
          </div>

          <div className="mb-10">
            <FileUploader onFileSelected={handleFileUpload} isProcessing={isProcessing} />
          </div>

          {analysisData ? (
            <AnalysisResult
              summary={analysisData.summary}
              keyFindings={analysisData.keyFindings}
              recommendations={analysisData.recommendations}
            />
          ) : !isProcessing && (
            <Card className="bg-gray-50 border border-dashed">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-medium mb-2 text-gray-700">No Report Analysis Yet</h3>
                <p className="text-gray-500">
                  Upload your medical report above to get an AI-generated analysis.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;

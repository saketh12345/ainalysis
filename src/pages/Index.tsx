
import { useState } from "react";
import { toast } from "sonner";
import FileUploader from "@/components/FileUploader";
import AnalysisResult from "@/components/AnalysisResult";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { performOCR } from "@/services/ocrService";
import { analyzeReport } from "@/services/aiService";
import { Button } from "@/components/ui/button";

interface AnalysisData {
  summary: string;
  keyFindings: Array<{ name: string; value: string; status: 'normal' | 'abnormal' | 'warning' }>;
  recommendations: string[];
}

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setAnalysisData(null);
      setError(null);
      
      // First perform OCR to extract text from the image/PDF
      toast.info("Extracting text from your report...");
      const extractedText = await performOCR(file);
      
      if (!extractedText) {
        throw new Error("Could not extract text from the uploaded file");
      }
      
      // Analyze the extracted text with ClinicalBERT
      toast.info("Analyzing medical data with ClinicalBERT...");
      const analysisResult = await analyzeReport(extractedText);
      
      setAnalysisData(analysisResult);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Error processing file:", error);
      setError(error instanceof Error ? error.message : "Error processing your medical report");
      toast.error("Error processing your medical report. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-white py-12 border-b">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl font-bold text-medivault-text mb-4">Medical Document Analysis</h1>
              <p className="text-gray-600">
                Upload your medical documents for AI-powered analysis. Get a clear summary of key findings, diagnoses, and 
                recommendations in plain language.
              </p>
            </div>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="container py-10">
          <div className="max-w-4xl mx-auto">
            {/* Error display if analysis failed */}
            {error && (
              <AnalysisResult 
                summary=""
                keyFindings={[]}
                recommendations={[]}
                error={error}
              />
            )}

            {/* Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
              <FileUploader onFileSelected={handleFileUpload} isProcessing={isProcessing} />
            </div>

            {/* Analysis Results */}
            {analysisData && !error && (
              <AnalysisResult
                summary={analysisData.summary}
                keyFindings={analysisData.keyFindings}
                recommendations={analysisData.recommendations}
              />
            )}

            {/* Empty State */}
            {!analysisData && !isProcessing && !error && (
              <div className="bg-gray-50 border border-dashed rounded-lg p-8 text-center">
                <h3 className="text-xl font-medium mb-2 text-gray-700">No Report Analysis Yet</h3>
                <p className="text-gray-500 mb-4">
                  Upload your medical report above to get an AI-generated analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;

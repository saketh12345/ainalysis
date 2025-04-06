
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import FileUploader from "@/components/FileUploader";
import AnalysisResult from "@/components/AnalysisResult";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { performOCR } from "@/services/ocrService";
import { analyzeReport } from "@/services/aiService";
import { analyzeWithTransformers } from "@/services/transformersService";

interface AnalysisData {
  summary: string;
  keyFindings: Array<{ name: string; value: string; status: 'normal' | 'abnormal' | 'warning' }>;
  recommendations: string[];
}

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"cloud" | "server">("cloud");

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
      
      // Then analyze the extracted text based on selected mode
      toast.info("Analyzing medical data...");
      
      let analysisResult;
      
      if (analysisMode === "server") {
        analysisResult = await analyzeWithTransformers(extractedText);
      } else {
        // Use the cloud API for analysis
        analysisResult = await analyzeReport(extractedText);
      }
      
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

          <div className="mb-6">
            <Tabs defaultValue="cloud" onValueChange={(value) => setAnalysisMode(value as "cloud" | "server")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="cloud">Cloud AI</TabsTrigger>
                <TabsTrigger value="server">Server AI</TabsTrigger>
              </TabsList>
              <TabsContent value="cloud">
                <Card className="border-t-0 rounded-t-none">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-600">
                      This mode uses a powerful cloud-based AI to analyze your medical reports with high accuracy.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="server">
                <Card className="border-t-0 rounded-t-none">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-600">
                      This mode uses our server-side AI which provides better privacy and security for your medical data.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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

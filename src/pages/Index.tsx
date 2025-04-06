
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import FileUploader from "@/components/FileUploader";
import AnalysisResult from "@/components/AnalysisResult";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { performOCR } from "@/services/ocrService";
import { analyzeReport } from "@/services/aiService";
import { initBiomedicalAnalyzer, analyzeWithTransformers } from "@/services/transformersService";

interface AnalysisData {
  summary: string;
  keyFindings: Array<{ name: string; value: string; status: 'normal' | 'abnormal' | 'warning' }>;
  recommendations: string[];
}

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"cloud" | "local">("cloud");
  const [transformersReady, setTransformersReady] = useState(false);
  const [isLoadingTransformers, setIsLoadingTransformers] = useState(false);

  // Initialize the transformers model on component mount
  useEffect(() => {
    const loadTransformersModel = async () => {
      if (!transformersReady && !isLoadingTransformers) {
        setIsLoadingTransformers(true);
        try {
          const success = await initBiomedicalAnalyzer();
          setTransformersReady(success);
          if (success) {
            toast.success("Transformers model loaded successfully!");
          } else {
            toast.error("Failed to load transformers model");
          }
        } catch (error) {
          console.error("Error loading transformers:", error);
          toast.error("Error initializing transformers");
        } finally {
          setIsLoadingTransformers(false);
        }
      }
    };

    loadTransformersModel();
  }, []);

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
      
      if (analysisMode === "local" && transformersReady) {
        analysisResult = await analyzeWithTransformers(extractedText);
      } else {
        // Fall back to cloud API if transformers not ready or cloud mode selected
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
            <Tabs defaultValue="cloud" onValueChange={(value) => setAnalysisMode(value as "cloud" | "local")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="cloud">Cloud AI</TabsTrigger>
                <TabsTrigger 
                  value="local" 
                  disabled={!transformersReady && !isLoadingTransformers}
                  className="relative"
                >
                  Browser AI
                  {isLoadingTransformers && (
                    <span className="absolute top-1 right-1 h-2 w-2">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                  )}
                </TabsTrigger>
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
              <TabsContent value="local">
                <Card className="border-t-0 rounded-t-none">
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-600">
                      This mode uses transformers running directly in your browser. Your data stays on your device for better privacy.
                      {!transformersReady && isLoadingTransformers && " Loading models..."}
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

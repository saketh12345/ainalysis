
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface KeyFinding {
  name: string;
  value: string;
  status: 'normal' | 'abnormal' | 'warning';
}

interface AnalysisResultProps {
  summary: string;
  keyFindings: KeyFinding[];
  recommendations: string[];
  error?: string;
}

export default function AnalysisResult({
  summary,
  keyFindings = [],
  recommendations = [],
  error
}: AnalysisResultProps) {
  if (error) {
    return (
      <Alert variant="destructive" className="border-medivault-error bg-red-50 mb-8">
        <AlertCircle className="h-5 w-5 text-medivault-error" />
        <div className="ml-2">
          <AlertTitle className="text-medivault-error font-medium">Analysis failed</AlertTitle>
          <AlertDescription className="text-red-700">
            Failed to analyze document
            <ul className="mt-2 list-disc pl-5 text-sm">
              <li>This could be due to:</li>
              <li>Poor image quality or resolution</li>
              <li>Unsupported document format</li>
              <li>Document contains handwritten text that cannot be recognized</li>
              <li>Document is password-protected or encrypted</li>
            </ul>
            <p className="mt-2 text-sm">Try uploading a clearer image or a different document format.</p>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-xl font-semibold mb-3 text-medivault-text">Analysis Summary</h3>
        <p className="text-gray-700">{summary}</p>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-xl font-semibold mb-4 text-medivault-text">Key Findings</h3>
        <div className="space-y-4">
          {keyFindings.map((finding, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <h4 className="font-medium">{finding.name}</h4>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    finding.status === "normal" && "bg-green-100 text-green-800",
                    finding.status === "abnormal" && "bg-red-100 text-red-800",
                    finding.status === "warning" && "bg-amber-100 text-amber-800"
                  )}
                >
                  {finding.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-full">
                  <Progress
                    value={
                      finding.status === "normal" ? 50 :
                      finding.status === "abnormal" ? 80 : 65
                    }
                    className={cn(
                      finding.status === "normal" && "bg-green-100 [&>div]:bg-green-500",
                      finding.status === "abnormal" && "bg-red-100 [&>div]:bg-red-500",
                      finding.status === "warning" && "bg-amber-100 [&>div]:bg-amber-500"
                    )}
                  />
                </div>
                <span className="font-medium">{finding.value}</span>
              </div>
              {index < keyFindings.length - 1 && <Separator className="my-2" />}
            </div>
          ))}

          {keyFindings.length === 0 && (
            <p className="text-gray-500 italic">No key findings detected</p>
          )}
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-xl font-semibold mb-4 text-medivault-text">Recommendations</h3>
        <ul className="space-y-2 list-disc list-inside text-gray-700">
          {recommendations.map((recommendation, index) => (
            <li key={index}>{recommendation}</li>
          ))}
          {recommendations.length === 0 && (
            <p className="text-gray-500 italic">No recommendations provided</p>
          )}
        </ul>
      </section>
    </div>
  );
}

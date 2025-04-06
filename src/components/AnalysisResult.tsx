
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
}

export default function AnalysisResult({
  summary,
  keyFindings = [],
  recommendations = []
}: AnalysisResultProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-xl text-medical-dark">Analysis Summary</CardTitle>
          <CardDescription>AI-generated summary of your medical report</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{summary}</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-xl text-medical-dark">Key Findings</CardTitle>
          <CardDescription>Important values from your report</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-medical-dark">Recommendations</CardTitle>
          <CardDescription>Suggested next steps</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 list-disc list-inside text-gray-700">
            {recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
            {recommendations.length === 0 && (
              <p className="text-gray-500 italic">No recommendations provided</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

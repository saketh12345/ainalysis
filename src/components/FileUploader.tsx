
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
}

export default function FileUploader({ onFileSelected, isProcessing }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    onFileSelected(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <>
      <h2 className="font-semibold text-xl mb-4">Upload Document</h2>
      <div 
        className={cn(
          "border border-dashed border-blue-300 rounded-md bg-medivault-secondary p-10 flex flex-col items-center justify-center text-center",
          dragActive ? "bg-blue-50 border-medivault-primary" : "",
          isProcessing ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
        )}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-medivault-primary" />
            <p className="font-medium text-lg text-gray-700">Processing your medical report...</p>
            <p className="text-sm text-gray-500">This may take a few moments</p>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 mb-4 text-medivault-primary" />
            <p className="font-medium text-lg text-gray-700 mb-2">
              {selectedFile ? selectedFile.name : "Drop your file here or click to browse"}
            </p>
            <p className="text-sm text-gray-500 mb-4">Supported formats: PDF, JPG, PNG</p>
          </>
        )}
      </div>
      {!isProcessing && !selectedFile && (
        <div className="mt-4 text-center">
          <Button 
            className="bg-medivault-primary hover:bg-blue-600 text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            Analyze Document
          </Button>
        </div>
      )}
    </>
  );
}

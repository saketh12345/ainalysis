
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Upload } from "lucide-react";
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
    <Card 
      className={cn(
        "w-full p-8 border-dashed border-2 flex flex-col items-center justify-center text-center",
        dragActive ? "border-medical-primary bg-medical-light" : "border-gray-300",
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
          <Loader2 className="h-12 w-12 animate-spin text-medical-primary" />
          <p className="font-medium text-lg text-gray-700">Processing your medical report...</p>
          <p className="text-sm text-gray-500">This may take a few moments</p>
        </div>
      ) : (
        <>
          <Upload className="h-12 w-12 mb-4 text-medical-primary" />
          <h3 className="font-medium text-lg text-gray-700">
            {selectedFile ? selectedFile.name : "Upload your medical report"}
          </h3>
          <p className="mt-2 text-sm text-gray-500 mb-4">
            Drag and drop your file or click to browse
            <br />
            Supports images and PDF formats
          </p>
          <Button variant="outline" className="border-medical-primary text-medical-primary hover:bg-medical-light">
            Select File
          </Button>
        </>
      )}
    </Card>
  );
}

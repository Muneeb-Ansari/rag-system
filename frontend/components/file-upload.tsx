'use client';

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadFile } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Upload, File, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onUploadSuccess?: (filename: string) => void;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, setProgress),
    onSuccess: (data) => {
      if (data.filename && onUploadSuccess) {
        onUploadSuccess(data.filename);
      }
      setTimeout(() => {
        setSelectedFile(null);
        setProgress(0);
      }, 2000);
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      uploadMutation.mutate(file);
    }
  }, [uploadMutation]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      uploadMutation.mutate(file);
    }
  }, [uploadMutation]);

  const clearFile = () => {
    setSelectedFile(null);
    setProgress(0);
    uploadMutation.reset();
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          uploadMutation.isPending && 'pointer-events-none opacity-70'
        )}
      >
        <input
          type="file"
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
          accept=".pdf,.txt,.doc,.docx,.md"
          disabled={uploadMutation.isPending}
        />
        
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
            isDragging ? 'bg-primary/10' : 'bg-muted'
          )}>
            <Upload className={cn(
              'h-6 w-6 transition-colors',
              isDragging ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop your document here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports PDF, TXT, DOC, DOCX, MD
            </p>
          </div>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <File className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          
          {uploadMutation.isPending && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          )}
          
          {uploadMutation.isSuccess && (
            <CheckCircle className="h-5 w-5 text-accent" />
          )}
          
          {uploadMutation.isError && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <Button variant="ghost" size="icon" onClick={clearFile} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {uploadMutation.isError && (
        <p className="text-sm text-destructive">
          {uploadMutation.error.message}
        </p>
      )}
    </div>
  );
}

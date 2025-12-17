'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload,
  File,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.md', '.docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadState {
  status: UploadStatus;
  progress: number;
  error?: string;
  documentId?: string;
}

interface FileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (documentId: string) => void;
}

export function FileUploadModal({
  open,
  onOpenChange,
  onUploadComplete,
}: FileUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setUploadState({ status: 'idle', progress: 0 });
  }, []);

  const handleClose = useCallback(() => {
    if (uploadState.status !== 'uploading' && uploadState.status !== 'processing') {
      resetState();
      onOpenChange(false);
    }
  }, [uploadState.status, resetState, onOpenChange]);

  const validateFile = useCallback((file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return `Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      setUploadState({ status: 'error', progress: 0, error });
      return;
    }
    setFile(selectedFile);
    setUploadState({ status: 'idle', progress: 0 });
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setUploadState({ status: 'uploading', progress: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      setUploadState({ status: 'processing', progress: 50 });

      const result = await response.json();

      setUploadState({
        status: 'success',
        progress: 100,
        documentId: result.documentId,
      });

      onUploadComplete?.(result.documentId);
    } catch (error) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }, [file, onUploadComplete]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="h-8 w-8 text-red-500" />;
    if (ext === 'docx') return <FileText className="h-8 w-8 text-blue-500" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'processing';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload to Knowledge Base</DialogTitle>
          <DialogDescription>
            Add documents to your knowledge base for RAG-powered search and retrieval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          {!file && uploadState.status !== 'success' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                uploadState.status === 'error' && 'border-destructive/50'
              )}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop your file here or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, TXT, MD, DOCX up to 10MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* Error Message */}
          {uploadState.status === 'error' && !file && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {uploadState.error}
            </div>
          )}

          {/* Selected File */}
          {file && uploadState.status !== 'success' && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              {getFileIcon(file.name)}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setUploadState({ status: 'idle', progress: 0 });
                  }}
                  className="h-8 w-8 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadState.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                </span>
                <span className="text-muted-foreground">{uploadState.progress}%</span>
              </div>
              <Progress value={uploadState.progress} />
            </div>
          )}

          {/* Upload Error */}
          {uploadState.status === 'error' && file && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {uploadState.error}
            </div>
          )}

          {/* Success State */}
          {uploadState.status === 'success' && (
            <div className="flex flex-col items-center gap-3 rounded-lg bg-green-500/10 p-6">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <p className="font-medium text-green-700 dark:text-green-400">
                  Document uploaded successfully!
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your document is being processed and will be searchable shortly.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {uploadState.status === 'success' ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadState.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FileUploadModal;

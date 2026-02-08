import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, File, X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentUploadProps {
  userId: string;
  tokenId?: string;
  documentType: 'aadhaar' | 'disability_cert' | 'medical_report' | 'other';
  label: string;
  description: string;
  required?: boolean;
  onUploadComplete?: (fileUrl: string) => void;
}

export default function DocumentUpload({
  userId,
  tokenId,
  documentType,
  label,
  description,
  required = false,
  onUploadComplete
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or PDF file',
        variant: 'destructive'
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Create unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${documentType}_${timestamp}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Save document record
      const { error: dbError } = await supabase
        .from('uploaded_documents')
        .insert({
          citizen_id: userId,
          token_id: tokenId,
          document_type: documentType,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          verification_status: 'PENDING'
        });

      if (dbError) throw dbError;

      setUploadedUrl(publicUrl);
      toast({
        title: 'Upload successful',
        description: 'Document uploaded and pending verification'
      });

      onUploadComplete?.(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setUploadedUrl(null);
  };

  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <File className="h-5 w-5 text-blue-600" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedUrl ? (
          <>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="flex-1"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>

            {file && !uploading && (
              <Alert className="bg-blue-50 border-blue-200">
                <File className="h-4 w-4 text-blue-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Alert className="bg-slate-50">
              <AlertTriangle className="h-4 w-4 text-slate-600" />
              <AlertDescription className="text-xs text-slate-600">
                • Accepted formats: JPG, PNG, PDF<br />
                • Maximum size: 5MB<br />
                • Document will be verified by admin
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-green-900">
                  Document uploaded successfully
                </span>
                <span className="text-xs text-green-700">
                  Pending verification by admin
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

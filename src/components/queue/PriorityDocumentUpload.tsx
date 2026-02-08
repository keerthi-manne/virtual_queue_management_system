/**
 * Priority Document Upload Component
 * Handles Aadhaar, Disability Certificate, and Emergency document uploads
 */
import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PriorityDocumentUploadProps {
  userId: string;
  serviceId: string;
  claimType: 'SENIOR' | 'DISABLED' | 'EMERGENCY';
  onUploadComplete: () => void;
  onCancel: () => void;
}

export default function PriorityDocumentUpload({
  userId,
  serviceId,
  claimType,
  onUploadComplete,
  onCancel
}: PriorityDocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    success?: boolean;
    message?: string;
    autoVerified?: boolean;
  }>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus({});
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus({ success: false, message: 'Please select a file' });
      return;
    }

    if (claimType === 'EMERGENCY' && !reason.trim()) {
      setUploadStatus({ success: false, message: 'Please provide a reason for emergency claim' });
      return;
    }

    setIsUploading(true);
    setUploadStatus({});

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('userId', userId);
      formData.append('serviceId', serviceId); // Include the service they want
      formData.append('claimType', claimType);
      if (claimType === 'EMERGENCY') {
        formData.append('reason', reason);
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const endpoint = claimType === 'EMERGENCY' ? 'claim/emergency' : 'claim/upload';
      
      const response = await fetch(`${apiUrl}/${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadStatus({
        success: true,
        message: 'Document uploaded successfully! Admin will review your claim.',
        autoVerified: result.claim?.auto_verified
      });

      // Wait 2 seconds then notify parent
      setTimeout(() => {
        onUploadComplete();
      }, 2000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus({
        success: false,
        message: error.message || 'Failed to upload document'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getDocumentTitle = () => {
    switch (claimType) {
      case 'SENIOR':
        return 'Upload Aadhaar Card';
      case 'DISABLED':
        return 'Upload Disability Certificate';
      case 'EMERGENCY':
        return 'Upload Emergency Document';
    }
  };

  const getDocumentDescription = () => {
    switch (claimType) {
      case 'SENIOR':
        return 'Upload a clear photo of your Aadhaar card. We will verify your age (must be 60+) for senior citizen priority.';
      case 'DISABLED':
        return 'Upload your government-issued disability certificate. We will verify the document for disabled person priority.';
      case 'EMERGENCY':
        return 'Upload medical reports or emergency documents. Admin will review your emergency claim.';
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-600" />
          {getDocumentTitle()}
        </CardTitle>
        <CardDescription>{getDocumentDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadStatus.success === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadStatus.message}</AlertDescription>
          </Alert>
        )}

        {uploadStatus.success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {uploadStatus.message}
              {uploadStatus.autoVerified && (
                <div className="mt-2 text-sm">
                  ✓ Document auto-verified by OCR. Awaiting admin approval.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!uploadStatus.success && (
          <>
            <div className="space-y-2">
              <Label htmlFor="document">Document (Image or PDF, max 5MB)</Label>
              <Input
                id="document"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {file && (
                <p className="text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {claimType === 'EMERGENCY' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Emergency Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Describe your emergency (e.g., severe chest pain, high fever, accident injury)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={isUploading || !file}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Submit
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={isUploading}>
                Cancel
              </Button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>• Document will be reviewed by admin</p>
              <p>• You'll be notified once approved/rejected</p>
              <p>• After approval, you can claim this priority</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

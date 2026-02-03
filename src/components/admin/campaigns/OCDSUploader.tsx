// ============================================================================
// BuildBid: OCDS File Uploader Component
// Handles multiple OCDS JSON file uploads and extracts opportunities
// ============================================================================

'use client';

import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { extractOpportunities, validateOCDSStructure } from '@/lib/campaigns/ocds-extraction';
import type { OCDSOpportunity } from '@/lib/types/ocds';
import { OCDSProcessingQueue } from './OCDSProcessingQueue';

interface OCDSUploaderProps {
  campaignId: string;
  onClose?: () => void;
}

export function OCDSUploader({ campaignId, onClose }: OCDSUploaderProps) {
  const [opportunities, setOpportunities] = useState<OCDSOpportunity[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (!uploadedFiles.length) return;

    setUploading(true);
    const allOpportunities: OCDSOpportunity[] = [];

    try {
      // Process each file
      for (const file of uploadedFiles) {
        // Validate file type
        if (!file.name.endsWith('.json')) {
          toast({
            title: 'Invalid File Type',
            description: `${file.name} is not a JSON file. Please upload .json files only.`,
            variant: 'destructive',
          });
          continue;
        }

        try {
          const fileContent = await readFileAsText(file);
          const jsonData = JSON.parse(fileContent);

          // Validate OCDS structure
          validateOCDSStructure(jsonData);

          // Extract opportunities
          const extracted = extractOpportunities(jsonData);

          // Add status fields to each opportunity
          const withStatus = extracted.map((opp) => ({
            ...opp,
            status: 'pending' as const,
            selected: false,
            error: null,
          }));

          allOpportunities.push(...withStatus);
        } catch (error: any) {
          toast({
            title: 'Failed to Process File',
            description: `${file.name}: ${error.message || 'Invalid OCDS format'}`,
            variant: 'destructive',
          });
        }
      }

      if (allOpportunities.length > 0) {
        // Add to existing queue
        setOpportunities((prev) => [...prev, ...allOpportunities]);
        setShowQueue(true);

        toast({
          title: 'Files Processed',
          description: `Added ${allOpportunities.length} opportunity/opportunities to queue from ${uploadedFiles.length} file(s)`,
        });
      } else {
        toast({
          title: 'No Opportunities Found',
          description: 'The uploaded files did not contain any valid supplier/award data.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to process uploaded files',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleClearQueue = () => {
    setOpportunities([]);
    setShowQueue(false);
  };

  if (showQueue && opportunities.length > 0) {
    return (
      <OCDSProcessingQueue
        opportunities={opportunities}
        setOpportunities={setOpportunities}
        campaignId={campaignId}
        onClose={onClose}
        onClear={handleClearQueue}
      />
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Upload OCDS Files</h3>
            <p className="text-sm text-muted-foreground">
              Select one or more OCDS JSON files to extract supplier/award data and create campaign opportunities.
            </p>
          </div>

          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="ocds-upload"
              disabled={uploading}
            />
            <label
              htmlFor="ocds-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {uploading ? 'Processing files...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select multiple .json files (OCDS Release Package or Record Package format)
                </p>
              </div>
            </label>
          </div>

          {onClose && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose} disabled={uploading}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}



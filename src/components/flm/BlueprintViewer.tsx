'use client';

import BlueprintGenerator from './BlueprintGenerator';

interface BlueprintViewerProps {
  vcModelId: string;
  flmModelId: string;
  blueprint?: string;
  blueprintPath?: string;
  onGenerate?: () => Promise<void>;
  onDownload?: () => Promise<void>;
  loading?: boolean;
}

export default function BlueprintViewer(props: BlueprintViewerProps) {
  return <BlueprintGenerator {...props} />;
}

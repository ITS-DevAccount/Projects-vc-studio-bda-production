import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import ComponentNotFound from '@/components/common/ComponentNotFound';
import type { RegistryEntry } from '@/lib/types/registry';

type RegistryComponent = ComponentType<any> | LazyExoticComponent<ComponentType<any>>;

// Base component map (fallback for essential workspace components).
const BASE_COMPONENTS: Record<string, RegistryComponent> = {
  file_explorer: lazy(() => import('@/components/workspace/FileExplorer')),
  file_uploader: lazy(() => import('@/components/workspace/FileUploader')),
  folder_creator: lazy(() => import('@/components/workspace/FolderCreator')),
  workflow_tasks: lazy(() => import('@/components/workspace/WorkflowTasksWidget')),
  vc_pyramid: lazy(() => import('@/components/workspace/VCModelPyramid')),
  vc_models: lazy(() => import('@/components/vc-models/VCModelsList')),
  // Legacy component code aliases.
  file_view: lazy(() => import('@/components/workspace/FileExplorer')),
  profile_view: lazy(() => import('@/components/workspace/FileExplorer'))
};

// Widget component name mappings (registry-driven).
const WIDGET_COMPONENTS: Record<string, RegistryComponent> = {
  FileExplorer: lazy(() => import('@/components/workspace/FileExplorer')),
  FileUploader: lazy(() => import('@/components/workspace/FileUploader')),
  FolderCreator: lazy(() => import('@/components/workspace/FolderCreator')),
  WorkflowTasksWidget: lazy(() => import('@/components/workspace/WorkflowTasksWidget')),
  VCModelPyramid: lazy(() => import('@/components/workspace/VCModelPyramid'))
};

// Component suite mappings (optional registry hint).
const COMPONENT_SUITES: Record<string, RegistryComponent> = {};

/**
 * Dynamically resolve component based on registry data.
 */
export function resolveComponent(
  componentCode: string,
  componentSuite?: string | null,
  widgetComponentName?: string | null
): RegistryComponent {
  if (BASE_COMPONENTS[componentCode]) {
    return BASE_COMPONENTS[componentCode];
  }

  if (componentSuite && COMPONENT_SUITES[componentSuite]) {
    return COMPONENT_SUITES[componentSuite];
  }

  if (widgetComponentName && WIDGET_COMPONENTS[widgetComponentName]) {
    return WIDGET_COMPONENTS[widgetComponentName];
  }

  const NotFound = (props: { componentCode?: string }) => (
    <ComponentNotFound componentCode={componentCode} {...props} />
  );

  return NotFound;
}

/**
 * Fetch component metadata from registry.
 */
export async function getComponentMetadata(
  componentCode: string
): Promise<RegistryEntry | null> {
  const response = await fetch(`/api/components/${componentCode}`);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.component ?? null;
}

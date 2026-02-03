'use client';

export default function ComponentNotFound({ componentCode }: { componentCode?: string }) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Component Not Found</h2>
      <p className="text-gray-600">
        Component "{componentCode || 'unknown'}" could not be loaded.
      </p>
      <p className="text-sm text-gray-500 mt-4">
        Please check the component registry or contact support.
      </p>
    </div>
  );
}

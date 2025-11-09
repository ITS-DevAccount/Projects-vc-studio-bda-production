'use client';

// VC Model Pyramid Component (Placeholder)
// Phase 1c: Component Registry & File System
// TODO: Implement in Phase 1c/1d when VC Model structure is finalized

export default function VCModelPyramid() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">VC Model</h2>

      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔺</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Value Chain Model Pyramid</h3>
        <p className="text-gray-500 mb-4">
          Interactive visualization of your VC Model (FLM/AGM layers)
        </p>
        <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
          Coming Soon: Phase 1c VC Model Components
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">FLM Layer</h4>
          <p className="text-sm text-blue-700">
            Financial, Legal, Market foundations
          </p>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">AGM Layer</h4>
          <p className="text-sm text-green-700">
            Operations, Governance, Capabilities
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Planned Features:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Interactive pyramid visualization</li>
          <li>• Layer-by-layer navigation</li>
          <li>• Editable model components</li>
          <li>• Transition tracking (FLM → AGM → Full)</li>
          <li>• Full-screen mode with zoom</li>
        </ul>
      </div>
    </div>
  );
}

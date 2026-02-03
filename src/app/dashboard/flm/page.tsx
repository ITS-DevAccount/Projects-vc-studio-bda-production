export default function FLMComponentsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">FLM Components</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Framework Level Mapping Tools</h2>
        <p className="text-gray-700 mb-4">
          Create and manage your Framework Level Mappings (FLM) within VC Models.
        </p>
        <p className="text-gray-600 text-sm">
          To start building an FLM:
        </p>
        <ol className="list-decimal list-inside text-gray-600 text-sm mt-2 space-y-1">
          <li>Go to VC Models</li>
          <li>Create a new VC Model (or select existing)</li>
          <li>Click "Start FLM" to begin the workflow</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6 bg-white">
          <h3 className="font-semibold mb-2">FLM Steps</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li> Business Value Summary (BVS)</li>
            <li> Domain Business Spec (DBS)</li>
            <li> L0: Domain Study</li>
            <li> L1: Pillar Definition</li>
            <li> L2: Capability Mapping</li>
            <li> Business Blueprint</li>
          </ul>
        </div>

        <div className="border rounded-lg p-6 bg-white">
          <h3 className="font-semibold mb-2">Features</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li> AI-Powered Generation</li>
            <li> Human Review Gates</li>
            <li> Collaboration Support</li>
            <li> Version Control</li>
            <li> Export to Documents</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ContributePage() {
    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">
                        Datenübersicht
                    </h1>
                    <p className="text-gray-600 text-lg mb-2">
                        Hier können Sie die aktuellen Daten einsehen.
                    </p>
                    <p className="text-gray-600">
                        <strong>Bald verfügbar:</strong> Direkte Bearbeitung und Korrektur der Daten über diese Oberfläche.
                    </p>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <iframe 
                        className="airtable-embed" 
                        src="https://airtable.com/embed/appQnyHcfZZ0RUJR8/shrwcEnqumqGmAsNx" 
                        frameBorder="0" 
                        width="100%" 
                        height="533" 
                        style={{ background: 'transparent', border: '1px solid #ccc' }}
                    />
                </div>
            </div>
        </div>
    );
}

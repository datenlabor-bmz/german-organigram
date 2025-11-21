import { Database, ExternalLink, FileText, Building2, BarChart3, Link2 } from 'lucide-react';

const dataSources = [
    {
        title: 'Anschriftenverzeichnis des Bundes',
        description: 'Offizielle Adressen und Kontaktdaten der Bundesbehörden',
        icon: Database,
        link: 'https://www.govdata.de/suche/daten/anschriftenverzeichnis-des-bundes'
    },
    {
        title: 'Wikidata',
        description: 'Strukturierte Daten über Behörden, Minister und Organisationsstrukturen',
        icon: Link2,
        link: 'https://www.wikidata.org/w/index.php?title=Wikidata:Main_Page&uselang=de'
    },
    {
        title: 'Bundeshaushalt',
        description: 'Budgetdaten der Bundesbehörden',
        icon: BarChart3,
        link: 'https://www.bundeshaushalt.de/DE/Download-Portal/download-portal.html'
    },
    {
        title: 'Wissenschaftlicher Dienst des Bundestages',
        description: 'Dokumentation zu Behördenstrukturen und Beauftragten',
        icon: FileText,
        links: [
            { label: 'WD-3-118-24', url: 'https://www.bundestag.de/resource/blob/1034204/WD-3-118-24-pdf.pdf' },
            { label: 'BMI Beauftragte', url: 'https://www.bmi.bund.de/SharedDocs/downloads/DE/veroeffentlichungen/themen/ministerium/liste-beauftragte-bundesregierung.pdf?__blob=publicationFile&v=18' },
            { label: 'WD-3-069-24', url: 'https://www.bundestag.de/resource/blob/1022330/372951946501ba20601a653d7b7fd614/WD-3-069-24-WD-4-050-24-pdf.pdf' }
        ]
    },
    {
        title: 'Organigramme der Bundesregierung',
        description: 'Offizielle Organisationspläne der Ministerien',
        icon: Building2,
        link: 'https://airtable.com/appQnyHcfZZ0RUJR8/shrwcEnqumqGmAsNx'
    }
];

export default function DataSourceCards() {
    return (
        <div className="w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Datenquellen</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {dataSources.map((source) => {
                    const Icon = source.icon;
                    return (
                        <div
                            key={source.title}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start gap-3">
                                <div className="bg-gray-100 text-gray-600 p-2 rounded-lg flex-shrink-0">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-gray-900 text-sm mb-1">
                                        {source.title}
                                    </h3>
                                    <p className="text-xs text-gray-600 mb-2">
                                        {source.description}
                                    </p>
                                    {source.link ? (
                                        <a
                                            href={source.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            <span>Zur Quelle</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : source.links ? (
                                        <div className="flex flex-col gap-1">
                                            {source.links.map((link) => (
                                                <a
                                                    key={link.url}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    <span>{link.label}</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


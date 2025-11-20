interface DataSourceBadgeProps {
    source: 'wikidata' | 'bva' | 'bundeshaushalt' | 'eigen';
    href?: string;
    className?: string;
}

const sourceConfig = {
    wikidata: {
        label: 'Wikidata',
        symbol: 'W',
        url: 'https://www.wikidata.org',
        bgColor: 'bg-gray-200',
        textColor: 'text-gray-700',
        hoverBg: 'hover:bg-gray-300',
    },
    bva: {
        label: 'BVA',
        symbol: 'B',
        url: 'https://www.service.bund.de/Content/DE/Service/OpenData/opendata_node.html',
        bgColor: 'bg-gray-200',
        textColor: 'text-gray-700',
        hoverBg: 'hover:bg-gray-300',
    },
    bundeshaushalt: {
        label: 'Bundeshaushalt',
        symbol: '€',
        url: 'https://www.bundeshaushalt.de/DE/Download-Portal/download-portal.html',
        bgColor: 'bg-gray-200',
        textColor: 'text-gray-700',
        hoverBg: 'hover:bg-gray-300',
    },
    eigen: {
        label: 'Eigene Einordnung',
        symbol: 'E',
        url: undefined,
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-500',
        hoverBg: '',
    },
};

export default function DataSourceBadge({ source, href, className = '' }: DataSourceBadgeProps) {
    const config = sourceConfig[source];
    const link = href || config.url;

    const badge = (
        <span 
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold ${config.bgColor} ${config.textColor} ${className}`}
            title={`Quelle: ${config.label}`}
        >
            {config.symbol}
        </span>
    );

    if (!link) {
        return badge;
    }

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold ${config.bgColor} ${config.textColor} ${config.hoverBg} transition-colors ${className}`}
            title={`Quelle: ${config.label}`}
        >
            {config.symbol}
        </a>
    );
}


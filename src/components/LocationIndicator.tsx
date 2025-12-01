import { UnitLocation } from '@/types/organigram';

const locationLabels: Record<UnitLocation, string> = {
    bonn: 'Bonn',
    berlin: 'Berlin',
    both: 'Bonn & Berlin',
};

export default function LocationIndicator({ location }: { location: UnitLocation }) {
    const label = locationLabels[location];
    
    if (location === 'both') {
        return (
            <span 
                title={label}
                className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                style={{
                    background: 'linear-gradient(135deg, #d1d5db 50%, #4b5563 50%)',
                }}
            />
        );
    }
    
    return (
        <span 
            title={label}
            className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${
                location === 'bonn' ? 'bg-gray-300' : 'bg-gray-600'
            }`}
        />
    );
}


'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getAllEntities, searchEntities } from '@/lib/entities';
import { Entity } from '@/types/entity';
import { useRouter, useSearchParams } from 'next/navigation';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

const kategorieColorsFull: Record<string, string> = {
    'Oberste Bundesbehörde': 'bg-amber-200 text-gray-900',
    'Bundesoberbehörde': 'bg-purple-200 text-gray-900',
    'Bundesmittelbehörde': 'bg-pink-200 text-gray-900',
    'Hauptzollamt': 'bg-cyan-200 text-gray-900',
    'Zollfahndungsamt': 'bg-teal-200 text-gray-900',
    'Unternehmen': 'bg-orange-200 text-gray-900',
};

const EntityCard = ({ entity, onEntityClick }: { entity: Entity; onEntityClick: (entityId: string) => void }) => {
    const handleClick = () => {
        onEntityClick(String(entity.OrganisationId));
    };

    const cardColor = kategorieColorsFull[entity.Kategorie || ''] || 'bg-blue-100 text-gray-900';
    
    const displayName = entity.OrganisationDisplay || entity.OrganisationKurz || entity.OrganisationKurzInoffiziell || entity.Organisation;

    return (
        <Tooltip delayDuration={50} disableHoverableContent>
            <TooltipTrigger asChild>
                <button
                    onClick={handleClick}
                    className={`${cardColor} h-[50px] sm:h-[55px] pt-3 pl-3 pr-2 pb-2 rounded-lg flex items-start justify-start text-left transition-all duration-200 ease-out cursor-pointer hover:scale-105 hover:shadow-md active:scale-95 animate-in fade-in slide-in-from-bottom-4 touch-manipulation w-full`}
                    aria-label={`View details for ${entity.Organisation}`}
                    lang="de"
                >
                    <span className="font-medium text-xs sm:text-sm leading-tight hyphens-auto break-words">{displayName}</span>
                </button>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                sideOffset={8}
                className="bg-white text-slate-800 border border-slate-200 shadow-lg max-w-xs sm:max-w-sm"
                hideWhenDetached
                avoidCollisions={true}
                collisionPadding={12}
            >
                <div className="text-center max-w-xs sm:max-w-sm p-1">
                    <p className="font-medium text-xs sm:text-sm leading-tight">{entity.Organisation}</p>
                    <p className="text-xs text-slate-500 mt-1 hidden sm:block">Click to view entity details</p>
                    <p className="text-xs text-slate-500 mt-1 sm:hidden">Tap to view details</p>
                </div>
            </TooltipContent>
        </Tooltip>
    );
};

const kategorieColors: Record<string, string> = {
    'Oberste Bundesbehörde': 'bg-amber-200',
    'Bundesoberbehörde': 'bg-purple-200',
    'Bundesmittelbehörde': 'bg-pink-200',
    'Hauptzollamt': 'bg-cyan-200',
    'Zollfahndungsamt': 'bg-teal-200',
    'Unternehmen': 'bg-orange-200',
};

const Legend = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Legende</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {Object.entries(kategorieColors).map(([kategorie, color]) => (
                <div key={kategorie} className="flex items-center gap-2">
                    <div className={`${color} w-4 h-4 rounded`}></div>
                    <span className="text-xs text-gray-700">{kategorie}</span>
                </div>
            ))}
            <div className="flex items-center gap-2">
                <div className="bg-blue-100 w-4 h-4 rounded"></div>
                <span className="text-xs text-gray-700">Sonstige</span>
            </div>
        </div>
    </div>
);

const EntitiesGrid = forwardRef<{ handleReset: () => void; toggleGroup: (groupKey: string) => void }>((props, ref) => {
    const entities = getAllEntities();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<'ressorts' | 'kategorien'>('ressorts');
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleEntityClick = (entityId: string) => {
        router.replace(`/?entity=${entityId}`, { scroll: false });
    };

    const handleReset = () => {
        setSearchQuery('');
    };

    useImperativeHandle(ref, () => ({
        handleReset,
        toggleGroup: () => {}
    }));

    const visibleEntities = searchQuery.trim() 
        ? searchEntities(searchQuery)
        : entities;

    // Group entities by Ressort or Kategorie depending on view mode
    const groupedEntities = visibleEntities.reduce((acc: Record<string, Entity[]>, entity: Entity) => {
        const groupKey = viewMode === 'ressorts' 
            ? (entity.Ressort || 'Sonstige')
            : (entity.Kategorie || 'Sonstige');
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(entity);
        return acc;
    }, {});

    // Sort entities within each group
    Object.keys(groupedEntities).forEach(groupKey => {
        groupedEntities[groupKey].sort((a, b) => {
            if (viewMode === 'ressorts') {
                // In Ressort view: Oberste Bundesbehörde first, then by Kategorie, then by name
                const aIsOberste = a.Kategorie === 'Oberste Bundesbehörde';
                const bIsOberste = b.Kategorie === 'Oberste Bundesbehörde';
                
                if (aIsOberste && !bIsOberste) return -1;
                if (!aIsOberste && bIsOberste) return 1;
                
                const aCat = a.Kategorie || 'ZZZ';
                const bCat = b.Kategorie || 'ZZZ';
                if (aCat !== bCat) return aCat.localeCompare(bCat);
            }
            // In both views: finally sort by name
            return (a.OrganisationDisplay || a.Organisation || '').localeCompare(b.OrganisationDisplay || b.Organisation || '');
        });
    });

    // Sort groups based on view mode
    const sortedGroups = Object.keys(groupedEntities).sort((a, b) => {
        if (viewMode === 'ressorts') {
            // Hardcoded section order for Ressort view
            const sectionOrder = [
                // Ministries
                'BKAmt', 'BMF', 'BMI', 'AA', 'BMVg', 'BMWE', 'BMFTR', 'BMJV', 
                'BMBFSFJ', 'BMAS', 'BMDS', 'BMV', 'BMUKN', 'BMG', 'BMZ', 'BMWSB', 'BMLEH',
                // Special constitutional/administrative bodies
                'BPrA', 'ORG_18000636', 'ORG_18000594', 'BPA', 'BKM', 'BRH', 'BfDI', 'UKRat', 'BBk',
                // Miscellaneous
                'Sonstige'
            ];

            const indexA = sectionOrder.indexOf(a);
            const indexB = sectionOrder.indexOf(b);
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        } else {
            // In Kategorie view: sort by legend order
            const kategorieOrder = [
                'Oberste Bundesbehörde',
                'Bundesoberbehörde',
                'Bundesmittelbehörde',
                'Hauptzollamt',
                'Zollfahndungsamt',
                'Unternehmen',
                'Sonstige'
            ];

            const indexA = kategorieOrder.indexOf(a);
            const indexB = kategorieOrder.indexOf(b);
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        }
    });

    return (
        <div className="w-full">
            <div className="mb-6 space-y-4">
                <input
                    type="text"
                    placeholder="Suche nach Behörde, Ort, Ressort..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <div className="inline-flex rounded-full bg-gray-200 p-1">
                    <button
                        onClick={() => setViewMode('ressorts')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                            viewMode === 'ressorts'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Ansicht nach Ressorts
                    </button>
                    <button
                        onClick={() => setViewMode('kategorien')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                            viewMode === 'kategorien'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Ansicht nach Kategorien
                    </button>
                </div>
            </div>

            <Legend />

            {visibleEntities.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">Keine Behörden gefunden.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {sortedGroups.map((groupKey) => {
                        const groupEntities = groupedEntities[groupKey];
                        
                        // Determine group label based on view mode
                        let groupLabel = groupKey;
                        if (viewMode === 'ressorts') {
                            // Find the Oberste Bundesbehörde entity for this group
                            const obersteEntity = groupEntities.find(e => e.Kategorie === 'Oberste Bundesbehörde');
                            groupLabel = obersteEntity?.Organisation || groupKey;
                        }

                        return (
                            <div key={groupKey} className="animate-in fade-in slide-in-from-bottom-4">
                                <div className="mb-4">
                                    <div className="h-px bg-gradient-to-r from-gray-400 via-gray-200 to-transparent mb-1"></div>
                                    <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                                        {groupLabel} ({groupEntities.length})
                                    </h2>
                                </div>
                                
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3 w-full">
                                    {groupEntities.map((entity: Entity) => (
                                        <EntityCard key={entity.OrganisationId} entity={entity} onEntityClick={handleEntityClick} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

EntitiesGrid.displayName = 'EntitiesGrid';

export default EntitiesGrid;

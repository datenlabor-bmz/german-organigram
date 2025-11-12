'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getAllEntities, searchEntities } from '@/lib/entities';
import { Entity } from '@/types/entity';
import { useRouter, useSearchParams } from 'next/navigation';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import BudgetTreemap from './BudgetTreemap';

const kategorieColorsFull: Record<string, string> = {
    'Oberste Bundesbehörde': 'bg-yellow-200 text-gray-900',     // Gold (German flag)
    'Bundesoberbehörde': 'bg-red-200 text-gray-900',            // Red (German flag)
    'Bundesmittelbehörde': 'bg-blue-200 text-gray-900',         // Federal Blue
    'Hauptzollamt': 'bg-slate-200 text-gray-900',               // Operational Gray
    'Zollfahndungsamt': 'bg-indigo-200 text-gray-900',          // Navy Blue (law enforcement)
    'Unternehmen': 'bg-emerald-200 text-gray-900',              // Green (economy/business)
};

const EntityCard = ({ entity, onEntityClick }: { entity: Entity; onEntityClick: (entityId: string) => void }) => {
    const handleClick = () => {
        onEntityClick(String(entity.OrganisationId));
    };

    const cardColor = kategorieColorsFull[entity.Kategorie || ''] || 'bg-gray-300 text-gray-900';
    
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
                    <p className="text-xs text-slate-500 mt-1 hidden sm:block">Klicken für Details</p>
                    <p className="text-xs text-slate-500 mt-1 sm:hidden">Antippen für Details</p>
                </div>
            </TooltipContent>
        </Tooltip>
    );
};

const kategorieColors: Record<string, string> = {
    'Oberste Bundesbehörde': 'bg-yellow-200',     // Gold (German flag)
    'Bundesoberbehörde': 'bg-red-200',            // Red (German flag)
    'Bundesmittelbehörde': 'bg-blue-200',         // Federal Blue
    'Hauptzollamt': 'bg-slate-200',               // Operational Gray
    'Zollfahndungsamt': 'bg-indigo-200',          // Navy Blue (law enforcement)
    'Unternehmen': 'bg-emerald-200',              // Green (economy/business)
};

const Legend = () => (
    <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Kategorien</h3>
        <div className="flex flex-wrap gap-4">
            {Object.entries(kategorieColors).map(([kategorie, color]) => (
                <div key={kategorie} className="flex items-center gap-2">
                    <div className={`${color} w-3 h-3`}></div>
                    <span className="text-sm text-gray-700">{kategorie}</span>
                </div>
            ))}
            <div className="flex items-center gap-2">
                <div className="bg-gray-300 w-3 h-3"></div>
                <span className="text-sm text-gray-700">Sonstige</span>
            </div>
        </div>
    </div>
);

const EntitiesGrid = forwardRef<{ handleReset: () => void; toggleGroup: (groupKey: string) => void }>((props, ref) => {
    const entities = getAllEntities();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<'ressorts' | 'kategorien' | 'haushalt'>('ressorts');
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
    const kategorieOrder = [
        'Oberste Bundesbehörde',
        'Bundesoberbehörde',
        'Bundesmittelbehörde',
        'Hauptzollamt',
        'Zollfahndungsamt',
        'Unternehmen',
        'Sonstige'
    ];
    
    Object.keys(groupedEntities).forEach(groupKey => {
        groupedEntities[groupKey].sort((a, b) => {
            if (viewMode === 'ressorts') {
                // In Ressort view: Sort by Kategorie order, then by name
                const aCat = a.Kategorie || 'Sonstige';
                const bCat = b.Kategorie || 'Sonstige';
                
                const aIndex = kategorieOrder.indexOf(aCat);
                const bIndex = kategorieOrder.indexOf(bCat);
                
                if (aIndex !== bIndex) {
                    // Handle categories not in the order list
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                }
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
            <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <input
                    type="text"
                    placeholder="Suche nach Behörde, Ort, Ressort..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <div className="inline-flex border border-gray-200 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setViewMode('ressorts')}
                        className={`px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
                            viewMode === 'ressorts'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        Ansicht nach Ressorts
                    </button>
                    <button
                        onClick={() => setViewMode('kategorien')}
                        className={`px-6 py-2.5 text-sm font-medium transition-all duration-200 border-x border-gray-200 ${
                            viewMode === 'kategorien'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        Ansicht nach Kategorien
                    </button>
                    <button
                        onClick={() => setViewMode('haushalt')}
                        className={`px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
                            viewMode === 'haushalt'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        Ansicht nach Haushalt
                    </button>
                </div>
            </div>

            {viewMode !== 'haushalt' && <Legend />}

            {viewMode === 'haushalt' ? (
                <BudgetTreemap />
            ) : visibleEntities.length === 0 ? (
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

'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getAllEntities, searchEntities } from '@/lib/entities';
import { Entity } from '@/types/entity';
import { useRouter, useSearchParams } from 'next/navigation';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

const EntityCard = ({ entity, onEntityClick }: { entity: Entity; onEntityClick: (entityId: string) => void }) => {
    const handleClick = () => {
        onEntityClick(entity.OrganisationId);
    };

    const isRessort = entity.OrganisationKurz === entity.Ressort && entity.OrganisationKurz;
    const cardColor = isRessort ? 'bg-amber-200 text-gray-900' : 'bg-blue-100 text-gray-900';
    const displayName = entity.OrganisationKurz || entity.OrganisationKurzInoffiziell || entity.Organisation;

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

const EntitiesGrid = forwardRef<{ handleReset: () => void; toggleGroup: (groupKey: string) => void }>((props, ref) => {
    const entities = getAllEntities();
    const [searchQuery, setSearchQuery] = useState<string>('');
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

    // Group entities by Ressort (already deduplicated in entities.ts)
    const groupedByRessort = visibleEntities.reduce((acc: Record<string, Entity[]>, entity: Entity) => {
        const ressort = entity.Ressort || 'Sonstige';
        if (!acc[ressort]) {
            acc[ressort] = [];
        }
        acc[ressort].push(entity);
        return acc;
    }, {});

    // Sort each group: Ressort entity first, then alphabetically
    Object.keys(groupedByRessort).forEach(ressort => {
        groupedByRessort[ressort].sort((a, b) => {
            const aIsRessort = a.OrganisationKurz === a.Ressort && a.OrganisationKurz;
            const bIsRessort = b.OrganisationKurz === b.Ressort && b.OrganisationKurz;
            
            if (aIsRessort && !bIsRessort) return -1;
            if (!aIsRessort && bIsRessort) return 1;
            return (a.Organisation || '').localeCompare(b.Organisation || '');
        });
    });

    // Sort ressort groups: BKAmt first, BKM last (before Sonstige), rest alphabetically
    const sortedRessorts = Object.keys(groupedByRessort).sort((a, b) => {
        // BKAmt always first
        if (a === 'BKAmt') return -1;
        if (b === 'BKAmt') return 1;
        
        // Sonstige always last
        if (a === 'Sonstige') return 1;
        if (b === 'Sonstige') return -1;
        
        // BKM second to last (before Sonstige)
        if (a === 'BKM') return 1;
        if (b === 'BKM') return -1;
        
        // Rest alphabetically
        return a.localeCompare(b);
    });

    return (
        <div className="w-full">
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Suche nach Behörde, Ort, Ressort..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {visibleEntities.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">Keine Behörden gefunden.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {sortedRessorts.map((ressort) => {
                        const ressortEntities = groupedByRessort[ressort];
                        const ressortEntity = ressortEntities.find(e => e.OrganisationKurz === e.Ressort && e.OrganisationKurz);
                        const groupLabel = ressortEntity?.Organisation || ressort;

                        return (
                            <div key={ressort} className="animate-in fade-in slide-in-from-bottom-4">
                                <div className="mb-4">
                                    <div className="h-px bg-gradient-to-r from-gray-400 via-gray-200 to-transparent mb-1"></div>
                                    <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                                        {groupLabel} ({ressortEntities.length})
                                    </h2>
                                </div>
                                
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3 w-full">
                                    {ressortEntities.map((entity: Entity) => (
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

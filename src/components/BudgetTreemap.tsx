'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { getAllEntities, getEntityBudgetAmount } from '@/lib/entities';
import { Entity } from '@/types/entity';
import { useRouter } from 'next/navigation';

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface TreemapItem {
    value: number;
    entity: Entity;
}

interface TreemapRect extends Rect, TreemapItem {}

const GAP = 0.2;

function squarify(items: TreemapItem[], x: number, y: number, width: number, height: number): (Rect & TreemapItem)[] {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (total === 0 || items.length === 0) return [];

    const normalized = items.map(item => ({
        ...item,
        normalizedValue: (item.value / total) * width * height
    }));

    return slice(normalized, x, y, width, height);
}

function slice(items: (TreemapItem & { normalizedValue: number })[], x: number, y: number, width: number, height: number): (Rect & TreemapItem)[] {
    if (items.length === 0) return [];
    if (items.length === 1) {
        const { normalizedValue, ...rest } = items[0];
        return [{ x, y, width, height, ...rest }];
    }

    const total = items.reduce((sum, item) => sum + item.normalizedValue, 0);
    
    let sum = 0;
    let splitIndex = 0;
    for (let i = 0; i < items.length; i++) {
        sum += items[i].normalizedValue;
        if (sum >= total / 2) {
            splitIndex = i + 1;
            break;
        }
    }
    splitIndex = Math.max(1, Math.min(splitIndex, items.length - 1));

    const leftItems = items.slice(0, splitIndex);
    const rightItems = items.slice(splitIndex);
    
    const leftSum = leftItems.reduce((sum, item) => sum + item.normalizedValue, 0);

    if (width >= height) {
        const leftWidth = width * (leftSum / total) - GAP / 2;
        return [
            ...slice(leftItems, x, y, leftWidth, height),
            ...slice(rightItems, x + leftWidth + GAP, y, width - leftWidth - GAP, height)
        ];
    } else {
        const leftHeight = height * (leftSum / total) - GAP / 2;
        return [
            ...slice(leftItems, x, y, width, leftHeight),
            ...slice(rightItems, x, y + leftHeight + GAP, width, height - leftHeight - GAP)
        ];
    }
}

export default function BudgetTreemap() {
    const [budgetData, setBudgetData] = useState<TreemapItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredEntity, setHoveredEntity] = useState<string | number | null>(null);
    const router = useRouter();

    useEffect(() => {
        const loadData = async () => {
            try {
                const entities = getAllEntities();
                
                // Filter entities that have budget matches
                const entitiesWithMatches = entities.filter(entity => entity.budgetMatch);
                
                console.log('Entities with budget matches:', entitiesWithMatches.length);
                
                // Calculate budget amounts for all entities
                const budgetPromises = entitiesWithMatches.map(async entity => {
                    const amount = await getEntityBudgetAmount(entity);
                    return { entity, value: amount || 0 };
                });
                
                const results = await Promise.all(budgetPromises);
                
                // Filter out entities with zero budget and sort
                const entitiesWithBudget = results
                    .filter(item => item.value > 0)
                    .sort((a, b) => b.value - a.value);
                
                console.log('Entities with budget > 0:', entitiesWithBudget.length);
                setBudgetData(entitiesWithBudget);
            } catch (error) {
                console.error('Error loading budget data:', error);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="w-full h-[calc(100vh-280px)] min-h-[700px] flex items-center justify-center">
                <p className="text-gray-500 text-lg">Lade Haushaltsdaten...</p>
            </div>
        );
    }

    if (budgetData.length === 0) {
        return (
            <div className="w-full h-[calc(100vh-280px)] min-h-[700px] flex items-center justify-center">
                <p className="text-gray-500 text-lg">Keine Haushaltsdaten verfügbar</p>
            </div>
        );
    }

    const formatBudget = (amount: number): string => {
        return (amount / 1000000).toLocaleString('de-DE', {
            maximumFractionDigits: 2
        }) + ' Mrd. €';
    };

    const rects = squarify(budgetData, 0, 0, 100, 100);

    return (
        <div className="w-full h-[calc(100vh-280px)] min-h-[700px]">
            <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
                {rects.map((rect) => {
                    const showLabel = rect.width > 5 && rect.height > 3;
                    const isHovered = hoveredEntity === rect.entity.OrganisationId;
                    const colorClass = 'bg-blue-400 text-gray-900';
                    const displayName = rect.entity.OrganisationDisplay || rect.entity.OrganisationKurz || rect.entity.Organisation;

                    return (
                        <Tooltip key={rect.entity.OrganisationId} delayDuration={50} disableHoverableContent>
                            <TooltipTrigger asChild>
                                <div
                                    className={`absolute ${colorClass} flex flex-col justify-center items-center p-2 transition-all duration-200 cursor-pointer`}
                                    style={{
                                        left: `${rect.x}%`,
                                        top: `${rect.y}%`,
                                        width: `${rect.width}%`,
                                        height: `${rect.height}%`,
                                        opacity: isHovered ? 1 : 0.9,
                                        zIndex: isHovered ? 10 : 1,
                                        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                    }}
                                    onClick={() => router.replace(`/?entity=${rect.entity.OrganisationId}`, { scroll: false })}
                                    onMouseEnter={() => setHoveredEntity(rect.entity.OrganisationId)}
                                    onMouseLeave={() => setHoveredEntity(null)}
                                >
                                    {showLabel && (
                                        <>
                                            <div className="text-xs font-medium text-center mb-1 line-clamp-2 px-1">
                                                {displayName}
                                            </div>
                                            <div className="text-sm font-semibold">
                                                {formatBudget(rect.value)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent
                                side="top"
                                sideOffset={8}
                                className="bg-white text-slate-800 border border-slate-200 shadow-lg max-w-sm"
                                hideWhenDetached
                                avoidCollisions={true}
                                collisionPadding={12}
                            >
                                <div className="text-center p-2">
                                    <p className="font-bold text-base mb-1">{rect.entity.Organisation}</p>
                                    {rect.entity.OrganisationKurz && (
                                        <p className="text-xs text-gray-500 mb-2">{rect.entity.OrganisationKurz}</p>
                                    )}
                                    <p className="text-lg font-semibold text-blue-600">{formatBudget(rect.value)}</p>
                                    {rect.entity.budgetMatch && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Einzelplan {rect.entity.budgetMatch.einzelplan}
                                            {rect.entity.budgetMatch.kapitel && ` • Kapitel ${rect.entity.budgetMatch.kapitel}`}
                                            {rect.entity.budgetMatch.titel && ` • Titel ${rect.entity.budgetMatch.titel}`}
                                        </p>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}

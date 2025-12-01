'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Download, FileText, List, LayoutGrid } from 'lucide-react';
import { Organigram, LeadershipEntry, OrgUnit, UnitLocation } from '@/types/organigram';
import LocationIndicator from './LocationIndicator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type LeaderNode = LeadershipEntry & { children: LeaderNode[] };
type UnitNode = OrgUnit & { children: UnitNode[]; depth: number };

function buildLeadershipTree(leadership: LeadershipEntry[]): LeaderNode[] {
    const map = new Map<string, LeaderNode>();
    leadership.forEach(l => map.set(l.id, { ...l, children: [] }));
    
    const roots: LeaderNode[] = [];
    leadership.forEach(l => {
        const node = map.get(l.id)!;
        if (l.reportsTo && map.has(l.reportsTo)) {
            map.get(l.reportsTo)!.children.push(node);
        } else {
            roots.push(node);
        }
    });
    return roots;
}

function buildUnitsTree(units: OrgUnit[]): UnitNode[] {
    const map = new Map<string, UnitNode>();
    units.forEach(u => map.set(u.id, { ...u, children: [], depth: 0 }));
    
    const roots: UnitNode[] = [];
    const otherUnits: UnitNode[] = [];
    
    units.forEach(u => {
        const node = map.get(u.id)!;
        if (u.parentId && map.has(u.parentId)) {
            map.get(u.parentId)!.children.push(node);
        } else if (!u.parentId && !u.code) {
            otherUnits.push(node);
        } else {
            roots.push(node);
        }
    });
    
    // Group units without parentId and code under "Andere Einheiten"
    if (otherUnits.length > 0) {
        const otherGroup: UnitNode = {
            id: '__andere__',
            code: null,
            name: 'Andere Einheiten',
            type: 'special',
            category: 'staff',
            head: null,
            headTitle: null,
            parentId: null,
            reportsTo: '',
            location: 'both',
            children: otherUnits,
            depth: 0,
        };
        roots.push(otherGroup);
    }
    
    const setDepth = (nodes: UnitNode[], depth: number) => {
        nodes.forEach(n => {
            n.depth = depth;
            setDepth(n.children, depth + 1);
        });
    };
    setDepth(roots, 0);
    
    return roots;
}

function LeaderItem({ node }: { node: LeaderNode }) {
    const hasChildren = node.children.length > 0;
    
    return (
        <div>
            <div className="py-1">
                <div className="text-gray-900 text-sm leading-5">{node.name}</div>
                <div className="text-xs text-gray-500">{node.role}</div>
            </div>
            {hasChildren && (
                <div className="ml-4 border-l border-gray-200 pl-3">
                    {node.children.map(child => (
                        <LeaderItem key={child.id} node={child} />
                    ))}
                </div>
            )}
        </div>
    );
}

function LeadershipList({ roots }: { roots: LeaderNode[] }) {
    return (
        <div>
            {roots.map(root => (
                <LeaderItem key={root.id} node={root} />
            ))}
        </div>
    );
}

function UnitItem({ node, defaultExpanded }: { node: UnitNode; defaultExpanded: boolean }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const hasChildren = node.children.length > 0;
    
    return (
        <div>
            <div className="flex items-start gap-2 py-1">
                <div className="flex items-center gap-2 shrink-0 h-5">
                    <span className="w-5 flex items-center justify-center -ml-1">
                        {hasChildren ? (
                            <button 
                                onClick={() => setExpanded(!expanded)}
                                className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                            >
                                {expanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                )}
                            </button>
                        ) : null}
                    </span>
                    <LocationIndicator location={node.location} />
                    {node.code && (
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {node.code}
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-gray-900 text-sm leading-5">{node.name}</div>
                    {node.head && (
                        <div className="text-xs text-gray-500" title={node.headTitle || undefined}>
                            {node.head}
                        </div>
                    )}
                </div>
            </div>
            {hasChildren && expanded && (
                <div className="ml-5 border-l border-gray-200 pl-2">
                    {node.children.map(child => (
                        <UnitItem 
                            key={child.id} 
                            node={child} 
                            defaultExpanded={false} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function UnitsTree({ roots }: { roots: UnitNode[] }) {
    return (
        <div>
            {roots.map(root => (
                <UnitItem key={root.id} node={root} defaultExpanded={false} />
            ))}
        </div>
    );
}

// Treemap types and functions
type UnitWithValue = UnitNode & { value: number };

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

const GAP = 0.3;

function computeUnitValues(nodes: UnitNode[]): UnitWithValue[] {
    const compute = (node: UnitNode): UnitWithValue => {
        if (node.children.length === 0) {
            return { ...node, value: 1, children: [] };
        }
        const childrenWithValues = node.children.map(compute);
        const value = childrenWithValues.reduce((sum, c) => sum + c.value, 0);
        return { ...node, value, children: childrenWithValues };
    };
    return nodes.map(compute);
}

function squarify(items: UnitWithValue[], x: number, y: number, width: number, height: number): (Rect & UnitWithValue)[] {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (total === 0 || items.length === 0) return [];

    const normalized = items.map(item => ({
        ...item,
        normalizedValue: (item.value / total) * width * height
    }));

    return slice(normalized, x, y, width, height);
}

function slice(items: (UnitWithValue & { normalizedValue: number })[], x: number, y: number, width: number, height: number): (Rect & UnitWithValue)[] {
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

function getLocationColor(location: UnitLocation): string {
    switch (location) {
        case 'bonn': return '#e5e7eb';
        case 'berlin': return '#6b7280';
        case 'both': return '#9ca3af';
    }
}

function getLocationTextColor(location: UnitLocation): string {
    return location === 'berlin' ? '#ffffff' : '#1f2937';
}

function UnitsTreemap({ roots }: { roots: UnitNode[] }) {
    const unitsWithValues = useMemo(() => computeUnitValues(roots), [roots]);
    const [zoomPath, setZoomPath] = useState<UnitWithValue[]>([]);
    
    const currentItems = useMemo(() => {
        if (zoomPath.length === 0) return unitsWithValues;
        const current = zoomPath[zoomPath.length - 1];
        return current.children as UnitWithValue[];
    }, [unitsWithValues, zoomPath]);
    
    const rects = useMemo(() => squarify(currentItems, 0, 0, 100, 100), [currentItems]);

    const handleClick = (rect: Rect & UnitWithValue) => {
        if (rect.children.length > 0) {
            setZoomPath([...zoomPath, rect]);
        }
    };

    return (
        <div className="space-y-2">
            {zoomPath.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    <button 
                        onClick={() => setZoomPath([])} 
                        className="hover:text-gray-700 hover:underline"
                    >
                        Alle
                    </button>
                    {zoomPath.map((item, i) => (
                        <span key={item.id} className="flex items-center gap-1">
                            <span>/</span>
                            <button 
                                onClick={() => setZoomPath(zoomPath.slice(0, i + 1))}
                                className="hover:text-gray-700 hover:underline"
                            >
                                {item.code || item.name}
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="relative w-full h-64 bg-gray-50 rounded-lg overflow-hidden">
                {rects.map((rect) => {
                    const showCode = rect.width > 8 && rect.height > 8;
                    const showName = rect.width > 12 && rect.height > 10;
                    const bgColor = getLocationColor(rect.location);
                    const textColor = getLocationTextColor(rect.location);
                    const hasChildren = rect.children.length > 0;

                    return (
                        <Tooltip key={rect.id} delayDuration={50} disableHoverableContent>
                            <TooltipTrigger asChild>
                                <div
                                    className={`absolute flex flex-col justify-center items-center p-1 transition-opacity hover:opacity-80 overflow-hidden ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
                                    style={{
                                        left: `${rect.x}%`,
                                        top: `${rect.y}%`,
                                        width: `${rect.width}%`,
                                        height: `${rect.height}%`,
                                        backgroundColor: bgColor,
                                        color: textColor,
                                    }}
                                    onClick={() => handleClick(rect)}
                                >
                                    {showCode && rect.code && (
                                        <div className="text-[10px] font-mono opacity-70">{rect.code}</div>
                                    )}
                                    {showName && (
                                        <div className="text-[9px] text-center leading-tight line-clamp-2 px-0.5">
                                            {rect.name}
                                        </div>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent
                                side="top"
                                sideOffset={4}
                                className="bg-white text-slate-800 border border-slate-200 shadow-lg max-w-xs"
                            >
                                <div className="p-1">
                                    {rect.code && <span className="font-mono text-xs text-gray-500 mr-2">{rect.code}</span>}
                                    <span className="text-sm font-medium">{rect.name}</span>
                                    {rect.head && (
                                        <div className="text-xs text-gray-500 mt-1">{rect.head}</div>
                                    )}
                                    {hasChildren && (
                                        <div className="text-xs text-blue-500 mt-1">Klicken zum Öffnen</div>
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

interface OrganigramSectionProps {
    organigram: Organigram;
    jsonUrl: string;
    pdfUrl: string;
}

export default function OrganigramSection({ organigram, jsonUrl, pdfUrl }: OrganigramSectionProps) {
    const leadershipRoots = useMemo(() => buildLeadershipTree(organigram.leadership), [organigram.leadership]);
    const unitRoots = useMemo(() => buildUnitsTree(organigram.units), [organigram.units]);
    const [unitsView, setUnitsView] = useState<'list' | 'treemap'>('list');
    
    return (
        <div className="space-y-6">
            {leadershipRoots.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Leitung</h4>
                    <LeadershipList roots={leadershipRoots} />
                </div>
            )}
            
            {unitRoots.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organisationseinheiten</h4>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setUnitsView('list')}
                                className={`p-1 rounded transition-colors ${unitsView === 'list' ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Liste"
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setUnitsView('treemap')}
                                className={`p-1 rounded transition-colors ${unitsView === 'treemap' ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Treemap"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1.5">
                            <LocationIndicator location="bonn" /> Bonn
                        </span>
                        <span className="flex items-center gap-1.5">
                            <LocationIndicator location="berlin" /> Berlin
                        </span>
                        <span className="flex items-center gap-1.5">
                            <LocationIndicator location="both" /> Beide
                        </span>
                    </div>
                    {unitsView === 'list' ? (
                        <UnitsTree roots={unitRoots} />
                    ) : (
                        <UnitsTreemap roots={unitRoots} />
                    )}
                </div>
            )}
            
            <div className="flex items-center gap-3 pt-2">
                <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <FileText className="w-3.5 h-3.5" />
                    PDF
                </a>
                <a
                    href={jsonUrl}
                    download
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <Download className="w-3.5 h-3.5" />
                    JSON
                </a>
            </div>
        </div>
    );
}

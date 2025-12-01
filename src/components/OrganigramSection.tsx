'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Download, FileText } from 'lucide-react';
import { Organigram, LeadershipEntry, OrgUnit } from '@/types/organigram';
import LocationIndicator from './LocationIndicator';

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

interface OrganigramSectionProps {
    organigram: Organigram;
    jsonUrl: string;
    pdfUrl: string;
}

export default function OrganigramSection({ organigram, jsonUrl, pdfUrl }: OrganigramSectionProps) {
    const leadershipRoots = useMemo(() => buildLeadershipTree(organigram.leadership), [organigram.leadership]);
    const unitRoots = useMemo(() => buildUnitsTree(organigram.units), [organigram.units]);
    
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
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Organisationseinheiten</h4>
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
                    <UnitsTree roots={unitRoots} />
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

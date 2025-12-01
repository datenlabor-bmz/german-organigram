export interface OrganigramMetadata {
    organization: string;
    organizationFull: string;
    date: string;
    sourceUrl: string | null;
    pdfFile: string;
    extractedAt: string;
}

export interface LeadershipEntry {
    id: string;
    role: string;
    name: string;
    type: 'minister' | 'state_secretary';
    reportsTo?: string;
}

export type UnitLocation = 'both' | 'bonn' | 'berlin';

export interface OrgUnit {
    id: string;
    code: string | null;
    name: string;
    type: 'unit' | 'special';
    category: 'abteilung' | 'unterabteilung' | 'referat' | 'staff' | 'projekt' | 'beauftragte';
    head: string | null;
    headTitle: string | null;
    parentId: string | null;
    reportsTo: string;
    location: UnitLocation;
}

export interface Organigram {
    metadata: OrganigramMetadata;
    leadership: LeadershipEntry[];
    units: OrgUnit[];
}


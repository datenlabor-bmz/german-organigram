import { Entity, BudgetMatch } from '@/types/entity';
import indexData from '../../public/organizations-index.json';
import budgetMatches from '../../public/budget_matches.json';

// Type for index entries (minimal data for grid)
type IndexEntry = {
    Organisation: string;
    OrganisationId?: number;
    OrganisationDisplay?: string;
    OrganisationKurz?: string;
    Kategorie?: string;
    Ressort?: string;
    Versteckt: boolean;
    hasWikidata: boolean;
};

const rawEntities = indexData as IndexEntry[];

// Convert index entries to entities (just for grid display)
const entities = rawEntities
    .filter(entry => !entry.Versteckt && entry.Organisation)
    .map(entry => {
        const entity: Entity = {
            Organisation: entry.Organisation,
            OrganisationId: entry.OrganisationId,
            OrganisationDisplay: entry.OrganisationDisplay,
            OrganisationKurz: entry.OrganisationKurz,
            Kategorie: entry.Kategorie,
            Ressort: entry.Ressort,
            hasWikidata: entry.hasWikidata,
        };
        return entity;
    });

// Load full entity data dynamically
const entityCache: Record<string, Entity> = {};

export const loadFullEntity = async (orgName: string): Promise<Entity | null> => {
    // Check cache
    if (entityCache[orgName]) {
        return entityCache[orgName];
    }
    
    try {
        // Find the index entry
        const indexEntry = rawEntities.find(e => e.Organisation === orgName);
        if (!indexEntry) return null;
        
        // Generate filename using same logic as Python script
        const name = indexEntry.OrganisationKurz || indexEntry.Organisation || indexEntry.OrganisationDisplay || 'org';
        const sanitized = name
            .normalize('NFKD')
            .replace(/[^\w\s-]/g, '')
            .toLowerCase()
            .replace(/[-\s]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50);
        const idSuffix = indexEntry.OrganisationId ? `-${indexEntry.OrganisationId}` : '';
        const filename = `${sanitized}${idSuffix}`;
        
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const response = await fetch(`${basePath}/organizations/${filename}.json`);
        
        if (!response.ok) {
            throw new Error(`Failed to load entity ${orgName}: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Add budget match if available (try both Organisation and OrganisationId)
        const budgetMatchesMap = (budgetMatches as BudgetMatch[]).reduce((acc, match) => {
            acc[match.organisationId] = match;
            return acc;
        }, {} as Record<string, BudgetMatch>);
        
        const matchKey = indexEntry.OrganisationId ? String(indexEntry.OrganisationId) : orgName;
        if (matchKey in budgetMatchesMap) {
            data.budgetMatch = budgetMatchesMap[matchKey];
        }
        
        // Cache it
        entityCache[orgName] = data;
        
        return data;
    } catch (error) {
        console.error(`Failed to load entity ${orgName}:`, error);
        return null;
    }
};

// Budget data loading (kept for budget features)
let csvBudgetData: Array<{
    einzelplan: string;
    kapitel: string;
    kapitelText: string;
    titel: string;
    titelText: string;
    soll: number;
}> | null = null;

const loadBudgetData = async () => {
    if (csvBudgetData) return csvBudgetData;

    try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const response = await fetch(`${basePath}/HH_2025.csv`);
        const csvText = await response.text();
        const lines = csvText.split('\n').slice(1); // Skip header

        csvBudgetData = lines
            .filter(line => line.trim())
            .map(line => {
                const parts = line.split(';');
                return {
                    einzelplan: parts[0]?.replace(/"/g, '').trim() || '',
                    kapitel: parts[4]?.replace(/"/g, '').trim() || '',
                    kapitelText: parts[5]?.replace(/"/g, '').trim() || '',
                    titel: parts[6]?.replace(/"/g, '').trim() || '',
                    titelText: parts[8]?.replace(/"/g, '').trim() || '',
                    soll: parseInt(parts[11]?.trim() || '0', 10) || 0,
                };
            });

        return csvBudgetData;
    } catch (error) {
        console.error('Failed to load budget data:', error);
        return [];
    }
};

const calculateBudgetAmount = async (match: BudgetMatch): Promise<number> => {
    const data = await loadBudgetData();

    return data
        .filter(row => {
            if (row.einzelplan !== match.einzelplan) return false;
            if (match.kapitel && row.kapitel !== match.kapitel) return false;
            if (match.titel && row.titel !== match.titel) return false;
            return true;
        })
        .reduce((sum, row) => sum + row.soll, 0);
};

export const getAllEntities = () => entities;

export const getEntityByName = (name: string): Entity | null => 
    entities.find(entity => entity.Organisation === name) || null;

// Get full entity data (for modal)
export const getFullEntityByName = async (name: string): Promise<Entity | null> => 
    await loadFullEntity(name);

export const searchEntities = (query: string): Entity[] => {
    const searchTerm = query.toLowerCase();
    return entities.filter(entity => 
        entity.Organisation.toLowerCase().includes(searchTerm) ||
        (entity.OrganisationKurz && entity.OrganisationKurz.toLowerCase().includes(searchTerm)) ||
        (entity.OrganisationKurzInoffiziell && entity.OrganisationKurzInoffiziell.toLowerCase().includes(searchTerm)) ||
        (entity.OrganisationDisplay && entity.OrganisationDisplay.toLowerCase().includes(searchTerm)) ||
        (entity.Ressort && entity.Ressort.toLowerCase().includes(searchTerm)) ||
        (entity.Ort && entity.Ort.toLowerCase().includes(searchTerm))
    );
};

export const getEntityBudgetAmount = async (entity: Entity): Promise<number | null> => {
    if (!entity.budgetMatch) return null;
    return await calculateBudgetAmount(entity.budgetMatch);
};

export const getEntityBudgetBreakdown = async (entity: Entity): Promise<Array<{label: string; description: string; amount: number}> | null> => {
    if (!entity.budgetMatch) return null;
    
    const data = await loadBudgetData();
    const match = entity.budgetMatch;
    
    // Determine which level to break down by (hierarchy: einzelplan > kapitel > titel)
    let groupByField: 'kapitel' | 'titel' | null = null;
    let groupByLabel: string = '';
    let textField: 'kapitelText' | 'titelText' | null = null;
    
    if (!match.kapitel) {
        groupByField = 'kapitel';
        groupByLabel = 'Kapitel';
        textField = 'kapitelText';
    } else if (!match.titel) {
        groupByField = 'titel';
        groupByLabel = 'Titel';
        textField = 'titelText';
    }
    
    if (!groupByField || !textField) return null; // Already at lowest level
    
    // Filter data and group by next level, collecting text descriptions
    const breakdown: Record<string, {amount: number; text: string}> = {};
    
    data
        .filter(row => {
            if (row.einzelplan !== match.einzelplan) return false;
            if (match.kapitel && row.kapitel !== match.kapitel) return false;
            if (match.titel && row.titel !== match.titel) return false;
            return true;
        })
        .forEach(row => {
            const key = row[groupByField!] || 'Sonstige';
            if (!breakdown[key]) {
                breakdown[key] = { amount: 0, text: row[textField!] || '' };
            }
            breakdown[key].amount += row.soll;
        });
    
    // Convert to array and sort by amount descending
    return Object.entries(breakdown)
        .map(([code, data]) => ({ 
            label: `${groupByLabel} ${code}`, 
            description: data.text,
            amount: data.amount 
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10); // Top 10
};

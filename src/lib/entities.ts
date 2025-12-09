import { Entity, BudgetMatch, PersonalhaushaltEntry, Personalhaushalt } from '@/types/entity';
import { Organigram } from '@/types/organigram';
import indexData from '../../public/organizations-index.json';
import budgetMatches from '../../public/budget_matches.json';
import personalhaushaltData from '../../public/personalhaushalt_2025.json';

// Type for personalhaushalt JSON structure
type PersonalhaushaltData = Record<string, Personalhaushalt>;

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

// Build budget matches map by organisationId
const budgetMatchesMap = (budgetMatches as BudgetMatch[]).reduce((acc, match) => {
    acc[match.organisationId] = match;
    return acc;
}, {} as Record<string, BudgetMatch>);

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
        // Attach budget match if available
        if (entry.OrganisationId && String(entry.OrganisationId) in budgetMatchesMap) {
            entity.budgetMatch = budgetMatchesMap[String(entry.OrganisationId)];
        }
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
        
        // Add budget match if available
        const matchKey = indexEntry.OrganisationId ? String(indexEntry.OrganisationId) : orgName;
        if (matchKey in budgetMatchesMap) {
            data.budgetMatch = budgetMatchesMap[matchKey];
            // Add personalhaushalt data
            const ph = getEntityPersonalhaushalt(budgetMatchesMap[matchKey]);
            if (ph) data.personalhaushalt = ph;
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

// Get budget for titles starting with 51, 52, 53 (Sächliche Verwaltungsausgaben)
export const getEntityAdminBudget = async (entity: Entity): Promise<number | null> => {
    if (!entity.budgetMatch) return null;
    const data = await loadBudgetData();
    const match = entity.budgetMatch;
    
    return data
        .filter(row => {
            if (row.einzelplan !== match.einzelplan) return false;
            if (match.kapitel && row.kapitel !== match.kapitel) return false;
            if (!row.titel.startsWith('51') && !row.titel.startsWith('52') && !row.titel.startsWith('53')) return false;
            return true;
        })
        .reduce((sum, row) => sum + row.soll, 0);
};

// Get breakdown of admin budget by full titel (51x, 52x, 53x)
export const getEntityAdminBreakdown = async (entity: Entity): Promise<Array<{code: string; label: string; amount: number}> | null> => {
    if (!entity.budgetMatch) return null;
    const data = await loadBudgetData();
    const match = entity.budgetMatch;
    
    return data
        .filter(row => {
            if (row.einzelplan !== match.einzelplan) return false;
            if (match.kapitel && row.kapitel !== match.kapitel) return false;
            if (!row.titel.startsWith('51') && !row.titel.startsWith('52') && !row.titel.startsWith('53')) return false;
            return row.soll > 0;
        })
        .map(row => ({
            code: `${row.kapitel} ${row.titel.substring(0,3)} ${row.titel.substring(3)}`,
            label: row.titelText || '',
            amount: row.soll,
        }))
        .sort((a, b) => b.amount - a.amount);
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

// Personalhaushalt data loading
const phData = personalhaushaltData as PersonalhaushaltData;

export const getEntityPersonalhaushalt = (match: BudgetMatch): PersonalhaushaltEntry | null => {
    const eplKey = `epl${match.einzelplan.padStart(2, '0')}`;
    const eplData = phData[eplKey];
    if (!eplData) return null;
    
    // If kapitel specified, find that specific entry
    if (match.kapitel) {
        const entry = eplData.planstellen.find(e => e.kap === match.kapitel);
        if (entry) return entry;
    }
    
    // For ministries: sum all planstellen for this Einzelplan
    if (eplData.planstellen.length === 0) return null;
    
    const summed: PersonalhaushaltEntry = {
        kap: match.einzelplan,
        name: 'Gesamt',
        zusammen_2025: 0,
        zusammen_2024: 0,
    };
    
    for (const entry of eplData.planstellen) {
        if (entry.soldaten_2025 !== undefined) {
            summed.soldaten_2025 = (summed.soldaten_2025 || 0) + entry.soldaten_2025;
            summed.soldaten_2024 = (summed.soldaten_2024 || 0) + (entry.soldaten_2024 || 0);
        }
        if (entry.beamte_2025 !== undefined) {
            summed.beamte_2025 = (summed.beamte_2025 || 0) + entry.beamte_2025;
            summed.beamte_2024 = (summed.beamte_2024 || 0) + (entry.beamte_2024 || 0);
        }
        if (entry.arbeitnehmer_2025 !== undefined) {
            summed.arbeitnehmer_2025 = (summed.arbeitnehmer_2025 || 0) + entry.arbeitnehmer_2025;
            summed.arbeitnehmer_2024 = (summed.arbeitnehmer_2024 || 0) + (entry.arbeitnehmer_2024 || 0);
        }
        summed.zusammen_2025 += entry.zusammen_2025;
        summed.zusammen_2024 += entry.zusammen_2024;
    }
    
    return summed;
};

// Organigram loading
const organigramCache: Record<string, Organigram | null> = {};

export const loadOrganigram = async (entity: Entity): Promise<Organigram | null> => {
    const orgKurz = entity.OrganisationKurz;
    const orgId = entity.OrganisationId;
    if (!orgKurz || !orgId) return null;
    
    const cacheKey = `${orgKurz}-${orgId}`;
    if (cacheKey in organigramCache) return organigramCache[cacheKey];
    
    try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const filename = `${orgKurz.toLowerCase()}-${orgId}`;
        const response = await fetch(`${basePath}/organigrams/${filename}.json`);
        if (!response.ok) {
            organigramCache[cacheKey] = null;
            return null;
        }
        const data = await response.json();
        organigramCache[cacheKey] = data;
        return data;
    } catch {
        organigramCache[cacheKey] = null;
        return null;
    }
};

import { Entity, EntityLocation, BudgetMatch } from '@/types/entity';
import rawData from '../../public/anschriftenverzeichnis.json';
import budgetMatches from '../../public/budget_matches.json';

// Type for raw entry that may include Liegenschaft-only data
type RawEntry = Entity & { LiegenschaftsId?: string };

// Load entities, skipping first element (metadata)
// Keep all entries (including liegenschaften) for location data extraction
const rawEntities = (rawData as RawEntry[]).slice(1);

// Load budget data
const budgetMatchesMap = (budgetMatches as BudgetMatch[]).reduce((acc, match) => {
    acc[match.organisationId] = match;
    return acc;
}, {} as Record<string, BudgetMatch>);

// Parse budget CSV data - will be loaded dynamically
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

// Group entities by OrganisationId and collect all locations
const groupedEntities = rawEntities.reduce((acc: Record<string, Entity>, entity: RawEntry) => {
    const orgId = String(entity.OrganisationId);
    
    // Skip entries that are only liegenschaften (have LiegenschaftsId but no Organisation)
    const isLiegenschaftOnly = entity.LiegenschaftsId && !entity.Organisation;
    
    if (!acc[orgId]) {
        // Skip if this is only a liegenschaft entry
        if (isLiegenschaftOnly) {
            return acc;
        }
        
            // First real entity occurrence - keep as primary
            const entityCopy = { 
                ...entity, 
                locations: []
            };

            // Add budget match if available
            if (orgId in budgetMatchesMap) {
                entityCopy.budgetMatch = budgetMatchesMap[orgId];
            }

            acc[orgId] = entityCopy;
    } else if (!isLiegenschaftOnly) {
        // If this entry is a ressort (IstRessort or OrganisationKurz == Ressort), replace the existing entry
        const isRessort = entity.IstRessort || (entity.OrganisationKurz && entity.OrganisationKurz === entity.Ressort);
        const existingIsRessort = acc[orgId].IstRessort || (acc[orgId].OrganisationKurz && acc[orgId].OrganisationKurz === acc[orgId].Ressort);
        
                if (isRessort && !existingIsRessort) {
                    // Keep existing locations but replace the entity data
                    const existingLocations = acc[orgId].locations || [];
                    const entityCopy = { 
                        ...entity, 
                        locations: existingLocations
                    };

                    // Add budget match if available
                    if (orgId in budgetMatchesMap) {
                        entityCopy.budgetMatch = budgetMatchesMap[orgId];
                    }

                    acc[orgId] = entityCopy;
                }
    }
    
    // Add location data from all entries (including liegenschaften) if an entity exists
    if (acc[orgId] && (entity.Hauptadresse || entity.PLZ || entity.Ort)) {
        const location: EntityLocation = {
            Hauptadresse: entity.Hauptadresse || '',
            PLZ: String(entity.PLZ || ''),
            Ort: entity.Ort || '',
            Bundesland: entity.Bundesland || '',
            Telefon: entity.Telefon || '',
            Telefax: entity.Telefax || '',
            'E-Mail': entity['E-Mail'] || '',
        };
        
        acc[orgId].locations!.push(location);
    }
    
    return acc;
}, {});

// Filter out hidden entities (Versteckt === true)
export const entities = Object.values(groupedEntities).filter(entity => !entity.Versteckt);

export const getAllEntities = () => entities;

export const getEntityById = (id: string): Entity | null => 
    entities.find(entity => String(entity.OrganisationId) === id) || null;

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

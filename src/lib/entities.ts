import { Entity, EntityLocation } from '@/types/entity';
import rawData from '../../public/anschriftenverzeichnis.json';
import kurzMapping from '../../public/kurz_mapping.json';

// Load entities, skipping first element (metadata)
const rawEntities = (rawData as Entity[]).slice(1);

// Create mapping lookup for OrganisationKurz and OrganisationKurzInoffiziell
const kurzLookup = (kurzMapping as Array<{ OrganisationId: string; OrganisationKurz?: string | null; OrganisationKurzInoffiziell?: string | null }>).reduce((acc, item) => {
    acc[item.OrganisationId] = {
        kurz: item.OrganisationKurz || null,
        inoffiziell: item.OrganisationKurzInoffiziell || null
    };
    return acc;
}, {} as Record<string, { kurz: string | null; inoffiziell: string | null }>);

// Group entities by OrganisationId and collect all locations
const groupedEntities = rawEntities.reduce((acc: Record<string, Entity>, entity: Entity) => {
    if (!acc[entity.OrganisationId]) {
        // First occurrence - keep as primary
        const entityCopy = { ...entity, locations: [] };
        
        // Apply OrganisationKurz and OrganisationKurzInoffiziell from mapping if available
        if (entity.OrganisationId in kurzLookup) {
            const mapping = kurzLookup[entity.OrganisationId];
            if (mapping.kurz) {
                entityCopy.OrganisationKurz = mapping.kurz;
            }
            if (mapping.inoffiziell) {
                entityCopy.OrganisationKurzInoffiziell = mapping.inoffiziell;
            }
        }
        
        acc[entity.OrganisationId] = entityCopy;
    }
    
    // Add location data
    const location: EntityLocation = {
        Hauptadresse: entity.Hauptadresse,
        PLZ: entity.PLZ,
        Ort: entity.Ort,
        Bundesland: entity.Bundesland,
        Telefon: entity.Telefon,
        Telefax: entity.Telefax,
        'E-Mail': entity['E-Mail'],
    };
    
    acc[entity.OrganisationId].locations!.push(location);
    return acc;
}, {});

export const entities = Object.values(groupedEntities);

export const getAllEntities = () => entities;

export const getEntityById = (id: string): Entity | null => 
    entities.find(entity => entity.OrganisationId === id) || null;

export const searchEntities = (query: string): Entity[] => {
    const searchTerm = query.toLowerCase();
    return entities.filter(entity => 
        entity.Organisation.toLowerCase().includes(searchTerm) ||
        (entity.OrganisationKurz && entity.OrganisationKurz.toLowerCase().includes(searchTerm)) ||
        (entity.OrganisationKurzInoffiziell && entity.OrganisationKurzInoffiziell.toLowerCase().includes(searchTerm)) ||
        entity.Ressort.toLowerCase().includes(searchTerm) ||
        entity.Ort.toLowerCase().includes(searchTerm)
    );
};

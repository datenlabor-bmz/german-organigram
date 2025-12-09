export interface EntityLocation {
    Hauptadresse: string;
    PLZ: string;
    Ort: string;
    Bundesland: string;
    Telefon: string;
    Telefax: string;
    'E-Mail': string;
}

export interface BudgetMatch {
    organisationId: string;
    einzelplan: string;
    kapitel?: string;
    titel?: string;
}

export interface PersonalhaushaltEntry {
    kap: string;
    name: string;
    soldaten_2025?: number;
    soldaten_2024?: number;
    beamte_2025?: number;
    beamte_2024?: number;
    arbeitnehmer_2025?: number;
    arbeitnehmer_2024?: number;
    zusammen_2025: number;
    zusammen_2024: number;
}

export interface Personalhaushalt {
    planstellen: PersonalhaushaltEntry[];
    leerstellen: PersonalhaushaltEntry[];
}

import { WikidataEntity } from '@/lib/wikidata';

export interface Entity {
    Organisation: string;
    OrganisationId?: string | number;
    OrganisationKurz?: string;
    OrganisationKurzInoffiziell?: string;
    OrganisationDisplay?: string;
    Ressort?: string;
    Kategorie?: string;
    Versteckt?: boolean;
    Hauptadresse?: string;
    PLZ?: string | number;
    Ort?: string;
    Bundesland?: string;
    Land?: string;
    Breitengrad?: string;
    Längengrad?: string;
    Telefon?: string;
    Telefax?: string;
    'E-Mail'?: string;
    Internetadresse?: string;
    IstRessort?: boolean;
    IstVerfassungsorgan?: boolean;
    locations?: EntityLocation[];
    budgetMatch?: BudgetMatch;
    budgetAmount?: number;
    personalhaushalt?: PersonalhaushaltEntry;
    hasWikidata?: boolean;
    wikidata?: WikidataEntity;
}

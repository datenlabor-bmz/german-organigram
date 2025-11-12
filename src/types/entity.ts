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

export interface Entity {
    OrganisationId: string | number;
    Organisation: string;
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
}

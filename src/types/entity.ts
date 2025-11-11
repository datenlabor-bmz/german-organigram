export interface EntityLocation {
    Hauptadresse: string;
    PLZ: string;
    Ort: string;
    Bundesland: string;
    Telefon: string;
    Telefax: string;
    'E-Mail': string;
}

export interface Entity {
    OrganisationId: string;
    Organisation: string;
    OrganisationKurz: string;
    OrganisationKurzInoffiziell?: string;
    Ressort: string;
    Hauptadresse: string;
    PLZ: string;
    Ort: string;
    Bundesland: string;
    Land: string;
    Breitengrad: string;
    Längengrad: string;
    Telefon: string;
    Telefax: string;
    'E-Mail': string;
    Internetadresse: string;
    locations?: EntityLocation[];
}

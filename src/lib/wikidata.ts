import wikidataRaw from '../../public/wikidata.json';

interface WikidataEntity {
    qid: string;
    data: {
        labels?: Record<string, { value: string }>;
        descriptions?: Record<string, { value: string }>;
        sitelinks?: Record<string, { title: string; url?: string }>;
        claims?: Record<string, any[]>;
    };
    referenced_entities?: Record<string, {
        labels?: Record<string, { value: string }>;
        descriptions?: Record<string, { value: string }>;
        claims?: Record<string, any[]>;
    }>;
}

const wikidata = wikidataRaw as Record<string, WikidataEntity>;

export const getWikidataForEntity = (orgId: string | number): WikidataEntity | null => {
    return wikidata[String(orgId)] || null;
};

export const getWikidataLabel = (wd: WikidataEntity, lang: 'de' | 'en' = 'de'): string | null => {
    return wd.data.labels?.[lang]?.value || null;
};

export const getWikidataDescription = (wd: WikidataEntity, lang: 'de' | 'en' = 'de'): string | null => {
    return wd.data.descriptions?.[lang]?.value || null;
};

export const getWikidataImage = (wd: WikidataEntity): string | null => {
    const claim = wd.data.claims?.['P18']?.[0];
    if (!claim?.mainsnak?.datavalue?.value) return null;
    const filename = claim.mainsnak.datavalue.value;
    // Convert to Wikimedia Commons URL
    const encodedFilename = encodeURIComponent(filename.replace(/ /g, '_'));
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFilename}?width=800`;
};

export const getWikidataLogo = (wd: WikidataEntity): string | null => {
    const claim = wd.data.claims?.['P154']?.[0];
    if (!claim?.mainsnak?.datavalue?.value) return null;
    const filename = claim.mainsnak.datavalue.value;
    const encodedFilename = encodeURIComponent(filename.replace(/ /g, '_'));
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFilename}?width=400`;
};

export const getWikidataInception = (wd: WikidataEntity): string | null => {
    const claim = wd.data.claims?.['P571']?.[0];
    if (!claim?.mainsnak?.datavalue?.value?.time) return null;
    const time = claim.mainsnak.datavalue.value.time;
    // Parse time format like "+1917-00-00T00:00:00Z"
    const match = time.match(/\+?(\d{4})/);
    return match ? match[1] : null;
};

export const getWikidataWebsite = (wd: WikidataEntity): string | null => {
    const claim = wd.data.claims?.['P856']?.[0];
    return claim?.mainsnak?.datavalue?.value || null;
};

export const getWikidataWikipediaLink = (wd: WikidataEntity, lang: 'de' | 'en' = 'de'): string | null => {
    const sitelink = wd.data.sitelinks?.[`${lang}wiki`];
    if (!sitelink) return null;
    const title = sitelink.title.replace(/ /g, '_');
    return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
};

export const getWikidataSocialMedia = (wd: WikidataEntity): {
    twitter?: { url: string; followers?: number };
    facebook?: { url: string; followers?: number };
    instagram?: { url: string; followers?: number };
    youtube?: { url: string; followers?: number };
    linkedin?: { url: string; followers?: number };
    bluesky?: { url: string; followers?: number };
} => {
    const twitter = wd.data.claims?.['P2002']?.[0]?.mainsnak?.datavalue?.value;
    const facebook = wd.data.claims?.['P2013']?.[0]?.mainsnak?.datavalue?.value;
    const instagram = wd.data.claims?.['P2003']?.[0]?.mainsnak?.datavalue?.value;
    const youtube = wd.data.claims?.['P2397']?.[0]?.mainsnak?.datavalue?.value;
    const linkedin = wd.data.claims?.['P4264']?.[0]?.mainsnak?.datavalue?.value;
    const bluesky = wd.data.claims?.['P12361']?.[0]?.mainsnak?.datavalue?.value;
    
    // Get follower counts from P8687
    const followers: Record<string, number> = {};
    const followerClaims = wd.data.claims?.['P8687'] || [];
    
    for (const claim of followerClaims) {
        const amount = claim.mainsnak?.datavalue?.value?.amount;
        if (!amount) continue;
        
        const qualifiers = claim.qualifiers || {};
        const count = parseInt(amount.replace('+', ''));
        
        // Map qualifier properties to platform names
        if ('P6552' in qualifiers) followers['twitter'] = Math.max(followers['twitter'] || 0, count);
        if ('P2397' in qualifiers) followers['youtube'] = Math.max(followers['youtube'] || 0, count);
        if ('P2003' in qualifiers) followers['instagram'] = Math.max(followers['instagram'] || 0, count);
        if ('P2013' in qualifiers) followers['facebook'] = Math.max(followers['facebook'] || 0, count);
        if ('P4264' in qualifiers) followers['linkedin'] = Math.max(followers['linkedin'] || 0, count);
        if ('P12361' in qualifiers) followers['bluesky'] = Math.max(followers['bluesky'] || 0, count);
    }
    
    return {
        twitter: twitter ? { url: `https://twitter.com/${twitter}`, followers: followers['twitter'] } : undefined,
        facebook: facebook ? { url: `https://facebook.com/${facebook}`, followers: followers['facebook'] } : undefined,
        instagram: instagram ? { url: `https://instagram.com/${instagram}`, followers: followers['instagram'] } : undefined,
        youtube: youtube ? { url: `https://youtube.com/channel/${youtube}`, followers: followers['youtube'] } : undefined,
        linkedin: linkedin ? { url: `https://linkedin.com/company/${linkedin}`, followers: followers['linkedin'] } : undefined,
        bluesky: bluesky ? { url: `https://bsky.app/profile/${bluesky}`, followers: followers['bluesky'] } : undefined,
    };
};

export const getWikidataUrl = (qid: string): string => {
    return `https://www.wikidata.org/wiki/${qid}`;
};

export const getWikidataEmployeeCount = (wd: WikidataEntity): { count: number; date?: string } | null => {
    const claim = wd.data.claims?.['P1128']?.[0];
    if (!claim?.mainsnak?.datavalue?.value?.amount) return null;
    
    const count = parseInt(claim.mainsnak.datavalue.value.amount);
    const dateQualifier = claim.qualifiers?.['P585']?.[0];
    const date = dateQualifier?.datavalue?.value?.time;
    
    // Parse date like "+2024-06-16T00:00:00Z" to "2024"
    const year = date ? date.match(/\+?(\d{4})/)?.[1] : undefined;
    
    return { count, date: year };
};

export const getWikidataCurrentLeader = (wd: WikidataEntity): { 
    name: string; 
    since?: string; 
    qid: string;
    party?: string;
    gender?: string;
    birthDate?: string;
    age?: number;
    image?: string;
    description?: string;
} | null => {
    const claims = wd.data.claims?.['P488'];
    if (!claims) return null;
    
    // Find current leader (no end date or most recent)
    for (const claim of claims) {
        const endDateQualifier = claim.qualifiers?.['P582'];
        
        // Skip if there's an end date (past leader)
        if (endDateQualifier) continue;
        
        const entityId = claim.mainsnak?.datavalue?.value?.id;
        if (!entityId) continue;
        
        const leaderEntity = wd.referenced_entities?.[entityId];
        if (!leaderEntity) continue;
        
        const name = leaderEntity.labels?.['de']?.value;
        if (!name) continue;
        
        const description = leaderEntity.descriptions?.['de']?.value;
        
        // Get start date
        const startDateQualifier = claim.qualifiers?.['P580']?.[0];
        const startDate = startDateQualifier?.datavalue?.value?.time;
        const sinceYear = startDate ? startDate.match(/\+?(\d{4})/)?.[1] : undefined;
        
        // Get party (P102)
        const leaderClaims = leaderEntity.claims || {};
        let party: string | undefined;
        const partyClaim = leaderClaims['P102']?.[0];
        if (partyClaim?.mainsnak?.datavalue?.value?.id) {
            const partyId = partyClaim.mainsnak.datavalue.value.id;
            party = wd.referenced_entities?.[partyId]?.labels?.['de']?.value;
        }
        
        // Get gender (P21)
        let gender: string | undefined;
        const genderClaim = leaderClaims['P21']?.[0];
        if (genderClaim?.mainsnak?.datavalue?.value?.id) {
            const genderId = genderClaim.mainsnak.datavalue.value.id;
            const genderLabel = wd.referenced_entities?.[genderId]?.labels?.['de']?.value;
            // Convert to shorter form
            if (genderLabel === 'männlich') gender = 'm';
            else if (genderLabel === 'weiblich') gender = 'w';
            else if (genderLabel === 'divers') gender = 'd';
        }
        
        // Get birth date (P569)
        let birthDate: string | undefined;
        let age: number | undefined;
        const birthClaim = leaderClaims['P569']?.[0];
        if (birthClaim?.mainsnak?.datavalue?.value?.time) {
            const time = birthClaim.mainsnak.datavalue.value.time;
            const match = time.match(/\+?(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]);
                const day = parseInt(match[3]);
                birthDate = `${day}.${month}.${year}`;
                
                // Calculate age
                const today = new Date();
                const birthDateObj = new Date(year, month - 1, day);
                age = today.getFullYear() - birthDateObj.getFullYear();
                const monthDiff = today.getMonth() - birthDateObj.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
                    age--;
                }
            }
        }
        
        // Get image (P18)
        let image: string | undefined;
        const imageClaim = leaderClaims['P18']?.[0];
        if (imageClaim?.mainsnak?.datavalue?.value) {
            const filename = imageClaim.mainsnak.datavalue.value;
            const encodedFilename = encodeURIComponent(filename.replace(/ /g, '_'));
            image = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFilename}?width=400`;
        }
        
        return { 
            name, 
            since: sinceYear, 
            qid: entityId,
            party,
            gender,
            birthDate,
            age,
            image,
            description
        };
    }
    
    return null;
};

// Organizational structure helpers (fetched but not yet displayed)
export const getWikidataParentOrganization = (wd: WikidataEntity): { name: string; qid: string } | null => {
    const claim = wd.data.claims?.['P749']?.[0];
    if (!claim) return null;
    
    const entityId = claim.mainsnak?.datavalue?.value?.id;
    if (!entityId) return null;
    
    const parentEntity = wd.referenced_entities?.[entityId];
    const name = parentEntity?.labels?.['de']?.value;
    
    return name ? { name, qid: entityId } : null;
};

export const getWikidataSubsidiaries = (wd: WikidataEntity): Array<{ name: string; qid: string }> => {
    const claims = wd.data.claims?.['P355'];
    if (!claims) return [];
    
    return claims
        .map(claim => {
            const entityId = claim.mainsnak?.datavalue?.value?.id;
            if (!entityId) return null;
            
            const subEntity = wd.referenced_entities?.[entityId];
            const name = subEntity?.labels?.['de']?.value;
            
            return name ? { name, qid: entityId } : null;
        })
        .filter((item): item is { name: string; qid: string } => item !== null);
};

export const getWikidataPartOf = (wd: WikidataEntity): Array<{ name: string; qid: string }> => {
    const claims = wd.data.claims?.['P361'];
    if (!claims) return [];
    
    return claims
        .map(claim => {
            const entityId = claim.mainsnak?.datavalue?.value?.id;
            if (!entityId) return null;
            
            const partOfEntity = wd.referenced_entities?.[entityId];
            const name = partOfEntity?.labels?.['de']?.value;
            
            return name ? { name, qid: entityId } : null;
        })
        .filter((item): item is { name: string; qid: string } => item !== null);
};

export const getWikidataHasParts = (wd: WikidataEntity): Array<{ name: string; qid: string }> => {
    const claims = wd.data.claims?.['P527'];
    if (!claims) return [];
    
    return claims
        .map(claim => {
            const entityId = claim.mainsnak?.datavalue?.value?.id;
            if (!entityId) return null;
            
            const partEntity = wd.referenced_entities?.[entityId];
            const name = partEntity?.labels?.['de']?.value;
            
            return name ? { name, qid: entityId } : null;
        })
        .filter((item): item is { name: string; qid: string } => item !== null);
};

export const getWikidataInstanceOf = (wd: WikidataEntity): string | null => {
    const claim = wd.data.claims?.['P31']?.[0];
    if (!claim) return null;
    
    const entityId = claim.mainsnak?.datavalue?.value?.id;
    if (!entityId) return null;
    
    const instanceEntity = wd.referenced_entities?.[entityId];
    return instanceEntity?.labels?.['de']?.value || null;
};

export const getWikidataEmail = (wd: WikidataEntity): string | null => {
    const claim = wd.data.claims?.['P968']?.[0];
    if (!claim?.mainsnak?.datavalue?.value) return null;
    
    const email = claim.mainsnak.datavalue.value;
    // Remove "mailto:" prefix if present
    return email.replace('mailto:', '');
};

export const getWikidataBudget = (wd: WikidataEntity): { amount: number; currency: string; year?: string } | null => {
    const claim = wd.data.claims?.['P2769']?.[0];
    if (!claim?.mainsnak?.datavalue?.value?.amount) return null;
    
    const amount = parseFloat(claim.mainsnak.datavalue.value.amount.replace('+', ''));
    const unit = claim.mainsnak.datavalue.value.unit;
    
    // Extract year from qualifiers if available
    const dateQualifier = claim.qualifiers?.['P585']?.[0];
    const date = dateQualifier?.datavalue?.value?.time;
    const year = date ? date.match(/\+?(\d{4})/)?.[1] : undefined;
    
    // Determine currency from unit (Q4916 is Euro)
    const currency = unit?.includes('Q4916') ? '€' : '';
    
    return { amount, currency, year };
};

export const getWikidataReplaces = (wd: WikidataEntity): { name: string; qid: string } | null => {
    const claim = wd.data.claims?.['P1365']?.[0];
    if (!claim) return null;
    
    const entityId = claim.mainsnak?.datavalue?.value?.id;
    if (!entityId) return null;
    
    const replacedEntity = wd.referenced_entities?.[entityId];
    const name = replacedEntity?.labels?.['de']?.value;
    
    return name ? { name, qid: entityId } : null;
};

export const getWikidataReplacedBy = (wd: WikidataEntity): { name: string; qid: string } | null => {
    const claim = wd.data.claims?.['P1366']?.[0];
    if (!claim) return null;
    
    const entityId = claim.mainsnak?.datavalue?.value?.id;
    if (!entityId) return null;
    
    const successorEntity = wd.referenced_entities?.[entityId];
    const name = successorEntity?.labels?.['de']?.value;
    
    return name ? { name, qid: entityId } : null;
};


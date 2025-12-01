#!/usr/bin/env python3
"""Fetch German organization data exclusively from Wikidata."""

import json
import re
import asyncio
from pathlib import Path
import httpx
from tqdm.asyncio import tqdm_asyncio
from unicodedata import normalize

# Hardcoded QIDs for Oberste Bundesbehörden and Ministerien
TOP_LEVEL_QIDS = [
    "Q56034",      # Auswärtiges Amt
    "Q813386",     # Bundesministerium für Arbeit und Soziales
    "Q1005821",    # Bundesnachrichtendienst
    "Q317027",     # Bundeskanzleramt
    "Q499118",     # Bundesministerium der Finanzen
    "Q498251",     # Bundesministerium der Justiz
    "Q493353",     # Bundesministerium der Verteidigung
    "Q502698",     # Bundesministerium des Innern
    "Q491578",     # Bundesministerium für Arbeit und Soziales
    "Q166020",     # Bundesministerium für Familie, Senioren, Frauen und Jugend
    "Q133894806",  # Bundesministerium für Digitales und Staatsmodernisierung
    "Q492234",     # Bundesministerium für Atomfragen
    "Q491566",     # Bundesministerium für Gesundheit
    "Q699656",     # Bundesministerium für Ernährung und Landwirtschaft
    "Q493344",     # Bundesministerium für Umwelt
    "Q491637",     # Bundesministerium für Verkehr
    "Q488589",     # Bundesministerium für Wirtschaft
    "Q684357",     # Bundesministerium für wirtschaftliche Zusammenarbeit
    "Q110021824",  # Bundesministerium für Wohnen, Stadtentwicklung und Bauwesen
    "Q470470",     # Bundespräsidialamt
    "Q56033",      # Bundesrechnungshof
    "Q162222",     # Bundesverfassungsgericht
    "Q869805",     # Bundesgerichtshof
    "Q106676433",  # Die Bundesbeauftragte für den Datenschutz und die Informationsfreiheit
    "Q131195546",  # Bundeswahlleiter
]

async def query_wikidata_sparql(query: str) -> list:
    """Execute SPARQL query on Wikidata."""
    headers = {
        "User-Agent": "GermanOrganigramBot/1.0 (https://github.com/yourrepo; contact@example.com)",
        "Accept": "application/json"
    }
    url = "https://query.wikidata.org/sparql"
    
    async with httpx.AsyncClient(timeout=60.0, headers=headers) as client:
        try:
            response = await client.get(url, params={"query": query, "format": "json"})
            response.raise_for_status()
            data = response.json()
            return data.get("results", {}).get("bindings", [])
        except Exception as e:
            print(f"Error querying Wikidata SPARQL: {e}")
            return []

async def fetch_wikidata_entity(qid: str) -> dict:
    """Fetch full Wikidata entity information."""
    headers = {
        "User-Agent": "GermanOrganigramBot/1.0 (https://github.com/yourrepo; contact@example.com)"
    }
    async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
        try:
            response = await client.get(
                "https://www.wikidata.org/w/api.php",
                params={
                    "action": "wbgetentities",
                    "format": "json",
                    "ids": qid,
                    "languages": "de|en",
                    "props": "labels|descriptions|claims|sitelinks",
                }
            )
            data = response.json()
            return data.get("entities", {}).get(qid, {})
        except Exception as e:
            print(f"Error fetching {qid}: {e}")
            return {}

async def resolve_entity_references(entity_data: dict) -> dict:
    """Resolve entity references in claims to get their labels."""
    claims = entity_data.get('claims', {})
    referenced_entities = {}
    
    # Properties that reference other entities
    entity_props = {
        'P488': 'chairperson',
        'P1037': 'director_manager',
        'P1308': 'officeholder',
        'P3975': 'secretary_general',
        'P169': 'chief_executive_officer',
        'P749': 'parent_organization',
        'P355': 'subsidiary',
        'P361': 'part_of',
        'P527': 'has_part',
        'P31': 'instance_of',
        'P1365': 'replaces',
        'P1366': 'replaced_by',
    }
    
    # Leadership properties that need full person data
    leadership_props = ['P488', 'P1037', 'P1308', 'P3975', 'P169']
    
    # Collect entity IDs
    minister_ids = set()
    org_entity_ids = set()
    
    for prop_id in entity_props.keys():
        if prop_id in claims:
            for statement in claims[prop_id]:
                if statement.get('mainsnak', {}).get('datavalue', {}).get('type') == 'wikibase-entityid':
                    entity_id = statement['mainsnak']['datavalue']['value']['id']
                    if prop_id in leadership_props:
                        minister_ids.add(entity_id)
                    else:
                        org_entity_ids.add(entity_id)
    
    headers = {
        "User-Agent": "GermanOrganigramBot/1.0 (https://github.com/yourrepo; contact@example.com)"
    }
    
    # Fetch ministers with full claims
    person_related_ids = set()
    if minister_ids:
        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            try:
                response = await client.get(
                    "https://www.wikidata.org/w/api.php",
                    params={
                        "action": "wbgetentities",
                        "format": "json",
                        "ids": "|".join(minister_ids),
                        "languages": "de|en",
                        "props": "labels|descriptions|claims",
                    }
                )
                data = response.json()
                minister_entities = data.get("entities", {})
                referenced_entities.update(minister_entities)
                
                # Collect person-related entity references
                for minister_entity in minister_entities.values():
                    minister_claims = minister_entity.get('claims', {})
                    for prop_id in ['P102', 'P21']:
                        if prop_id in minister_claims:
                            for statement in minister_claims[prop_id]:
                                if statement.get('mainsnak', {}).get('datavalue', {}).get('type') == 'wikibase-entityid':
                                    entity_id = statement['mainsnak']['datavalue']['value']['id']
                                    person_related_ids.add(entity_id)
            except Exception as e:
                print(f"Error fetching minister entities: {e}")
    
    # Fetch person-related entities
    if person_related_ids:
        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            try:
                response = await client.get(
                    "https://www.wikidata.org/w/api.php",
                    params={
                        "action": "wbgetentities",
                        "format": "json",
                        "ids": "|".join(person_related_ids),
                        "languages": "de|en",
                        "props": "labels|descriptions",
                    }
                )
                data = response.json()
                referenced_entities.update(data.get("entities", {}))
            except Exception as e:
                print(f"Error fetching person-related entities: {e}")
    
    # Fetch organizations with just labels/descriptions
    if org_entity_ids:
        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            try:
                response = await client.get(
                    "https://www.wikidata.org/w/api.php",
                    params={
                        "action": "wbgetentities",
                        "format": "json",
                        "ids": "|".join(org_entity_ids),
                        "languages": "de|en",
                        "props": "labels|descriptions",
                    }
                )
                data = response.json()
                referenced_entities.update(data.get("entities", {}))
            except Exception as e:
                print(f"Error fetching org entities: {e}")
    
    return referenced_entities

def get_claim_value(entity: dict, prop: str, value_type: str = "string"):
    """Extract claim value from Wikidata entity."""
    claims = entity.get("claims", {})
    if prop not in claims or not claims[prop]:
        return None
    
    statement = claims[prop][0]
    mainsnak = statement.get("mainsnak", {})
    datavalue = mainsnak.get("datavalue", {})
    
    if value_type == "string":
        value = datavalue.get("value")
        # If value is a dict with 'text' key (monolingual text), extract text
        if isinstance(value, dict) and 'text' in value:
            return value['text']
        return value
    elif value_type == "entityid":
        return datavalue.get("value", {}).get("id")
    elif value_type == "url":
        return datavalue.get("value")
    
    return None

def get_instance_of_labels(entity: dict, referenced_entities: dict) -> list:
    """Get instance-of type labels."""
    claims = entity.get("claims", {})
    if "P31" not in claims:
        return []
    
    types = []
    for statement in claims["P31"]:
        if statement.get('mainsnak', {}).get('datavalue', {}).get('type') == 'wikibase-entityid':
            type_id = statement['mainsnak']['datavalue']['value']['id']
            if type_id in referenced_entities:
                label = referenced_entities[type_id].get("labels", {}).get("de", {}).get("value")
                if label:
                    types.append(label)
    
    return types

def map_kategorie(instance_types: list, qids: list, org_label: str = "", org_qid: str = "") -> str:
    """Map Wikidata instance types to Kategorie."""
    # Check if it's a top-level organization
    if org_qid in TOP_LEVEL_QIDS:
        return "Oberste Bundesbehörde"
    
    # Check QIDs
    if "Q1518135" in qids:
        return "Oberste Bundesbehörde"
    if "Q812285" in qids:
        return "Oberste Bundesbehörde"
    
    # Check organization label
    label_lower = org_label.lower()
    if "bundesministerium" in label_lower:
        return "Oberste Bundesbehörde"
    if "bundeskanzleramt" in label_lower:
        return "Oberste Bundesbehörde"
    
    # Check type labels
    for type_label in instance_types:
        lower = type_label.lower()
        if "bundesministerium" in lower:
            return "Oberste Bundesbehörde"
        if "bundesanstalt" in lower:
            return "Bundesanstalt"
        if "bundesamt" in lower:
            return "Bundesamt"
        if "oberste bundesbehörde" in lower or "oberste bundesbehorde" in lower:
            return "Oberste Bundesbehörde"
    
    return "Sonstige"

def get_parent_org(entity: dict) -> str | None:
    """Get parent organization QID."""
    claims = entity.get("claims", {})
    
    # Try P749 (parent organization) first
    if "P749" in claims and claims["P749"]:
        statement = claims["P749"][0]
        if statement.get('mainsnak', {}).get('datavalue', {}).get('type') == 'wikibase-entityid':
            return statement['mainsnak']['datavalue']['value']['id']
    
    # Try P361 (part of)
    if "P361" in claims and claims["P361"]:
        statement = claims["P361"][0]
        if statement.get('mainsnak', {}).get('datavalue', {}).get('type') == 'wikibase-entityid':
            return statement['mainsnak']['datavalue']['value']['id']
    
    return None

def sanitize_filename(org_data: dict) -> str:
    """Create a descriptive, URL-safe filename from organization data."""
    name = org_data.get('OrganisationKurz') or org_data.get('Organisation') or org_data.get('OrganisationDisplay') or 'org'
    
    # Ensure name is a string
    if not isinstance(name, str):
        name = str(name)
    
    # Normalize unicode characters
    name = normalize('NFKD', name).encode('ASCII', 'ignore').decode('ASCII')
    
    # Convert to lowercase and replace spaces/special chars with hyphens
    name = re.sub(r'[^\w\s-]', '', name.lower())
    name = re.sub(r'[-\s]+', '-', name).strip('-')
    
    # Limit length and add org ID to ensure uniqueness
    name = name[:50]
    if org_data.get('OrganisationId'):
        return f"{name}-{org_data['OrganisationId']}"
    else:
        return name

async def get_subordinate_qids(parent_qid: str) -> list[str]:
    """Get QIDs of organizations that have parent_qid as their parent."""
    # Add delay to avoid rate limiting
    await asyncio.sleep(0.1)
    
    query = f"""
    SELECT DISTINCT ?org WHERE {{
      {{ ?org wdt:P749 wd:{parent_qid} . }}  # parent organization
      UNION
      {{ ?org wdt:P361 wd:{parent_qid} . }}  # part of
    }}
    """
    results = await query_wikidata_sparql(query)
    
    qids = []
    for result in results:
        org_uri = result.get("org", {}).get("value", "")
        qid = org_uri.split("/")[-1]
        if qid.startswith("Q"):
            qids.append(qid)
    
    return qids

async def main():
    # Start with hardcoded top-level organizations
    print(f"🔍 Starting with {len(TOP_LEVEL_QIDS)} top-level Oberste Bundesbehörden...")
    
    # Recursively fetch all subordinate organizations
    all_qids = set(TOP_LEVEL_QIDS)
    to_process = list(TOP_LEVEL_QIDS)
    processed = set()
    level = 0
    
    while to_process:
        level += 1
        print(f"\n📊 Level {level}: Processing {len(to_process)} organizations...")
        
        # Get subordinates for all organizations at this level
        subordinate_tasks = [get_subordinate_qids(qid) for qid in to_process]
        subordinates_list = await tqdm_asyncio.gather(*subordinate_tasks)
        
        # Collect new QIDs
        new_qids = set()
        for qid, subordinates in zip(to_process, subordinates_list):
            processed.add(qid)
            for sub_qid in subordinates:
                if sub_qid not in all_qids:
                    new_qids.add(sub_qid)
                    all_qids.add(sub_qid)
        
        print(f"  ✓ Found {len(new_qids)} new subordinate organizations")
        
        # Process next level
        to_process = [qid for qid in new_qids if qid not in processed]
    
    qids = list(all_qids)
    print(f"\n✓ Total organizations (including all subordinates): {len(qids)}")
    
    # Fetch full entity data
    print("\n📥 Fetching Wikidata entity data...")
    entity_tasks = [fetch_wikidata_entity(qid) for qid in qids]
    entities = await tqdm_asyncio.gather(*entity_tasks)
    
    # Resolve entity references
    print("🔗 Resolving entity references...")
    reference_tasks = [resolve_entity_references(entity) for entity in entities if entity]
    referenced_entities_list = await tqdm_asyncio.gather(*reference_tasks)
    
    # Build organization data
    print("\n🏗️  Building organization data...")
    org_data_map = {}
    qid_to_org = {}
    
    for qid, entity, referenced_entities in zip(qids, entities, referenced_entities_list):
        if not entity:
            continue
        
        # Extract basic info
        label_de = entity.get("labels", {}).get("de", {}).get("value")
        label_en = entity.get("labels", {}).get("en", {}).get("value")
        label = label_de or label_en or qid
        
        short_name = get_claim_value(entity, "P1813", "string")
        website = get_claim_value(entity, "P856", "url")
        
        # Get instance types
        instance_type_qids = []
        claims = entity.get("claims", {})
        if "P31" in claims:
            for statement in claims["P31"]:
                if statement.get('mainsnak', {}).get('datavalue', {}).get('type') == 'wikibase-entityid':
                    instance_type_qids.append(statement['mainsnak']['datavalue']['value']['id'])
        
        instance_types = get_instance_of_labels(entity, referenced_entities)
        kategorie = map_kategorie(instance_types, instance_type_qids, label, qid)
        
        # Check if it's a top-level Oberste Bundesbehörde
        is_top_level = qid in TOP_LEVEL_QIDS
        
        # Also check if it's a ministry by type or label
        is_ministry = (
            is_top_level or
            "Q1518135" in instance_type_qids or  # Direct Bundesministerium QID
            "bundesministerium" in label.lower() or  # Label contains Bundesministerium
            any("bundesministerium" in t.lower() for t in instance_types)  # Type label contains it
        )
        
        # Get parent organization
        parent_qid = get_parent_org(entity)
        
        # Build org entry
        org_id = int(qid[1:])  # Remove 'Q' prefix
        org_entry = {
            "Organisation": label,
            "OrganisationId": org_id,
            "OrganisationKurz": short_name,
            "OrganisationDisplay": short_name or label,
            "Kategorie": kategorie,
            "Internetadresse": website,
            "IstRessort": is_ministry,
            "Versteckt": False,
            "_qid": qid,
            "_parent_qid": parent_qid,
        }
        
        org_data_map[qid] = org_entry
        qid_to_org[qid] = org_entry
    
    # Fetch parent organizations for Ressort assignment
    print("🔗 Fetching parent organizations for Ressort assignment...")
    parent_qids_to_fetch = set()
    for org_entry in org_data_map.values():
        if org_entry["Kategorie"] != "Oberste Bundesbehörde" and org_entry.get("_parent_qid"):
            parent_qid = org_entry["_parent_qid"]
            if parent_qid not in qid_to_org:
                parent_qids_to_fetch.add(parent_qid)
    
    # Fetch missing parent entities
    if parent_qids_to_fetch:
        print(f"  Fetching {len(parent_qids_to_fetch)} parent organizations...")
        parent_tasks = [fetch_wikidata_entity(qid) for qid in parent_qids_to_fetch]
        parent_entities = await tqdm_asyncio.gather(*parent_tasks)
        
        # Add parents to qid_to_org map
        for parent_qid, parent_entity in zip(parent_qids_to_fetch, parent_entities):
            if not parent_entity:
                continue
            
            label = parent_entity.get("labels", {}).get("de", {}).get("value") or parent_entity.get("labels", {}).get("en", {}).get("value") or parent_qid
            short_name = get_claim_value(parent_entity, "P1813", "string")
            
            # Check instance types
            instance_type_qids = []
            claims = parent_entity.get("claims", {})
            if "P31" in claims:
                for statement in claims["P31"]:
                    if statement.get('mainsnak', {}).get('datavalue', {}).get('type') == 'wikibase-entityid':
                        instance_type_qids.append(statement['mainsnak']['datavalue']['value']['id'])
            
            kategorie = "Oberste Bundesbehörde" if (parent_qid in TOP_LEVEL_QIDS or "bundesministerium" in label.lower() or "Q1518135" in instance_type_qids or "Q812285" in instance_type_qids) else "Sonstige"
            parent_parent_qid = get_parent_org(parent_entity)
            
            qid_to_org[parent_qid] = {
                "OrganisationKurz": short_name,
                "Organisation": label,
                "Kategorie": kategorie,
                "_parent_qid": parent_parent_qid
            }
    
    # Determine Ressort (parent ministry) with recursive lookup
    print("🔗 Determining Ressort assignments...")
    def find_ressort(org_qid: str, visited: set) -> str | None:
        """Recursively find the Ressort by traversing up the hierarchy."""
        if org_qid in visited:
            return None
        visited.add(org_qid)
        
        if org_qid not in qid_to_org:
            return None
        
        org = qid_to_org[org_qid]
        if org["Kategorie"] == "Oberste Bundesbehörde":
            return org.get("OrganisationKurz") or org.get("Organisation")
        
        parent_qid = org.get("_parent_qid")
        if parent_qid:
            return find_ressort(parent_qid, visited)
        
        return None
    
    for qid, org_entry in org_data_map.items():
        if org_entry["Kategorie"] == "Oberste Bundesbehörde":
            # All Oberste Bundesbehörde have their own Ressort
            org_entry["Ressort"] = org_entry["OrganisationKurz"] or org_entry["Organisation"]
        else:
            # Find parent Oberste Bundesbehörde recursively
            ressort = find_ressort(qid, set())
            org_entry["Ressort"] = ressort
    
    # Clean up temporary fields
    for org_entry in org_data_map.values():
        org_entry.pop("_qid", None)
        org_entry.pop("_parent_qid", None)
    
    output_data = list(org_data_map.values())
    
    # Fetch full Wikidata data for each organization
    print("\n📥 Fetching full Wikidata data with references...")
    wikidata_map = {}
    for (qid, entity, referenced_entities) in zip(qids, entities, referenced_entities_list):
        if entity:
            wikidata_map[str(int(qid[1:]))] = {
                "qid": qid,
                "data": entity,
                "referenced_entities": referenced_entities
            }
    
    # Create output directory for individual org files
    org_dir = Path(__file__).parent.parent / "public" / "organizations"
    org_dir.mkdir(exist_ok=True)
    
    # Build index and individual files
    print("\n📦 Building organization index and individual files...")
    index = []
    org_count = 0
    
    for org_entry in output_data:
        org_id = org_entry.get('OrganisationId')
        org_name = org_entry.get('Organisation')
        
        if not org_name:
            continue
        
        # Add to index
        index_entry = {
            "Organisation": org_name,
            "OrganisationId": org_id,
            "OrganisationDisplay": org_entry.get("OrganisationDisplay"),
            "OrganisationKurz": org_entry.get("OrganisationKurz"),
            "Kategorie": org_entry.get("Kategorie"),
            "Ressort": org_entry.get("Ressort"),
            "Versteckt": org_entry.get("Versteckt", False),
            "hasWikidata": True,
        }
        index.append(index_entry)
        
        # Create full org file
        full_org_data = {
            **org_entry,
            "locations": [org_entry],
        }
        
        # Add Wikidata if available
        if org_id and str(org_id) in wikidata_map:
            full_org_data["wikidata"] = wikidata_map[str(org_id)]
        
        # Write individual org file
        filename = sanitize_filename(org_entry)
        org_file_path = org_dir / f"{filename}.json"
        with open(org_file_path, "w", encoding="utf-8") as f:
            json.dump(full_org_data, f, ensure_ascii=False, indent=2)
        
        org_count += 1
    
    # Write index file
    index_path = Path(__file__).parent.parent / "public" / "organizations-index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Created organization index with {len(index)} entries → {index_path}")
    print(f"✓ Created {org_count} individual organization files → {org_dir}/")

if __name__ == "__main__":
    asyncio.run(main())


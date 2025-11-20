#!/usr/bin/env python3
"""Fetch German organization data from Airtable and aggregate Dienstorte."""

import os
import json
import re
import asyncio
from pathlib import Path
from collections import defaultdict
from pyairtable import Api
from dotenv import load_dotenv
import httpx
from tqdm.asyncio import tqdm_asyncio

load_dotenv()

api = Api(os.environ["AIRTABLE_API_KEY"])
BASE_ID = os.environ["AIRTABLE_BASE_ID"]
TABLE_ID = os.environ["AIRTABLE_TABLE_ID"]

table = api.table(BASE_ID, TABLE_ID)
records = table.all()

if not records:
    raise ValueError("No records found in Airtable")

# Extract fields from records
data = [record["fields"] for record in records]

# Aggregate Dienstorte
# Group entries with "(Dienstort XYZ)" or "(Diensort XYZ)" by their base name
# Also handle cases where Dienstort is part of the name itself (not in parentheses)
dienstort_pattern = re.compile(r'\s*\(Dien(?:st|s)ort\s+([^)]+)\)|\-Dienstort\-([^\-\s]+)')

dienstort_by_base = defaultdict(list)
regular_entries = []

for entry in data:
    display = entry.get('OrganisationDisplay', '')
    match = dienstort_pattern.search(display)
    
    if match:
        base_name = dienstort_pattern.sub('', display).strip()
        # Extract location from either group 1 or 2 (depending on which pattern matched)
        dienstort_location = match.group(1) if match.group(1) else match.group(2)
        entry['_dienstort_location'] = dienstort_location
        dienstort_by_base[base_name].append(entry)
    else:
        regular_entries.append(entry)

# Process aggregated Dienstorte
aggregated = []
for base_name, entries in dienstort_by_base.items():
    if len(entries) == 1:
        # Only one Dienstort - use base name without Dienstort suffix
        entry = entries[0].copy()
        entry['OrganisationDisplay'] = base_name
        entry['Organisation'] = dienstort_pattern.sub('', entry.get('Organisation', '')).strip()
        entry.pop('_dienstort_location', None)
        aggregated.append(entry)
    else:
        # Multiple Dienstorte - create main entry + location entries
        # Use the first entry as the base (with cleaned name)
        main_entry = entries[0].copy()
        main_entry['OrganisationDisplay'] = base_name
        main_entry['Organisation'] = dienstort_pattern.sub('', main_entry.get('Organisation', '')).strip()
        main_entry.pop('_dienstort_location', None)
        aggregated.append(main_entry)
        
        # Add other Dienstorte as separate location entries (with LiegenschaftsId)
        for i, entry in enumerate(entries[1:], 1):
            location_entry = entry.copy()
            # Mark as liegenschaft so frontend treats it as location data
            location_entry['LiegenschaftsId'] = f"DIENSTORT_{entry['OrganisationId']}_{i}"
            location_entry['Liegenschaft'] = f"Dienstort {entry['_dienstort_location']}"
            # Keep same OrganisationId to group them
            location_entry['OrganisationId'] = main_entry['OrganisationId']
            # Clear the Organisation name so it's not shown as a tile
            location_entry.pop('Organisation', None)
            location_entry.pop('OrganisationDisplay', None)
            location_entry.pop('_dienstort_location', None)
            aggregated.append(location_entry)

# Combine regular and aggregated entries
output_data = regular_entries + aggregated

# Fix Ressort for Oberste Bundesbehörde entities without a Ressort
# These should have their own sections (Ressort = OrganisationKurz or unique identifier)
for entry in output_data:
    if entry.get('Kategorie') == 'Oberste Bundesbehörde' and not entry.get('Ressort'):
        kurz = entry.get('OrganisationKurz')
        if kurz:
            entry['Ressort'] = kurz
        else:
            # For entities without OrganisationKurz, use OrganisationId as Ressort
            # (e.g., Verwaltung des Deutschen Bundestages, Sekretariat des Bundesrates)
            entry['Ressort'] = f"ORG_{entry.get('OrganisationId')}"

# Add metadata header
output = [
    {
        "source": "airtable",
        "owner": "German Organigram",
        "creationDate": "",
        "amount": f"{len(regular_entries) + len(dienstort_by_base)} Authorities / Institutions"
    }
]
output.extend(output_data)

# Write to public folder
output_path = Path(__file__).parent.parent / "public" / "anschriftenverzeichnis.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"✓ Fetched {len(data)} records from Airtable")
print(f"✓ Aggregated {sum(1 for entries in dienstort_by_base.values() if len(entries) > 1)} organizations with multiple Dienstorte")
print(f"✓ Total organizations: {len(regular_entries) + len(dienstort_by_base)}")
print(f"✓ Saved to {output_path}")

# Fetch Wikidata information
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
        'P488': 'chairperson',  # current minister/director - needs full data
        'P1308': 'officeholder',
        'P749': 'parent_organization',
        'P355': 'subsidiary',
        'P361': 'part_of',
        'P527': 'has_part',
        'P31': 'instance_of',
        'P1365': 'replaces',  # organizational history
        'P1366': 'replaced_by',
    }
    
    # Collect entity IDs - separate ministers (need full data) from others (just labels)
    minister_ids = set()
    org_entity_ids = set()
    
    for prop_id in entity_props.keys():
        if prop_id in claims:
            for statement in claims[prop_id]:
                if statement.get('mainsnak', {}).get('datavalue', {}).get('type') == 'wikibase-entityid':
                    entity_id = statement['mainsnak']['datavalue']['value']['id']
                    if prop_id == 'P488':  # Minister/chairperson - get full data
                        minister_ids.add(entity_id)
                    else:  # Organizations - just labels
                        org_entity_ids.add(entity_id)
    
    headers = {
        "User-Agent": "GermanOrganigramBot/1.0 (https://github.com/yourrepo; contact@example.com)"
    }
    
    # Fetch ministers with full claims (party, gender, birth date, etc.)
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
                
                # Collect person-related entity references (party, gender)
                for minister_entity in minister_entities.values():
                    minister_claims = minister_entity.get('claims', {})
                    # P102: political party, P21: gender
                    for prop_id in ['P102', 'P21']:
                        if prop_id in minister_claims:
                            for statement in minister_claims[prop_id]:
                                if statement.get('mainsnak', {}).get('datavalue', {}).get('type') == 'wikibase-entityid':
                                    entity_id = statement['mainsnak']['datavalue']['value']['id']
                                    person_related_ids.add(entity_id)
            except Exception as e:
                print(f"Error fetching minister entities: {e}")
    
    # Fetch person-related entities (parties, gender values)
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

async def fetch_all_wikidata():
    """Fetch Wikidata information for organizations that have Wikidata IDs in Airtable."""
    wikidata_map = {}
    
    # Collect organizations with Wikidata IDs from Airtable
    print("\n📥 Fetching Wikidata entity data...")
    qid_map = {}
    for entry in output_data:
        wikidata_id = entry.get("Wikidata ID")
        org_id = entry.get("OrganisationId")
        if wikidata_id and org_id:
            qid_map[org_id] = wikidata_id
    
    print(f"✓ Found {len(qid_map)} organizations with Wikidata IDs")
    
    # Fetch full entity data
    if qid_map:
        entity_tasks = [fetch_wikidata_entity(qid) for qid in qid_map.values()]
        entities = await tqdm_asyncio.gather(*entity_tasks)
        
        # Resolve entity references for all entities
        print("🔗 Resolving entity references (ministers, org structure)...")
        reference_tasks = [resolve_entity_references(entity) for entity in entities if entity]
        referenced_entities_list = await tqdm_asyncio.gather(*reference_tasks)
        
        for (org_id, qid), entity, referenced_entities in zip(qid_map.items(), entities, referenced_entities_list):
            if entity:
                wikidata_map[str(org_id)] = {
                    "qid": qid,
                    "data": entity,
                    "referenced_entities": referenced_entities
                }
    
    return wikidata_map

# Run async Wikidata fetching
wikidata_data = asyncio.run(fetch_all_wikidata())

# Write Wikidata data to separate file
wikidata_path = Path(__file__).parent.parent / "public" / "wikidata.json"
with open(wikidata_path, "w", encoding="utf-8") as f:
    json.dump(wikidata_data, f, ensure_ascii=False, indent=2)

print(f"✓ Saved Wikidata information for {len(wikidata_data)} organizations to {wikidata_path}")


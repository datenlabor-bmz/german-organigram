#!/usr/bin/env python3
"""Fetch German organization data from Airtable and aggregate Dienstorte."""

import os
import json
import re
from pathlib import Path
from collections import defaultdict
from pyairtable import Api
from dotenv import load_dotenv

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

# Fix BKM: Set Ressort for main BKM entity (OrganisationKurz="BKM")
for entry in output_data:
    if entry.get('OrganisationKurz') == 'BKM' and not entry.get('Ressort'):
        entry['Ressort'] = 'BKM'

# Tag Constitutional Bodies (Verfassungsorgane)
# The 5 main constitutional organs according to Grundgesetz:
# 1. Bundespräsident (Art. 54-61 GG)
# 2. Deutscher Bundestag (Art. 38-49 GG)
# 3. Bundesrat (Art. 50-53 GG)
# 4. Bundesregierung (Art. 62-69 GG) - already covered as ministries
# 5. Bundesverfassungsgericht (Art. 92-94 GG)
# Plus: Bundesrechnungshof (Art. 114 GG) - quasi-constitutional

# Actual Verfassungsorgane (will be highlighted in green)
actual_verfassungsorgane = [
    'BPr',      # Bundespräsident
    'BT',       # Deutscher Bundestag
    'BR',       # Bundesrat
    'BVerfG',   # Bundesverfassungsgericht
    'BRH',      # Bundesrechnungshof (quasi-constitutional)
]

# Supporting bodies (in Verfassungsorgane section but not highlighted)
supporting_bodies = [
    'WB',   # Wehrbeauftragte - ombudsman, not constitutional organ itself
    'TAB',  # Technikfolgenabschätzung - advisory body
]

supporting_org_names = [
    'Verwaltung des Deutschen Bundestages',  # Administrative support
    'Sekretariat des Bundesrates',           # Administrative support
]

for entry in output_data:
    kurz = entry.get('OrganisationKurz')
    org = entry.get('Organisation', '')
    
    # Actual constitutional organs (highlighted)
    if kurz in actual_verfassungsorgane:
        entry['IstVerfassungsorgan'] = True
        entry['Ressort'] = 'Verfassungsorgane'
    # Supporting bodies (section but not highlighted)
    elif kurz in supporting_bodies or org in supporting_org_names:
        entry['IstVerfassungsorgan'] = False
        entry['Ressort'] = 'Verfassungsorgane'

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


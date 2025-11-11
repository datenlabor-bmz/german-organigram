#!/usr/bin/env python3
"""Fetch German organization data from Airtable."""

import os
import json
from pathlib import Path
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

# Add metadata header (matching original format)
output = [
    {
        "source": "airtable",
        "owner": "German Organigram",
        "creationDate": "",
        "amount": f"{len(data)} Authorities / Institutions"
    }
]
output.extend(data)

# Write to public folder
output_path = Path(__file__).parent.parent / "public" / "anschriftenverzeichnis.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"✓ Fetched {len(data)} organizations from Airtable")
print(f"✓ Saved to {output_path}")

# Print sample of first record to verify structure
if data:
    print("\nSample record fields:")
    for key in sorted(data[0].keys())[:10]:
        print(f"  - {key}")


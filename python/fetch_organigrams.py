#!/usr/bin/env python3
"""Fetch organigram URLs from Airtable and download PDFs."""

import os
import json
import asyncio
from pathlib import Path
from pyairtable import Api
from dotenv import load_dotenv
import httpx
from tqdm.asyncio import tqdm_asyncio

load_dotenv()

api = Api(os.environ["AIRTABLE_API_KEY"])
BASE_ID = os.environ["AIRTABLE_BASE_ID"]

# Organigramme table
table = api.table(BASE_ID, "tbl3JY3bTKzkNOKsA")
records = table.all()

# Extract organigram data
organigrams = [
    {
        "organization": r["fields"].get("OrganisationKurz"),
        "url": r["fields"].get("Organigramm"),
        "date": r["fields"].get("Organigramm Datum"),
    }
    for r in records
    if r["fields"].get("Organigramm")  # Only include if URL exists
]

# Save to file
output_path = Path(__file__).parent.parent / "data" / "organigrams.json"
output_path.parent.mkdir(exist_ok=True)
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(organigrams, f, ensure_ascii=False, indent=2)

print(f"✓ Fetched {len(organigrams)} organigrams → {output_path}")

# Download PDFs
async def download_pdf(org_data: dict, pdf_dir: Path) -> dict:
    """Download a single PDF."""
    url = org_data["url"]
    org_name = org_data["organization"] or "unknown"
    
    # Create filename from organization name
    filename = f"{org_name}.pdf"
    filepath = pdf_dir / filename
    
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            with open(filepath, "wb") as f:
                f.write(response.content)
            
            return {"status": "success", "organization": org_name, "file": filename}
    except Exception as e:
        return {"status": "error", "organization": org_name, "error": str(e)}

async def download_all_pdfs():
    """Download all organigram PDFs."""
    pdf_dir = Path(__file__).parent.parent / "data" / "organigrams"
    pdf_dir.mkdir(exist_ok=True)
    
    print(f"\n📥 Downloading {len(organigrams)} organigram PDFs...")
    tasks = [download_pdf(org, pdf_dir) for org in organigrams]
    results = await tqdm_asyncio.gather(*tasks)
    
    success_count = sum(1 for r in results if r["status"] == "success")
    error_count = sum(1 for r in results if r["status"] == "error")
    
    print(f"✓ Downloaded {success_count} PDFs → {pdf_dir}/")
    if error_count > 0:
        print(f"⚠ {error_count} downloads failed")
        for r in results:
            if r["status"] == "error":
                print(f"  - {r['organization']}: {r['error']}")

asyncio.run(download_all_pdfs())


#!/bin/bash

# German Organigram Data Update
# This script fetches data from multiple sources and processes it for the web application

set -e  # Exit on any error

echo "🚀 Starting data update process..."
echo ""

echo "📡 Step 1: Fetching German organizations data..."
echo "  - Airtable (Anschriftenverzeichnis & Organigramme)"
echo "  - Wikidata"
echo "  - Budget data"
uv run python/fetch_german_orgs.py

echo ""
echo "🏢 Step 2: Building organizational charts..."
uv run python/build_organigrams.py

echo ""
echo "✅ Data update complete!"
echo "📄 Updated files:"
echo "  - data/anschriftenverzeichnis.json"
echo "  - public/organizations-index.json"
echo "  - public/organizations/*.json"
echo "  - public/organigrams/*.json"
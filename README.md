# German Organigram

Interactive overview of federal government agencies and institutions in Germany.

**This is an experimental website by BMZ Datenlabor and not an official website of the German federal government.**

Inspired by the [UN System Chart](https://systemchart.un.org/).

## Features

- **Interactive Grid** - Browse federal agencies organized by ministry (Ressort) or type (Kategorie)
- **Entity Details** - View detailed information including addresses, organizational charts, leadership, budget data
- **Budget Visualization** - Treemap visualization of federal budget allocations
- **Search & Filter** - Find agencies by name, type, or ministry
- **Multi-source Data** - Aggregated from official government sources and Wikidata

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Data Processing**: Python (uv, httpx, Pydantic)
- **Visualization**: Recharts

## Development

1. **Install Dependencies**  
   ```bash
   npm install
   ```

2. **Run Development Server**  
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:3000`.

3. **Build for Production**  
   ```bash
   npm run build
   npm run export  # Generate static site
   ```

4. **Python Environment** (for data processing)
   ```bash
   cd python
   uv sync
   ```

## Data Sources

The platform aggregates data from multiple official sources:

- **[Anschriftenverzeichnis des Bundes](https://www.govdata.de/suche/daten/anschriftenverzeichnis-des-bundes)** - Official directory of federal agencies (BVA)
- **[Wikidata](https://www.wikidata.org/)** - Structured data about agencies, ministers, and organizational structures
- **[Bundeshaushalt](https://www.bundeshaushalt.de/)** - Federal budget data
- **[Wissenschaftlicher Dienst des Bundestages](https://www.bundestag.de/)** - Documentation on agency structures and commissioners
- **Organigramme der Bundesregierung** - Official organizational charts from ministries (Airtable)

### Data Pipeline

The data pipeline is implemented in Python and processes data from various sources:

```bash
# Fetch and process data from all sources
bash update_data.sh
```

Key scripts:
- `python/fetch_german_orgs.py` - Fetches data from Airtable, Wikidata, and generates JSON files
- `python/build_organigrams.py` - Processes organizational charts

## Project Structure

```
german-organigram/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/             # Utility functions and data loaders
│   └── types/           # TypeScript type definitions
├── python/              # Data processing scripts
│   ├── fetch_german_orgs.py
│   └── build_organigrams.py
├── data/                # Source data files
└── public/              # Static files and processed JSON
```

## Contributing

Data corrections and additions can be submitted via the [contribute page](https://github.com/datenlabor-bmz/german-organigram/tree/main/src/app/contribute). 

For code contributions, please open an issue or pull request.

## License

MIT (c) 2025 BMZ Datenlabor

This project is maintained by Claude and the BMZ Datenlabor.

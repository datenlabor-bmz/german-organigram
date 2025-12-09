import json
import re
from collections import defaultdict
from pathlib import Path
import fitz

DATA_DIR = Path(__file__).parent.parent / "data" / "einzelplaene" / "2025"
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "personalhaushalt_2025.json"


def parse_german_number(s: str) -> float | None:
    s = s.strip().replace(" ", "").replace(".", "").replace(",", ".")
    if s == "-" or not s:
        return 0.0
    try:
        return float(s)
    except ValueError:
        return None


def extract_rows_from_page(page) -> list[tuple[float, str]]:
    words = page.get_text("words")
    rows = defaultdict(list)
    for w in words:
        x0, y0, _, _, text, *_ = w
        y_key = round(y0 / 5) * 5
        rows[y_key].append((x0, text))
    return [(y, " ".join(w[1] for w in sorted(rows[y], key=lambda x: x[0]))) for y in sorted(rows.keys())]


def detect_schema(page_text: str) -> dict:
    """Detect the column schema from header text."""
    has_soldiers = "423" in page_text or "soldatinnen" in page_text.lower()
    has_beamte = "422" in page_text
    has_arbeitnehmer = "428" in page_text
    
    if has_soldiers and has_beamte:
        # EPL14 style: soldiers + civil servants + employees + total = 8 columns
        return {
            "columns": ["soldaten_2025", "soldaten_2024", "beamte_2025", "beamte_2024", 
                       "arbeitnehmer_2025", "arbeitnehmer_2024", "zusammen_2025", "zusammen_2024"],
            "expected_count": 8
        }
    elif has_beamte and has_arbeitnehmer:
        # Standard: civil servants + employees + total = 6 columns  
        return {
            "columns": ["beamte_2025", "beamte_2024", "arbeitnehmer_2025", "arbeitnehmer_2024",
                       "zusammen_2025", "zusammen_2024"],
            "expected_count": 6
        }
    else:
        # Fallback
        return {"columns": [], "expected_count": 6}


def find_gesamtuebersicht_page(pdf) -> tuple[int, dict] | None:
    for i, page in enumerate(pdf):
        text = page.get_text()
        if "Gesamtübersicht" in text and "Planstellen" in text and ("Behörde" in text or "Dienststelle" in text):
            schema = detect_schema(text)
            return i, schema
    return None


def extract_numbers(text: str) -> list[float]:
    """Extract all numbers from text."""
    nums = re.findall(r"[\d\s]+,\d+|-", text)
    return [v for n in nums if (v := parse_german_number(n)) is not None]


def extract_personalhaushalt(pdf_path: Path) -> dict | None:
    pdf = fitz.open(pdf_path)
    result = find_gesamtuebersicht_page(pdf)
    if result is None:
        pdf.close()
        return None
    
    page_idx, schema = result
    rows = extract_rows_from_page(pdf[page_idx])
    expected = schema["expected_count"]
    columns = schema["columns"]
    
    data = {"planstellen": [], "leerstellen": []}
    section = None
    pending_kap = None
    pending_name = None
    
    for y, line in rows:
        if "Planstellen und Stellen" in line:
            section = "planstellen"
            continue
        if "Leerstellen" in line and len(line) < 30:
            section = "leerstellen"
            continue
        if "ku- und kw-Vermerke" in line or "kw-Vermerke" in line or "ku-Vermerke" in line:
            break
        
        if not section:
            continue
        
        # Data row starting with 4-digit Kap
        if re.match(r"^\d{4}\s", line):
            m = re.match(r"^(\d{4})\s+(.+?)(\s+[\d\s,.-]+)?$", line)
            if m:
                kap = m.group(1)
                name_part = re.sub(r"\.+$", "", m.group(2)).strip()
                numbers_part = m.group(3) or ""
                values = extract_numbers(numbers_part)
                
                if len(values) >= expected:
                    entry = {"kap": kap, "name": name_part}
                    for col, val in zip(columns, values[:expected]):
                        entry[col] = val
                    data[section].append(entry)
                    pending_kap = None
                else:
                    pending_kap = kap
                    pending_name = name_part
        
        # Continuation line
        elif pending_kap and (re.search(r"\.{2,}", line) or re.search(r"\d+,\d+", line)):
            m = re.match(r"^(.+?)([\d\s,.-]+)$", line)
            if m:
                name_cont = re.sub(r"\.+$", "", m.group(1)).strip()
                full_name = f"{pending_name} {name_cont}".strip()
                values = extract_numbers(m.group(2))
                
                if len(values) >= expected:
                    entry = {"kap": pending_kap, "name": full_name}
                    for col, val in zip(columns, values[:expected]):
                        entry[col] = val
                    data[section].append(entry)
            pending_kap = None
            pending_name = None
    
    pdf.close()
    return data if data["planstellen"] or data["leerstellen"] else None


def main():
    all_data = {}
    
    for pdf_path in sorted(DATA_DIR.glob("epl*.pdf")):
        epl_num = re.search(r"epl_?(\d+)", pdf_path.stem)
        if not epl_num:
            continue
        epl_id = f"epl{epl_num.group(1).zfill(2)}"
        
        print(f"Processing {pdf_path.name}...")
        data = extract_personalhaushalt(pdf_path)
        if data:
            all_data[epl_id] = data
            print(f"  Found {len(data['planstellen'])} planstellen, {len(data['leerstellen'])} leerstellen")
        else:
            print(f"  No Personalhaushalt data found")
    
    OUTPUT_FILE.write_text(json.dumps(all_data, indent=2, ensure_ascii=False))
    print(f"\nSaved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

import time
from pathlib import Path
import httpx
from tqdm import tqdm

BASE_URL = "https://www.bundeshaushalt.de"
DATA_URL = f"{BASE_URL}/internalapi/dataportal"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "einzelplaene" / "2025"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, */*",
    "Referer": f"{BASE_URL}/DE/Download-Portal/download-portal.html",
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=60) as client:
        r = client.get(DATA_URL, params={"year": 2025, "category": "soll_2025", "filter": "epl"})
        files = r.json() if r.status_code == 200 else []
        pdfs = [f for f in files if f.get("fileExt") == "pdf"]
        
        print(f"Found {len(pdfs)} PDFs for 2025")
        
        for f in tqdm(pdfs, desc="Downloading"):
            url = BASE_URL + f["path"]
            dest = OUTPUT_DIR / Path(f["path"]).name
            if not dest.exists():
                r = client.get(url)
                if r.status_code == 200:
                    dest.write_bytes(r.content)
                time.sleep(0.3)


if __name__ == "__main__":
    main()

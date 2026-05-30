import sqlite3
import re

# File paths
TXT_FILE = "wiki.txt"
DB_FILE = "/Users/shabirdewji/python/esyq/quran.db"

# Connect to SQLite database
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Create table
cursor.execute("""
CREATE TABLE IF NOT EXISTS wiki (
    surah INTEGER PRIMARY KEY,
    url TEXT NOT NULL
)
""")

# Read file
with open(TXT_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Parse and insert
for line in lines:
    line = line.strip()

    # Match: 1. https://...
    match = re.match(r"(\d+)\.\s+(https://.+)", line)
    if match:
        surah = int(match.group(1))
        url = match.group(2)

        cursor.execute("""
            INSERT OR REPLACE INTO wiki (surah, url)
            VALUES (?, ?)
        """, (surah, url))

# Save & close
conn.commit()
conn.close()

print("✅ wiki table created and data loaded successfully!")
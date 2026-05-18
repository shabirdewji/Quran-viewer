import os
import sqlite3

# --- PATHS ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TXT_FILE = os.path.join(BASE_DIR, "quran.txt")
DB_FILE = os.path.join(BASE_DIR, "quran.db")

# --- CONNECT DB ---
conn = sqlite3.connect(DB_FILE)
cur = conn.cursor()

# --- CREATE TABLE ---
cur.execute("""
CREATE TABLE IF NOT EXISTS quran (
    surah INTEGER,
    ayah INTEGER,
    text TEXT,
    simple TEXT
)
""")

# Optional: clear old data
#cur.execute("DELETE FROM quran")

# --- READ FILE + INSERT ---
with open(TXT_FILE, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()

        if not line:
            continue

        try:
            surah, ayah, text = line.split("|", 2)

            # ✅ REMOVE QUOTES ONLY FROM text
            text = text.replace('"', "").replace("'", "")

            cur.execute(
                "INSERT INTO quran (surah, ayah, text) VALUES (?, ?, ?)",
                (int(surah), int(ayah), text)
            )

        except ValueError:
            print("Skipping bad line:", line)

# --- SAVE ---
conn.commit()
conn.close()

print("Done: text cleaned, text2 left empty")
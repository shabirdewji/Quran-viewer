import sqlite3
from datetime import datetime

# files
TXT_FILE = "bookmarks.txt"
DB_FILE = "/Users/shabirdewji/python/esyq/quran.db"

# connect to database
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# delete existing rows
cursor.execute("DELETE FROM bookmarks")

# read bookmarks.txt
with open(TXT_FILE, "r", encoding="utf-8") as f:

    for line in f:

        line = line.strip()

        # skip empty lines
        if not line:
            continue

        # expected format:
        # label,surah,ayah
        parts = line.split(",")

        if len(parts) != 3:
            print(f"Skipping invalid line: {line}")
            continue

        label = parts[0].strip()

        try:
            surah = int(parts[1].strip())
        except ValueError:
            print(f"Invalid surah: {line}")
            continue

        # allow:
        # 5
        # 5-6
        ayah = parts[2].strip()

        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
            INSERT INTO bookmarks
            (surah, ayah, created_at, label)
            VALUES (?, ?, ?, ?)
        """, (surah, ayah, created_at, label))

# save changes
conn.commit()
conn.close()

print("Bookmarks loaded successfully.")
import sqlite3
import pathlib
import re

DB_FILE = "quran.db"
DOWNLOADS = pathlib.Path("/Users/shabirdewji/Downloads/easyq")

conn = sqlite3.connect(DB_FILE)
cur = conn.cursor()

pattern = re.compile(r"^(\d{3})-(\d{3})\.txt$")

updated = 0
inserted = 0

for txt_file in DOWNLOADS.glob("*.txt"):
    match = pattern.match(txt_file.name)

    if not match:
        continue

    surah = int(match.group(1))
    ayah = int(match.group(2))

    with open(txt_file, "r", encoding="utf-8") as f:
        note_text = f.read().strip()

    # Check if row exists
    cur.execute(
        "SELECT 1 FROM notes WHERE surah=? AND ayah=?",
        (surah, ayah)
    )

    if cur.fetchone():
        cur.execute(
            """
            UPDATE notes
            SET note=?
            WHERE surah=? AND ayah=?
            """,
            (note_text, surah, ayah)
        )
        updated += 1
        print(f"Updated {surah}:{ayah}")

    else:
        cur.execute(
            """
            INSERT INTO notes (surah, ayah, note)
            VALUES (?, ?, ?)
            """,
            (surah, ayah, note_text)
        )
        inserted += 1
        print(f"Inserted {surah}:{ayah}")

conn.commit()
conn.close()

print(f"\nDone.")
print(f"Updated: {updated}")
print(f"Inserted: {inserted}")
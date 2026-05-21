import sqlite3

DB_PATH = "quran.db"
FILE_PATH = "en.qarai.txt"

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Drop everything
    cur.execute("DROP TABLE IF EXISTS quran")

    # Recreate fresh table
    cur.execute("""
        CREATE TABLE quran (
            surah INTEGER,
            ayah INTEGER,
            text TEXT,
            is_read INTEGER DEFAULT 0,
            is_bookmarked INTEGER DEFAULT 0,
            PRIMARY KEY (surah, ayah)
        )
    """)

    # Load file
    rows = []

    with open(FILE_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            parts = line.split("|")
            if len(parts) != 3:
                continue

            surah = int(parts[0])
            ayah = int(parts[1])
            text = parts[2]

            rows.append((surah, ayah, text))

    # Bulk insert (fast)
    cur.executemany("""
        INSERT INTO quran (surah, ayah, text)
        VALUES (?, ?, ?)
    """, rows)

    conn.commit()
    conn.close()

    print(f"Done. Loaded {len(rows)} verses.")

if __name__ == "__main__":
    main()
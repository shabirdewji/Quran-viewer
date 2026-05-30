import sqlite3

DB_PATH = "/Users/shabirdewji/python/esyq/quran.db"
FILE_PATH = "surah.txt"


def load_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    blocks = []
    current_id = None
    current_text = []

    for line in content.splitlines():
        line = line.rstrip()

        if "|" in line and line.split("|")[0].isdigit():
            # save previous block
            if current_id is not None:
                blocks.append((current_id, "\n".join(current_text).strip()))

            # start new block
            parts = line.split("|", 1)
            current_id = int(parts[0])
            current_text = [parts[1]]

        else:
            current_text.append(line)

    # last block
    if current_id is not None:
        blocks.append((current_id, "\n".join(current_text).strip()))

    return blocks


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    blocks = load_file(FILE_PATH)

    print(f"Loaded {len(blocks)} surahs")

    for i, (surah_id, text) in enumerate(blocks, 1):
        print(f"[{i}] Updating Surah {surah_id}")
        print("Preview:", text[:80].replace("\n", " "), "...\n")

        cursor.execute("""
            INSERT INTO surah (id, text)
            VALUES (?, ?)
            ON CONFLICT(id)
            DO UPDATE SET text = excluded.text
        """, (surah_id, text))

    conn.commit()
    conn.close()

    print("\nDONE → Surah table updated successfully")


if __name__ == "__main__":
    main()
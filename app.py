from flask import Flask, render_template, request, jsonify, redirect
import sqlite3, os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "quran.db")
# -----------------------------
# SURAH NAMES
# -----------------------------
SURAH_NAMES = {
    1: "Al-Fatiha",
    2: "Al-Baqarah",
    3: "Aal-E-Imran",
    4: "An-Nisa",
    5: "Al-Ma'idah",
    6: "Al-An'am",
    7: "Al-A'raf",
    8: "Al-Anfal",
    9: "At-Tawbah",
    10: "Yunus",
    11: "Hud",
    12: "Yusuf",
    13: "Ar-Ra'd",
    14: "Ibrahim",
    15: "Al-Hijr",
    16: "An-Nahl",
    17: "Al-Isra",
    18: "Al-Kahf",
    19: "Maryam",
    20: "Taha",
    21: "Al-Anbiya",
    22: "Al-Hajj",
    23: "Al-Mu'minun",
    24: "An-Nur",
    25: "Al-Furqan",
    26: "Ash-Shu'ara",
    27: "An-Naml",
    28: "Al-Qasas",
    29: "Al-Ankabut",
    30: "Ar-Rum",
    31: "Luqman",
    32: "As-Sajda",
    33: "Al-Ahzab",
    34: "Saba",
    35: "Fatir",
    36: "Ya-Sin",
    37: "As-Saffat",
    38: "Sad",
    39: "Az-Zumar",
    40: "Ghafir",
    41: "Fussilat",
    42: "Ash-Shura",
    43: "Az-Zukhruf",
    44: "Ad-Dukhan",
    45: "Al-Jathiya",
    46: "Al-Ahqaf",
    47: "Muhammad",
    48: "Al-Fath",
    49: "Al-Hujurat",
    50: "Qaf",
    51: "Adh-Dhariyat",
    52: "At-Tur",
    53: "An-Najm",
    54: "Al-Qamar",
    55: "Ar-Rahman",
    56: "Al-Waqi'a",
    57: "Al-Hadid",
    58: "Al-Mujadila",
    59: "Al-Hashr",
    60: "Al-Mumtahina",
    61: "As-Saff",
    62: "Al-Jumu'a",
    63: "Al-Munafiqun",
    64: "At-Taghabun",
    65: "At-Talaq",
    66: "At-Tahrim",
    67: "Al-Mulk",
    68: "Al-Qalam",
    69: "Al-Haqqa",
    70: "Al-Ma'arij",
    71: "Nuh",
    72: "Al-Jinn",
    73: "Al-Muzzammil",
    74: "Al-Muddathir",
    75: "Al-Qiyama",
    76: "Al-Insan",
    77: "Al-Mursalat",
    78: "An-Naba",
    79: "An-Nazi'at",
    80: "Abasa",
    81: "At-Takwir",
    82: "Al-Infitar",
    83: "Al-Mutaffifin",
    84: "Al-Inshiqaq",
    85: "Al-Buruj",
    86: "At-Tariq",
    87: "Al-Ala",
    88: "Al-Ghashiya",
    89: "Al-Fajr",
    90: "Al-Balad",
    91: "Ash-Shams",
    92: "Al-Layl",
    93: "Ad-Duha",
    94: "Ash-Sharh",
    95: "At-Tin",
    96: "Al-Alaq",
    97: "Al-Qadr",
    98: "Al-Bayyina",
    99: "Az-Zalzala",
    100: "Al-Adiyat",
    101: "Al-Qari'a",
    102: "At-Takathur",
    103: "Al-Asr",
    104: "Al-Humaza",
    105: "Al-Fil",
    106: "Quraysh",
    107: "Al-Ma'un",
    108: "Al-Kawthar",
    109: "Al-Kafirun",
    110: "An-Nasr",
    111: "Al-Masad",
    112: "Al-Ikhlas",
    113: "Al-Falaq",
    114: "An-Nas"
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_surah_counts():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT surah, COUNT(*) as total
        FROM quran
        GROUP BY surah
    """)

    rows = cur.fetchall()

    return {row["surah"]: row["total"] for row in rows}



@app.route("/")
def home():

    conn = get_db()

    row = conn.execute("""
        SELECT surah, ayah
        FROM progress
        WHERE id = 1
    """).fetchone()

    if row:
        return redirect(f"/view/{row['surah']}/{row['ayah']}")

    return redirect("/view/1/1")

@app.route("/view/<int:surah>/<int:ayah>")
def view_surah(surah, ayah):

    conn = get_db()
    cur = conn.cursor()

    # ✅ GET FULL SURAH
    cur.execute("""
        SELECT surah, ayah, text, is_read
        FROM quran
        WHERE surah=?
        ORDER BY ayah
    """, (surah,))

    rows = cur.fetchall()

    if not rows:
        return "Not found", 404

    verses = [
        {
            "surah": r["surah"],
            "ayah": r["ayah"],
            "text": r["text"],
            "is_read": r["is_read"]
        }
        for r in rows
    ]

    return render_template(
        "ayah.html",

        # ✅ FULL LIST FOR LOOP
        verses=verses,

        # ✅ CURRENT VERSE (for highlighting / JS)
        verse=verses[ayah - 1],

        current_surah=surah,
        current_ayah=ayah,

        surah_counts=get_surah_counts(),
        surah_names=SURAH_NAMES,

        next_url=f"/view/{surah}/{ayah+1}",
        prev_url=f"/view/{surah}/{ayah-1 if ayah > 1 else 1}"
    )
       
@app.route("/save_progress", methods=["POST"])
def save_progress():

    data = request.json

    surah = data.get("surah")
    ayah = data.get("ayah")

    conn = get_db()

    conn.execute("""
        INSERT INTO progress (id, surah, ayah)
        VALUES (1, ?, ?)
        ON CONFLICT(id)
        DO UPDATE SET
            surah=excluded.surah,
            ayah=excluded.ayah
    """, (surah, ayah))

    conn.commit()

    return jsonify({"status": "ok"})

@app.route("/get_progress")
def get_progress():

    conn = get_db()

    row = conn.execute("""
        SELECT surah, ayah
        FROM progress
        WHERE id = 1
    """).fetchone()

    if row:
        return jsonify({
            "surah": row["surah"],
            "ayah": row["ayah"]
        })

    return jsonify({
        "surah": 1,
        "ayah": 1
    })


@app.route("/bookmark", methods=["POST"])
def add_bookmark():

    data = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO bookmarks (surah, ayah, label)
        VALUES (?, ?, ?)
    """, (
        data["surah"],
        data["ayah"],
        data.get("label", "")
    ))

    conn.commit()

    return jsonify({"status": "ok"})

@app.route("/bookmarks")
def bookmarks_page():
    return render_template("bookmarks.html")


@app.route("/api/bookmarks")
def get_bookmarks():

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, surah, ayah, label
        FROM bookmarks
        ORDER BY id ASC
    """)

    rows = cur.fetchall()

    return jsonify({
        "bookmarks": [
            dict(row) for row in rows
        ]
    })

@app.route("/api/ayah/<int:surah>/<int:ayah>")
def get_ayah(surah, ayah):

    conn = get_db()

    row = conn.execute("""
        SELECT text
        FROM quran
        WHERE surah=? AND ayah=?
    """, (surah, ayah)).fetchone()

    return {
        "text": row["text"] if row else ""
    }
    
@app.route("/bookmark/<int:id>", methods=["DELETE"])
def delete_bookmark(id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM bookmarks WHERE id=?",
        (id,)
    )
    conn.commit()
    return jsonify({"status": "deleted"})


@app.route("/pin", methods=["POST"])
def pin():
    data = request.get_json()

    surah = data["surah"]
    ayah = data["ayah"]

    conn = get_db()
    conn.execute(
        "UPDATE pins SET surah=?, ayah=? WHERE id=1",
        (surah, ayah)
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})
    
    
@app.route("/pin", methods=["GET"])
def get_pin():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT surah, ayah FROM pins WHERE id=1")
    row = cur.fetchone()

    conn.close()

    if not row:
        return jsonify({})

    return jsonify({
        "surah": row["surah"],
        "ayah": row["ayah"]
    })
    
@app.route("/set_read", methods=["POST"])
def set_read():
    

    data = request.get_json()

    ayah = int(data["ayah"])
    surah = int(data["surah"])
    is_read = 1 if data["is_read"] else 0

    conn = get_db()
    
    cur = conn.execute("""
    SELECT is_read FROM quran
        WHERE surah = ? AND ayah = ?
    """, (surah, ayah))

    #print("BEFORE UPDATE ROW:", cur.fetchone())

    cur = conn.execute("""
        UPDATE quran
        SET is_read = ?
        WHERE surah = ? AND ayah = ?
    """, (is_read, surah, ayah))

    conn.commit()

    print("ROWS UPDATED:", cur.rowcount)

    conn.close()

    return {"ok": True, "updated": cur.rowcount}

@app.route("/get_read")
def get_read():
    #print("🔥 GET_READ HIT")
    surah = request.args.get("surah")
    #print("In get_read, surah = ", surah)

    conn = get_db()
    conn.row_factory = sqlite3.Row

    rows = conn.execute("""
        SELECT ayah, is_read
        FROM quran
        WHERE surah=?
    """, (surah,)).fetchall()

    conn.close()

    return {
        r["ayah"]: r["is_read"]
        for r in rows
    }
    
    
@app.route("/get_note")
def get_note():

    surah = int(request.args.get("surah"))
    ayah = request.args.get("ayah")

    conn = get_db()

    # -----------------------------------
    # SINGLE AYAH (popup)
    # -----------------------------------
    if ayah is not None:
        ayah = int(ayah)

        row = conn.execute("""
            SELECT note
            FROM notes
            WHERE surah = ? AND ayah = ?
        """, (surah, ayah)).fetchone()

        conn.close()

        return jsonify({
            "note": row["note"] if row else ""
        })

    # -----------------------------------
    # ALL NOTES IN SURAH (dots)
    # -----------------------------------
    rows = conn.execute("""
        SELECT ayah, note
        FROM notes
        WHERE surah = ?
    """, (surah,)).fetchall()

    conn.close()

    return jsonify({
        str(row["ayah"]): row["note"]
        for row in rows
    })

@app.route("/get_notes")
def get_notes():

    surah = int(request.args.get("surah"))
    #print("SURAH REQUESTED:", surah)
    

    conn = get_db()

    rows = conn.execute("""
        SELECT ayah, note
        FROM notes
        WHERE surah = ?
    """, (surah,)).fetchall()

    conn.close()

    return jsonify({
        str(row["ayah"]): row["note"]
        for row in rows
    })
    
@app.route("/save_note", methods=["POST"])
def save_note():

    data = request.get_json()

    surah = int(data["surah"])
    ayah = int(data["ayah"])
    note = data["note"]

    conn = get_db()

    conn.execute("""
        INSERT INTO notes (surah, ayah, note)
        VALUES (?, ?, ?)

        ON CONFLICT(surah, ayah)
        DO UPDATE SET
            note = excluded.note
    """, (surah, ayah, note))

    conn.commit()
    conn.close()

    return jsonify({
        "ok": True
    })
    
@app.route("/get_surah_summary")
def get_surah_summary():
    #print("IN GET_SURA_SUMMARY")
    surah = request.args.get("surah")

    if surah is None:
        return jsonify({"text": ""})

    conn = get_db()

    row = conn.execute("""
        SELECT text
        FROM surah
        WHERE id = ?
    """, (int(surah),)).fetchone()
    
    #print("TEXT:", row["text"])
    

    conn.close()

    return jsonify({
        "text": row["text"] if row else ""
    })
    
@app.route("/update_surah_summary", methods=["POST"])
def update_surah_summary():
    data = request.json
    surah = int(data["surah"])
    text = data["text"]

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE surah
        SET text = ?
        WHERE id = ?
    """, (text, surah))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})

    
@app.route("/get_wiki_link")
def get_wiki_link():
    surah = int(request.args.get("surah"))

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT url
        FROM wiki
        WHERE surah = ?
        LIMIT 1
    """, (surah,))

    row = cur.fetchone()

    return jsonify({
        "url": row["url"] if row else None
    })
    
    
if __name__ == "__main__":
    app.run(debug=True)
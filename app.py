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
    # redirect to last read or default surah
    return redirect("/view/1/1")

@app.route("/view/<int:surah>/<int:ayah>")
def view_surah(surah, ayah):

    conn = get_db()
    cur = conn.cursor()

    # ✅ GET FULL SURAH
    cur.execute("""
        SELECT surah, ayah, text
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
            "text": r["text"]
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

    # optional DB save (you already had this)
    surah = data.get("surah")
    ayah = data.get("ayah")

    print("Progress:", surah, ayah)

    return jsonify({"status": "ok"})


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
        ORDER BY id DESC
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

    if not data:
        return jsonify({"error": "No JSON received"}), 400

    surah = data.get("surah")
    ayah = data.get("ayah")

    if surah is None or ayah is None:
        return jsonify({"error": "Missing surah or ayah"}), 400

    conn = get_db()
    cur = conn.cursor()

    # Optional: prevent duplicates
    cur.execute("""
        SELECT id FROM pins
        WHERE surah = ? AND ayah = ?
    """, (surah, ayah))

    exists = cur.fetchone()

    if exists:
        conn.close()
        return jsonify({"status": "already_pinned"})

    cur.execute("""
        UPDATE pins
        SET surah = ?, ayah = ?
        WHERE id = 1
    """, (surah, ayah))

    conn.commit()
    conn.close()

    return jsonify({
        "status": "ok",
        "surah": surah,
        "ayah": ayah
    })
    
@app.route("/pin", methods=["GET"])
def get_pin():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT surah, ayah FROM pins WHERE id = 1")
    row = cur.fetchone()

    conn.close()

    if row:
        return jsonify({
            "surah": row["surah"],
            "ayah": row["ayah"]
        })

    return jsonify(None)
    
@app.route("/pins", methods=["GET"])
def get_pins():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT surah, ayah FROM pins ORDER BY id ASC")
    rows = cur.fetchall()
    
    for row in rows:
        print("PIN TO:", row["surah"], row["ayah"])

    conn.close()

    return jsonify([
        {"surah": r["surah"], "ayah": r["ayah"]}
        for r in rows
    ])
    


if __name__ == "__main__":
    app.run(debug=True)
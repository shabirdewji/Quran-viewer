/* ===================================== */
/* VIEWER.JS — CRASH-PROOF VERSION       */
/* ===================================== */

/* ---------- SAFE HELPERS ---------- */

const $ = (id) => document.getElementById(id);

function bind(id, event, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener(event, fn);
}

/* ---------- STATE ---------- */

let audioPlayer = null;

let currentSurah;
let currentAyah;
let currentIndex = 0;

let isPlayingSurah = false;
let surahQueue = [];

const surahCounts = window.surahCounts || {};
const pageData = window.pageData || null;

/* ---------- INIT ---------- */

document.addEventListener("DOMContentLoaded", init);

function init() {

    if (!pageData) return; // prevents crashes on non-viewer pages

    currentSurah = pageData.surah;
    currentAyah = pageData.ayah;
    currentIndex = currentAyah - 1;

    audioPlayer = $("audioPlayer");

    setupUI();
    setupNavigation();
    setupDropdowns();
    setupAudio();
}


/* ---------- UI INIT ---------- */

function setupUI() {

    const totalEl = $("totalAyahs");
    if (totalEl) {
        totalEl.textContent = surahCounts[currentSurah] || "?";
    }

    focusAyah(currentAyah);
}
function toggleTheme() {
    const isLight = document.body.classList.contains("light");
    setTheme(isLight ? "dark" : "light");
}

let fontSize = parseInt(localStorage.getItem("fontSize")) || 32;

function applyFontSize() {
    document.documentElement.style.setProperty(
        "--ayah-font-size",
        fontSize + "px"
    );

    localStorage.setItem("fontSize", fontSize);
}
/* ---------- FONT SIZE ---------- */
function changeFontSize(amount) {
    fontSize += amount;

    if (fontSize < 18) fontSize = 18;
    if (fontSize > 60) fontSize = 60;

    applyFontSize();
}
/* ---------- THEME -------------- */
function setTheme(mode) {
    document.body.classList.remove("light");

    if (mode === "light") {
        document.body.classList.add("light");
    }

    localStorage.setItem("theme", mode);
}

/* ---------- NAV BUTTONS ---------- */

function setupNavigation() {
    bind("nextBtn", "click", goNext);
    bind("prevBtn", "click", goPrev);
}

/* ---------- DROPDOWNS ---------- */

function setupDropdowns() {

    const surahSelect = $("surahSelect");

    if (surahSelect) {
        surahSelect.addEventListener("change", (e) => {
            window.location.href = `/view/${e.target.value}/1`;
        });
    }

    const ayahSelect = $("ayahSelect");

    if (!ayahSelect) return;

    const total = surahCounts[currentSurah] || 0;

    ayahSelect.innerHTML = "";

    for (let i = 1; i <= total; i++) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = "Ayah " + i;
        ayahSelect.appendChild(opt);
    }

    ayahSelect.value = currentAyah;

    ayahSelect.addEventListener("change", (e) => {
        window.location.href =
            `/view/${currentSurah}/${e.target.value}`;
    });
}

/* ---------- AUDIO ---------- */

function setupAudio() {

    if (!audioPlayer) return;

    audioPlayer.addEventListener("ended", handleAudioEnd);
}

function handleAudioEnd() {

    if (!isPlayingSurah) return;

    currentIndex++;

    if (currentIndex >= surahQueue.length) {
        isPlayingSurah = false;
        return;
    }

    playNextInSurah();
}

/* ---------- NAVIGATION ---------- */

function goNext() {
    let s = currentSurah;
    let a = currentAyah;
    const max = surahCounts[s] || 0;
    a++;
    if (a > max) {
        s++;
        a = 1;
        if (!surahCounts[s]) return;
    }
    window.location.href = `/view/${s}/${a}`;
}

function goPrev() {
    let s = currentSurah;
    let a = currentAyah;
    a--;
    if (a < 1) {
        s--;
        if (!surahCounts[s]) return;
        a = surahCounts[s];
    }
    window.location.href = `/view/${s}/${a}`;
}

/* ---------- AYAH FOCUS ---------- */

function focusAyah(num) {

    currentAyah = num;
    currentIndex = num - 1;

    // remove old highlight
    document.querySelectorAll(".ayah-block")
        .forEach(el => {
            el.classList.remove("active");
        });

    // highlight current
    const el = document.getElementById("ayah-" + num);

    if (el) {

        el.classList.add("active");

        el.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    // top ayah counter
    const currentEl =
        document.getElementById("currentAyah");

    if (currentEl) {
        currentEl.textContent = num;
    }

    // dropdown sync
    const select =
        document.getElementById("ayahSelect");

    if (select) {
        select.value = num;
    }

    // autosave progress
    sendProgress();
}

/* ---------- AUDIO PLAYBACK ---------- */

function playAyah() {

    if (!audioPlayer) return;

    const id =
        String(currentSurah).padStart(3, "0") +
        String(currentAyah).padStart(3, "0");

    audioPlayer.src =
        "https://everyayah.com/data/Alafasy_128kbps/" + id + ".mp3";

    audioPlayer.play();
}

function playSurah() {

    const total = surahCounts[currentSurah] || 0;

    surahQueue = [];

    for (let i = 1; i <= total; i++) {

        const id =
            String(currentSurah).padStart(3, "0") +
            String(i).padStart(3, "0");

        surahQueue.push(
            "https://everyayah.com/data/Alafasy_128kbps/" + id + ".mp3"
        );
    }

    currentIndex = currentAyah - 1;
    isPlayingSurah = true;

    playNextInSurah();
}

function playNextInSurah() {

    if (!isPlayingSurah) return;

    // current ayah being played
    const ayahNum = currentIndex + 1;

    // highlight it
    focusAyah(ayahNum);

    // load audio
    audioPlayer.src = surahQueue[currentIndex];

    audioPlayer.play()
        .catch(err => {
            console.log(err);
            isPlayingSurah = false;
        });
}

/* ---------- PROGRESS ---------- */

function sendProgress() {

    if (!currentSurah || !currentAyah) return;

    fetch("/save_progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            surah: currentSurah,
            ayah: currentAyah
        })
    }).catch(() => {});
}

/* ---------- BOOKMARK ---------- */

document.addEventListener("DOMContentLoaded", () => {
    loadBookmarks();
});

function loadBookmarks() {
    fetch("/api/bookmarks")
        .then(res => res.json())
        .then(data => {

            const box = document.getElementById("list");
            box.innerHTML = "";

            if (!data.bookmarks || data.bookmarks.length === 0) {
                box.innerHTML = "<p>No bookmarks yet</p>";
                return;
            }

            data.bookmarks.forEach(b => {

                const row = document.createElement("div");
                row.className = "verse";

                row.innerHTML = `
                    <div class="left">
                        <div class="ref">
                            Surah ${b.surah}:${b.ayah}
                        </div>

                        <div class="text">
                            ${b.label || "No label"}
                        </div>
                    </div>

                    <div class="actions">
                        <button onclick="openVerse(${b.surah}, ${b.ayah})">
                            Open
                        </button>

                        <button class="delete-btn" onclick="deleteBookmark(${b.id})">
                            Delete
                        </button>
                    </div>
                `;

                box.appendChild(row);
            });
        });
}

function openVerse(surah, ayah) {
    window.location.href = `/view/${surah}/${ayah}`;
}

function deleteBookmark(id) {
    fetch(`/bookmark/${id}`, {
        method: "DELETE"
    })
    .then(() => loadBookmarks());
}

window.addBookmark = function () {

    const label = prompt("Enter bookmark name:");
    if (!label) return;

    console.log("ADD BOOKMARK CLICKED");

    fetch("/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            surah: window.pageData.surah,
            ayah: window.pageData.ayah,
            label: label
        })
    })
    .then(res => res.json())
    .then(() => {
        console.log("Bookmark saved");
    })
    .catch(err => console.error("Bookmark failed:", err));
};
/* ---------- PIN ------------------- */
function pinAyah() {
    if (!currentSurah || !currentAyah) {
        console.error("No ayah selected");
        return;
    }

    fetch("/pin", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            surah: currentSurah,
            ayah: currentAyah
        })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("pinStatus").innerText =
            `📌 Pinned ${currentSurah}:${currentAyah}`;

        showToast(`📌 Pinned ${currentSurah}:${currentAyah}`);
        
        console.log("Pinned:", data);
    })
    .catch(err => console.error("Pin error:", err));
}
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
async function goContinue() {
    const res = await fetch("/pin");
    const pin = await res.json();

    if (!pin || !pin.surah || !pin.ayah) {
        console.log("No pin found");
        return;
    }

    console.log("Going to pin:", pin);

    goToAyah(pin.surah, pin.ayah);
}

let pinsCache = [];
let currentPinIndex = -1;

async function loadPins() {
    const res = await fetch("/pins");
    pinsCache = await res.json();
}

function goToAyah(surah, ayah) {
    window.location.href = `/view/${surah}/${ayah}`;
}




/* ---------- CONTROLS ---------- */

function togglePause() {

    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
}
/* -------------------------------- */
/* AUTO HIDE CONTROLS               */
/* -------------------------------- */

let controlsTimer = null;

document.addEventListener("DOMContentLoaded", () => {

    applyFontSize();

    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);

    const controls =
        document.querySelector(".left-controls");

    if (!controls) return;

    function hideControls() {
        controls.classList.add("hidden");
    }

    function showControls() {

        controls.classList.remove("hidden");

        clearTimeout(controlsTimer);

        controlsTimer = setTimeout(() => {
            hideControls();
        }, 2000);
    }

    // initial timer
    showControls();

    // mouse enters controls area
    controls.addEventListener("mouseenter", () => {
        showControls();
    });

    // movement near left edge restores controls
    document.addEventListener("mousemove", (e) => {

        if (e.clientX < 120) {
            showControls();
        }
    });

    // touch support
    document.addEventListener("touchstart", (e) => {

        const x = e.touches[0].clientX;

        if (x < 120) {
            showControls();
        }
    });
});
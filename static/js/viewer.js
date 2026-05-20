let currentPlayingAyah = null;

let isPlayingSurah = false;
let surahQueue = [];
let currentIndex = 0;

let audioPlayer;
let isPlayingSurah = false;
let surahQueue = [];
let currentIndex = 0;
let currentPlayingAyah = null;

window.addEventListener("DOMContentLoaded", () => {
    audioPlayer = document.getElementById("audioPlayer");
});


/* -------------------------------- */
/* DATA */
/* -------------------------------- */

const pageData = {
    surah: {{ verse.surah | tojson }},
    ayah: {{ verse.ayah | tojson }},
    nextUrl: {{ next_url | tojson }},
    prevUrl: {{ prev_url | tojson }}
};

/* -------------------------------- */
/* SURAH COUNTS */
/* -------------------------------- */

//const surahCounts = JSON.parse('{{ surah_counts | tojson | safe }}');

const surahCounts = {{ surah_counts | tojson }};

/* -------------------------------- */
/* BUILD AYAH DROPDOWN */
/* -------------------------------- */

function updateAyahList() {

    const surah = document.getElementById("surahSelect").value;
    const ayahSelect = document.getElementById("ayahSelect");

    const max = surahCounts[surah];

    ayahSelect.innerHTML = "";

    for (let i = 1; i <= max; i++) {

        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = "Ayah " + i;

        ayahSelect.appendChild(opt);
    }

    ayahSelect.value = pageData.ayah;
}

/* -------------------------------- */
/* CHANGE SURAH */
/* -------------------------------- */

function changeSurah() {
    const surah = document.getElementById("surahSelect").value;
    window.location.href = `/view/${surah}/1`;
}

function changeAyah() {
    const surah = document.getElementById("surahSelect").value;
    const ayah = document.getElementById("ayahSelect").value;
    window.location.href = `/view/${surah}/${ayah}`;
}

/* -------------------------------- */
/* GO TO AYAH */
/* -------------------------------- */


function goToAyah() {

    const surah =
        document.getElementById(
            "surahSelect"
        ).value;

    const ayah =
        document.getElementById(
            "ayahSelect"
        ).value;

    window.location.href =
        `/view/${surah}/${ayah}`;
}

function goTo(surah, ayah) {
    window.location.href = `/view/${surah}/${ayah}`;
}
/* -------------------------------- */
/* READ */
/* -------------------------------- */

function toggleBookmarks() {
    const panel = document.getElementById("bookmarkPanel");
    if (!panel) return; // prevent crash

    const isOpen = panel.style.display === "block";
    panel.style.display = isOpen ? "none" : "block";

    if (!isOpen) loadBookmarks();
}

/* -------------------------------- */
/* TOAST */
/* -------------------------------- */

function showToast(msg) {

    const t =
        document.getElementById("toast");

    t.textContent = msg;

    t.classList.add("show");

    setTimeout(() => {
        t.classList.remove("show");
    }, 1500);
}

/* -------------------------------- */
/* PIN */
/* -------------------------------- */
function pinAyah() {
    console.log("📌 pinAyah fired");

    fetch("/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            surah: pageData.surah,
            ayah: pageData.ayah
        })
    })
    .then(r => r.json())
    .then(data => {
        console.log("Pinned:", data);
        showToast(`📌 Pinned ${pageData.surah}:${pageData.ayah}`);
    })
    .catch(err => console.error("Pin failed:", err));
}


/* -------------------------------- */
/* CONTINUE */
/* -------------------------------- */

function goContinue() {

    window.location.href = "/continue";
}

/* -------------------------------- */
/* NAVIGATION */
/* -------------------------------- */

function goNext() {
    if (pageData.nextUrl && pageData.nextUrl !== "null") {
        window.location.href = pageData.nextUrl;
    }
}

function goPrev() {
    if (pageData.prevUrl && pageData.prevUrl !== "null") {
        window.location.href = pageData.prevUrl;
    }
}

/* -------------------------------- */
/* SWIPE */
/* -------------------------------- */

const page = document.querySelector(".page");


const ayah = document.querySelector(".ayah");

// load saved size
let currentSize = localStorage.getItem("fontSize");

if (!currentSize) {
    currentSize = 32;
}

currentSize = parseInt(currentSize);

ayah.style.fontSize = currentSize + "px";

function changeFontSize(amount) {

    currentSize += amount;

    // limits
    if (currentSize < 18) currentSize = 18;
    if (currentSize > 60) currentSize = 60;

    ayah.style.fontSize = currentSize + "px";

    localStorage.setItem("fontSize", currentSize);
}



function setTheme(mode) {
    document.body.classList.remove("light");

    if (mode === "light") {
        document.body.classList.add("light");
    }

    localStorage.setItem("theme", mode);
}

function toggleTheme() {
    const isLight = document.body.classList.contains("light");
    setTheme(isLight ? "dark" : "light");
}

// load saved theme
window.onload = function () {
    const saved = localStorage.getItem("theme");
    if (saved) setTheme(saved);
};




let audioPlayer = null;

window.addEventListener("DOMContentLoaded", () => {
    audioPlayer = document.getElementById("audioPlayer");
});




function playAyah() {
    const audioId =
        String(pageData.surah).padStart(3, "0") +
        String(pageData.ayah).padStart(3, "0");

    const url =
        "https://everyayah.com/data/Alafasy_128kbps/" +
        audioId + ".mp3";

    isPlayingSurah = false;

    audioPlayer.src = url;
    audioPlayer.play();
}

function playSurah() {

    const surah = pageData.surah;
    const total = surahCounts[surah];

    surahQueue = [];

    for (let i = 1; i <= total; i++) {

        const id =
            String(surah).padStart(3, "0") +
            String(i).padStart(3, "0");

        surahQueue.push(
            "https://everyayah.com/data/Alafasy_128kbps/" +
            id + ".mp3"
        );
    }

    currentIndex = 0;
    isPlayingSurah = true;

    playNextInSurah();
}

function playNextInSurah() {
    if (!isPlayingSurah) return;

    if (currentIndex >= surahQueue.length) {
        isPlayingSurah = false;
        clearHighlight();
        return;
    }

    const ayahNumber = currentIndex + 1;
    highlightAyah(ayahNumber);

    const src = surahQueue[currentIndex];

    // IMPORTANT: reset event before setting src
    audioPlayer.onended = null;

    audioPlayer.src = src;

    const playPromise = audioPlayer.play();

    if (playPromise !== undefined) {
        playPromise.catch(err => {
            console.log("Playback error:", err);
            isPlayingSurah = false;
        });
    }

    audioPlayer.onended = () => {
        currentIndex++;
        playNextInSurah();
    };
}
function highlightAyah(num) {

    // remove old highlight
    if (currentPlayingAyah) {
        const old = document.getElementById("ayah-" + currentPlayingAyah);
        if (old) old.classList.remove("active");
    }

    // add new highlight
    const el = document.getElementById("ayah-" + num);

    if (el) {
        el.classList.add("active");

        // optional auto-scroll (smooth reading)
        el.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    currentPlayingAyah = num;
}

function clearHighlight() {
    if (currentPlayingAyah) {
        const el = document.getElementById("ayah-" + currentPlayingAyah);
        if (el) el.classList.remove("active");
    }
    currentPlayingAyah = null;
}



function togglePause() {

    if (audioPlayer.paused) {
        audioPlayer.play();
        return;
    }

    audioPlayer.pause();
}



function loadBookmarks() {

    fetch("/bookmarks")
        .then(res => res.json())
        .then(data => {

            const box = document.getElementById("bookmarkList");
            box.innerHTML = "";

            const list = data.bookmarks || [];

            if (list.length === 0) {
                box.innerHTML = "<p>No bookmarks yet</p>";
                return;
            }

            list.forEach(b => {

                const div = document.createElement("div");
                div.style.padding = "10px";
                div.style.borderBottom = "1px solid #333";

                div.innerHTML =
                    `<div style="display:flex; align-items:center; gap:10px; justify-content:space-between;">
                        <div style="flex:1;">
                            📌 ${b.label ? b.label : `Surah ${b.surah}:${b.ayah}`}
                            <span style="opacity:0.6;font-size:12px;margin-left:6px;">
                                (${b.surah}:${b.ayah})
                            </span>
                        </div>

                        <button onclick="goToBookmark(${b.surah}, ${b.ayah})">Go</button>
                        <button onclick="deleteBookmark(${b.id})">Del</button>
                    </div>`;

                box.appendChild(div);
            });
        });
}

function goToBookmark(surah, ayah) {
    window.location.href = `/view/${surah}/${ayah}`;
}






function deleteBookmark(id) {

    fetch(`/bookmark/${id}`, {
        method: "DELETE"
    })
    .then(res => res.json())
    .then(() => {
        loadBookmarks(); // refresh panel
    })
    .catch(err => console.error("Delete failed:", err));
}

/* LOAD SAVED THEME */
window.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
});

window.addEventListener("DOMContentLoaded", () => {
    const total = surahCounts[pageData.surah];
    document.getElementById("totalAyahs").textContent = total;
});



let startX = 0;
let startY = 0;

page.addEventListener("touchstart", (e) => {

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

}, { passive: true });

page.addEventListener("touchend", (e) => {

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const dx = endX - startX;
    const dy = endY - startY;

    // REQUIRE HORIZONTAL SWIPE

    if (Math.abs(dx) < 70) return;

    // IGNORE MOSTLY VERTICAL MOVEMENT

    if (Math.abs(dy) > 80) return;

    // LEFT

    if (dx < 0) {
        goNext();
    }

    // RIGHT

    if (dx > 0) {
        goPrev();
    }

}, { passive: true });

/* -------------------------------- */
/* AUTO SAVE LAST VIEWED */
/* -------------------------------- */

function sendProgress() {

    const surah = document.getElementById("surahSelect");
    const ayah = document.getElementById("ayahSelect");

    if (!surah || !ayah) return;

    fetch("/save_progress", {   // ✅ FIXED HERE
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            surah: surah.value,
            ayah: ayah.value
        })
    });
}


/* -------------------------------- */
/* INIT */
/* -------------------------------- */
document.addEventListener("DOMContentLoaded", () => {

    const surah = document.getElementById("surahSelect");
    const ayah = document.getElementById("ayahSelect");

    if (surah) surah.addEventListener("change", sendProgress);
    if (ayah) ayah.addEventListener("change", sendProgress);
});

window.addEventListener(
    "DOMContentLoaded",
    () => {

        updateAyahList();
    }
);

window.addBookmark = function () {

    console.log("ADD BOOKMARK CLICKED");

    const label = prompt("Name this bookmark (optional):");

    fetch("/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            surah: pageData.surah,
            ayah: pageData.ayah,
            label: label || ""
        })
    })
    .then(r => r.json())
    .then(() => {
    loadBookmarks();

    const panel = document.getElementById("bookmarkPanel");
    if (panel) panel.style.display = "block";
})
    .catch(err => console.error(err));
};
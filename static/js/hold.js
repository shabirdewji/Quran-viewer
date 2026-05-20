let audioPlayer;
let isPlayingSurah = false;
let surahQueue = [];
let currentIndex = 0;
let currentPlayingAyah = null;

const pageData = window.pageData;
const surahCounts = window.surahCounts;

/* -------------------------------- */
/* AUDIO                            */
/* -------------------------------- */

function playAyah() {

    const id =
        String(pageData.surah).padStart(3, "0") +
        String(pageData.ayah).padStart(3, "0");

    isPlayingSurah = false;

    audioPlayer.src =
        "https://everyayah.com/data/Alafasy_128kbps/" + id + ".mp3";

    audioPlayer.play();
}

async function playSurah() {

    await loadSurahView();

    const surah = pageData.surah;
    const total = surahCounts[surah];

    surahQueue = [];
    currentIndex = 0;
    isPlayingSurah = true;

    for (let i = 1; i <= total; i++) {

        const id =
            String(surah).padStart(3, "0") +
            String(i).padStart(3, "0");

        surahQueue.push(
            "https://everyayah.com/data/Alafasy_128kbps/" + id + ".mp3"
        );
    }

    playNextInSurah();
}

function playNextInSurah() {

    if (!isPlayingSurah) return;

    highlightAyah(currentIndex + 1);

    audioPlayer.src = surahQueue[currentIndex];
    audioPlayer.load();
    audioPlayer.play();
}

function handleNext() {

    if (!isPlayingSurah) return;

    currentIndex++;

    if (currentIndex >= surahQueue.length) {

        isPlayingSurah = false;
        clearHighlight();
        return;
    }

    playNextInSurah();
}

function togglePause() {

    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
}

/* -------------------------------- */
/* HIGHLIGHT                        */
/* -------------------------------- */

function highlightAyah(num) {

    if (currentPlayingAyah) {

        const old = document.getElementById(
            "ayah-" + currentPlayingAyah
        );

        if (old) old.classList.remove("active");
    }

    const el = document.getElementById("ayah-" + num);

    if (el) {

        el.classList.add("active");

        el.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    currentPlayingAyah = num;
}

function clearHighlight() {

    if (currentPlayingAyah) {

        const el = document.getElementById(
            "ayah-" + currentPlayingAyah
        );

        if (el) el.classList.remove("active");
    }

    currentPlayingAyah = null;
}

/* -------------------------------- */
/* AYAH DROPDOWN                    */
/* -------------------------------- */

function updateAyahList() {

    const surahSelect =
        document.getElementById("surahSelect");

    const ayahSelect =
        document.getElementById("ayahSelect");

    if (!surahSelect || !ayahSelect) return;

    const surah = surahSelect.value;
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
/* NAVIGATION                       */
/* -------------------------------- */

function changeSurah() {

    const s =
        document.getElementById("surahSelect").value;

    window.location.href = `/view/${s}/1`;
}

function changeAyah() {

    const s =
        document.getElementById("surahSelect").value;

    const a =
        document.getElementById("ayahSelect").value;

    window.location.href = `/view/${s}/${a}`;
}

function goNext() {

    if (pageData.nextUrl) {
        window.location.href = pageData.nextUrl;
    }
}

function goPrev() {

    if (pageData.prevUrl) {
        window.location.href = pageData.prevUrl;
    }
}

/* -------------------------------- */
/* FONT                             */
/* -------------------------------- */

const ayahElement = document.querySelector(".ayah");

let currentSize = localStorage.getItem("fontSize");

if (!currentSize) {
    currentSize = 32;
}

currentSize = parseInt(currentSize);

if (ayahElement) {
    ayahElement.style.fontSize = currentSize + "px";
}

function changeFontSize(amount) {

    currentSize += amount;

    if (currentSize < 18) currentSize = 18;
    if (currentSize > 60) currentSize = 60;

    if (ayahElement) {
        ayahElement.style.fontSize =
            currentSize + "px";
    }

    localStorage.setItem("fontSize", currentSize);
}

/* -------------------------------- */
/* THEME                            */
/* -------------------------------- */

function setTheme(mode) {

    document.body.classList.remove("light");

    if (mode === "light") {
        document.body.classList.add("light");
    }

    localStorage.setItem("theme", mode);
}

function toggleTheme() {

    const isLight =
        document.body.classList.contains("light");

    setTheme(isLight ? "dark" : "light");
}

/* -------------------------------- */
/* BOOKMARKS                        */
/* -------------------------------- */
function toggleBookmarks() {

    const bookmarkView =
        document.getElementById("bookmarkView");

    const reader =
        document.querySelector(".reader");

    const surahView =
        document.getElementById("surahView");

    if (!bookmarkView || !reader) return;

    const isVisible =
        bookmarkView.style.display === "block";

    // hide everything first
    bookmarkView.style.display = "none";
    surahView.style.display = "none";
    reader.style.display = "none";

    // toggle bookmarks
    if (!isVisible) {
        bookmarkView.style.display = "block";
        loadBookmarks(); // refresh list
    } else {
        reader.style.display = "block";
    }
}

function loadBookmarks() {
    fetch("/api/bookmarks")
    .then(res => res.json())
    .then(data => {
        const view =
            document.getElementById("bookmarkView");
        const box =
            document.getElementById("bookmarkList");
        if (!view || !box) return;
        view.style.display = "block";
        box.innerHTML = "";
        const list = data.bookmarks || [];
        if (list.length === 0) {
            box.innerHTML =
                "<p>No bookmarks yet</p>";
            return;
        }
        list.forEach(b => {
            const div =
                document.createElement("div");
            div.className = "bookmark-item";
            div.innerHTML = `
                <div class="bookmark-row">
                    <div class="bookmark-info">
                        <div class="bookmark-label">
                            📌 ${b.label || `Surah ${b.surah}:${b.ayah}`}
                        </div>
                        <div class="bookmark-meta">
                            ${b.surah}:${b.ayah}
                        </div>
                    </div>
                    <div class="bookmark-actions">
                        <button onclick="
                            goToBookmark(
                                ${b.surah},
                                ${b.ayah}
                            )
                        ">
                            Open
                        </button>
                        <button onclick="
                            deleteBookmark(${b.id})
                        ">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            box.appendChild(div);
        });
    });
}

function showBookmarksView() {
    document.getElementById("bookmarkView").style.display = "block";
    document.querySelector(".reader").style.display = "none";
    loadBookmarks();
}

function showReaderView() {
    document.getElementById("bookmarkView").style.display = "none";
    document.querySelector(".reader").style.display = "block";
}

function goToBookmark(surah, ayah) {
    window.location.href =
        `/view/${surah}/${ayah}`;
}

function deleteBookmark(id) {
    fetch(`/bookmark/${id}`, {
        method: "DELETE"
    })

    .then(res => res.json())
    .then(() => {
        loadBookmarks();
    })
    .catch(err => {
        console.error("Delete failed:", err);
    });
}

window.addBookmark = function () {
    const label =
        prompt("Name this bookmark (optional):");
    fetch("/bookmark", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            surah: pageData.surah,
            ayah: pageData.ayah,
            label: label || ""
        })
    })
    .then(r => r.json())
    .then(() => {
        loadBookmarks();
        const panel =
            document.getElementById("bookmarkPanel");
        if (panel) {
            panel.style.display = "block";
        }
    })

    .catch(err => console.error(err));
};

/* -------------------------------- */
/* SURAH VIEW                       */
/* -------------------------------- */

async function loadSurahView() {
    const res =
        await fetch(`/api/surah/${pageData.surah}`);
    const verses = await res.json();
    const container =
        document.getElementById("surahView");
    if (!container) return;
    container.innerHTML = verses.map(v => `
        <div class="ayah" id="ayah-${v.ayah}">
            ${v.text}
        </div>
    `).join("");
    container.style.display = "block";
}

/* -------------------------------- */
/* SWIPE                            */
/* -------------------------------- */

const page = document.querySelector(".page");

let startX = 0;
let startY = 0;

if (page) {

    page.addEventListener("touchstart", (e) => {

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;

    }, { passive: true });

    page.addEventListener("touchend", (e) => {

        const endX =
            e.changedTouches[0].clientX;

        const endY =
            e.changedTouches[0].clientY;

        const dx = endX - startX;
        const dy = endY - startY;

        if (Math.abs(dx) < 70) return;
        if (Math.abs(dy) > 80) return;

        if (dx < 0) {
            goNext();
        }

        if (dx > 0) {
            goPrev();
        }

    }, { passive: true });
}

/* -------------------------------- */
/* AUTO SAVE PROGRESS               */
/* -------------------------------- */

function sendProgress() {

    const surah =
        document.getElementById("surahSelect");

    const ayah =
        document.getElementById("ayahSelect");

    if (!surah || !ayah) return;

    fetch("/save_progress", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            surah: surah.value,
            ayah: ayah.value
        })
    });
}

/* -------------------------------- */
/* INIT                             */
/* -------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    audioPlayer =
        document.getElementById("audioPlayer");

    const surah =
        document.getElementById("surahSelect");

    const ayah =
        document.getElementById("ayahSelect");

    const totalAyahs =
        document.getElementById("totalAyahs");

    // theme

    const savedTheme =
        localStorage.getItem("theme") || "dark";

    setTheme(savedTheme);

    // ayah dropdown

    if (surah && ayah) {

        updateAyahList();

        surah.addEventListener(
            "change",
            sendProgress
        );

        ayah.addEventListener(
            "change",
            sendProgress
        );
    }

    // total ayahs

    if (totalAyahs) {

        totalAyahs.textContent =
            surahCounts[pageData.surah];
    }

    // audio ended

    if (audioPlayer) {

        audioPlayer.addEventListener(
            "ended",
            handleNext
        );
    }
});
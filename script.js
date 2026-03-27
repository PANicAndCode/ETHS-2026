const COOLDOWN_MINUTES = 10;
const STORAGE_PREFIX = "easter-hunt-supabase-v1";

let teamKey = null;
let state = null;
let now = Date.now();
let detector = null;
let stream = null;
let supabaseReady = false;
let supabaseClient = null;
let liveBoardCache = {};

const leaderboardModeText = document.getElementById("leaderboardModeText");

function initSupabase(){
  try{
    if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey || window.SUPABASE_CONFIG.url.startsWith("PASTE_")){
      leaderboardModeText.textContent = "Supabase is not configured yet. The page is using local browser leaderboard data until you add your Supabase keys.";
      return;
    }
    supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    supabaseReady = true;
    leaderboardModeText.textContent = "Live shared leaderboard is connected through Supabase.";
    fetchLeaderboard();
    subscribeLeaderboard();
  } catch (error){
    console.error(error);
    leaderboardModeText.textContent = "Supabase could not connect. The page is using local browser leaderboard data.";
  }
}

function storageKey(team){ return `${STORAGE_PREFIX}-${team}`; }
function leaderboardKey(){ return `${STORAGE_PREFIX}-leaderboard`; }
function defaultState(teamLabel){ return { teamName: teamLabel, progressIndex: 0, completed: [], scannedTokens: [], usedHints: 0, nextHintAt: null, finished: false, startedAt: Date.now(), lastUpdatedAt: Date.now() }; }
function loadState(team){ const saved = localStorage.getItem(storageKey(team)); return saved ? JSON.parse(saved) : defaultState(TEAMS[team].label); }
function saveLocalState(){ if (teamKey && state) localStorage.setItem(storageKey(teamKey), JSON.stringify(state)); }
function saveLocalBoard(){
  const board = JSON.parse(localStorage.getItem(leaderboardKey()) || "{}");
  board[teamKey] = { teamName: state.teamName, found: state.completed.length, finished: state.finished, lastUpdatedAt: state.lastUpdatedAt };
  localStorage.setItem(leaderboardKey(), JSON.stringify(board));
}
function localBoardRows(){
  const board = JSON.parse(localStorage.getItem(leaderboardKey()) || "{}");
  return Object.entries(TEAMS).map(([key, t]) => ({ key, teamName: board[key]?.teamName || t.label, found: board[key]?.found || 0, finished: board[key]?.finished || false, lastUpdatedAt: board[key]?.lastUpdatedAt || 0 })).sort((a,b) => (b.found - a.found) || (a.lastUpdatedAt - b.lastUpdatedAt));
}
function remoteBoardRows(){
  return Object.entries(TEAMS).map(([key, t]) => ({ key, teamName: liveBoardCache[key]?.team_name || t.label, found: liveBoardCache[key]?.found || 0, finished: liveBoardCache[key]?.finished || false, lastUpdatedAt: liveBoardCache[key]?.last_updated_at || 0 })).sort((a,b) => (b.found - a.found) || (a.lastUpdatedAt - b.lastUpdatedAt));
}
function boardRows(){ return supabaseReady ? remoteBoardRows() : localBoardRows(); }

async function fetchLeaderboard(){
  if (!supabaseReady) return;
  const { data, error } = await supabaseClient.from("leaderboard").select("*");
  if (error) { console.error(error); return; }
  liveBoardCache = {};
  (data || []).forEach(row => { liveBoardCache[row.team_id] = row; });
  renderBoard();
}

function subscribeLeaderboard(){
  if (!supabaseReady) return;
  supabaseClient
    .channel('leaderboard-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, payload => {
      const row = payload.new || payload.old;
      if (!row || !row.team_id) return;
      if (payload.eventType === 'DELETE') delete liveBoardCache[row.team_id];
      else liveBoardCache[row.team_id] = row;
      renderBoard();
    })
    .subscribe();
}

async function pushLeaderboard(){
  if (!teamKey || !state) return;
  if (!supabaseReady){ saveLocalBoard(); return; }
  const payload = {
    team_id: teamKey,
    team_name: state.teamName,
    found: state.completed.length,
    finished: state.finished,
    last_updated_at: state.lastUpdatedAt
  };
  const { error } = await supabaseClient.from("leaderboard").upsert(payload, { onConflict: "team_id" });
  if (error) console.error(error);
}

function fmtCountdown(ms){ const secs = Math.max(0, Math.ceil(ms/1000)); const m = Math.floor(secs/60); const s = secs%60; return `${m}:${String(s).padStart(2,"0")}`; }
function setFeedback(msg){ document.getElementById("feedbackBox").textContent = msg; }
function setPage(pageId){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("activePage"));
  document.getElementById(pageId).classList.add("activePage");
  document.querySelectorAll(".menuBtn").forEach(b => b.classList.toggle("active", b.dataset.page === pageId));
}
function renderGateTeams(selected){
  const mount = document.getElementById("gateTeamButtons"); mount.innerHTML = "";
  Object.entries(TEAMS).forEach(([key, team]) => {
    const btn = document.createElement("button");
    btn.className = "teamBtn" + (key === selected ? " selected" : "");
    btn.textContent = team.label;
    btn.onclick = () => { teamKey = key; renderGateTeams(teamKey); const existing = loadState(teamKey); document.getElementById("gateTeamName").value = existing.teamName || team.label; };
    mount.appendChild(btn);
  });
}
function renderTop(){
  const total = TEAMS[teamKey].sequence.length;
  document.getElementById("progressCount").textContent = `${state.completed.length} / ${total}`;
  document.getElementById("progressBar").style.width = `${(state.completed.length / total) * 100}%`;
  document.getElementById("hintCount").textContent = `${state.usedHints} / 3`;
  const locked = state.nextHintAt && now < state.nextHintAt;
  document.getElementById("hintStatus").textContent = locked ? `Next hint in ${fmtCountdown(state.nextHintAt - now)}` : (state.usedHints >= 3 ? "No hints left" : "Hint ready");
  document.getElementById("teamName").value = state.teamName;
  document.getElementById("teamDisplay").textContent = `${TEAMS[teamKey].label} • ${state.teamName}`;
}
function renderChores(){
  const seq = TEAMS[teamKey].sequence; const list = document.getElementById("choreList"); list.innerHTML = "";
  seq.forEach((id, idx) => {
    const div = document.createElement("div");
    div.className = idx < state.progressIndex ? "item complete" : idx === state.progressIndex ? "item active" : "item locked";
    const clue = CLUES[id];
    if (idx < state.progressIndex) div.innerHTML = `<strong>${clue.title}</strong>${clue.subtitle ? `<div class="muted">${clue.subtitle}</div>` : ""}<div class="muted">Found at: <strong>${clue.location}</strong></div>`;
    else if (idx === state.progressIndex) div.innerHTML = `<strong>${clue.title}</strong>${clue.subtitle ? `<div class="muted">${clue.subtitle}</div>` : ""}<div class="muted">Find the egg, then scan its QR code to unlock the next chore.</div>`;
    else div.innerHTML = `<strong>Locked chore</strong><div class="muted">Scan the correct egg to unlock this item.</div>`;
    list.appendChild(div);
  });
}
function renderMap(){
  const seq = TEAMS[teamKey].sequence; const mapPins = document.getElementById("mapPins"); mapPins.innerHTML = "";
  seq.forEach((id, idx) => {
    if (idx > state.progressIndex) return;
    const clue = CLUES[id]; const shown = idx < state.progressIndex;
    const pin = document.createElement("div"); pin.className = shown ? "pin complete" : "pin";
    pin.style.left = `${clue.zone.x}%`; pin.style.top = `${clue.zone.y}%`; pin.textContent = shown ? clue.location : "Current area hidden";
    mapPins.appendChild(pin);
  });
}
function renderHint(){
  const activeId = TEAMS[teamKey].sequence[state.progressIndex]; const clue = CLUES[activeId];
  const locked = state.nextHintAt && now < state.nextHintAt;
  const btn = document.getElementById("hintBtn"); const timerPill = document.getElementById("hintTimerPill");
  btn.disabled = state.usedHints >= 3 || locked || !clue;
  document.getElementById("hintsLeft").textContent = `Hints left: ${3 - state.usedHints}`;
  document.getElementById("hintBox").textContent = state.usedHints > 0 && clue ? clue.hint : "No hint displayed yet for this active clue.";
  if (locked){ timerPill.hidden = false; timerPill.textContent = fmtCountdown(state.nextHintAt - now); } else timerPill.hidden = true;
}
function renderBoard(){
  const el = document.getElementById("leaderboard"); el.innerHTML = "";
  boardRows().forEach((row, i) => {
    const div = document.createElement("div"); div.className = "leaderRow";
    div.innerHTML = `<div><strong>${i+1}. ${row.teamName}</strong><div class="muted">${row.finished ? "Finished" : "In progress"}</div></div><div><strong>${row.found}</strong><div class="small">clues found</div></div>`;
    el.appendChild(div);
  });
}
function renderAll(){ if (!teamKey || !state) return; saveLocalState(); pushLeaderboard(); renderTop(); renderChores(); renderMap(); renderHint(); renderBoard(); }
function unlockToken(token){
  const seq = TEAMS[teamKey].sequence; const expected = TOKENS[teamKey][state.progressIndex];
  if (!expected){ setFeedback("This team has already finished every clue."); return; }
  if (token.trim() !== expected){ setFeedback("That code does not match this team’s next egg."); return; }
  const finishedStep = seq[state.progressIndex];
  state.completed.push(finishedStep); state.scannedTokens.push(token.trim()); state.progressIndex += 1;
  state.finished = state.progressIndex >= seq.length || token.includes("FINISH"); state.lastUpdatedAt = Date.now();
  setFeedback(state.finished ? "You finished the hunt. Happy Easter!" : "Great job. Your next chore is unlocked."); renderAll();
}
async function initScanner(){
  if (!("BarcodeDetector" in window)){ document.getElementById("scanMessage").textContent = "Camera QR scanning is not supported on this device. Use manual code entry below."; return; }
  try{
    const formats = await BarcodeDetector.getSupportedFormats();
    if (!formats.includes("qr_code")){ document.getElementById("scanMessage").textContent = "QR format support is missing in this browser. Use manual code entry below."; return; }
    detector = new BarcodeDetector({formats:["qr_code"]}); stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
    const video = document.createElement("video"); video.setAttribute("playsinline","true"); video.autoplay = true; video.muted = true; video.srcObject = stream;
    const box = document.getElementById("videoBox"); box.innerHTML = ""; box.appendChild(video); document.getElementById("scanMessage").textContent = "Camera is live. Point it at the QR code inside the egg.";
    let lastScanned = ""; let lastScanAt = 0;
    const loop = async () => {
      try{
        const codes = await detector.detect(video);
        if (codes && codes.length){
          const val = codes[0].rawValue; const nowMs = Date.now();
          if (val && (val !== lastScanned || nowMs - lastScanAt > 2500)){ lastScanned = val; lastScanAt = nowMs; unlockToken(val); }
        }
      }catch(e){}
      requestAnimationFrame(loop);
    }; requestAnimationFrame(loop);
  } catch (e) { document.getElementById("scanMessage").textContent = "Camera access was unavailable. Use manual code entry below."; }
}
document.querySelectorAll(".menuBtn").forEach(btn => btn.addEventListener("click", () => setPage(btn.dataset.page)));
document.getElementById("startGameBtn").onclick = () => {
  if (!teamKey){ setFeedback("Choose a team first."); return; }
  const enteredName = document.getElementById("gateTeamName").value.trim();
  state = loadState(teamKey); state.teamName = enteredName || state.teamName || TEAMS[teamKey].label; state.lastUpdatedAt = Date.now();
  document.getElementById("teamGate").classList.add("hidden"); renderAll(); initScanner();
};
document.getElementById("unlockBtn").onclick = () => { const val = document.getElementById("manualCode").value.trim(); if (!val) return; unlockToken(val); document.getElementById("manualCode").value = ""; };
document.getElementById("hintBtn").onclick = () => {
  const locked = state.nextHintAt && now < state.nextHintAt; if (state.usedHints >= 3 || locked) return;
  state.usedHints += 1; state.nextHintAt = state.usedHints >= 3 ? null : Date.now() + COOLDOWN_MINUTES * 60 * 1000; state.lastUpdatedAt = Date.now(); renderAll();
};
document.getElementById("resetBtn").onclick = () => { state = defaultState(TEAMS[teamKey].label); renderAll(); setFeedback("Team progress has been reset."); };
document.getElementById("saveNameBtn").onclick = () => { const v = document.getElementById("teamName").value.trim(); if (!v) return; state.teamName = v; state.lastUpdatedAt = Date.now(); renderAll(); setFeedback("Team name saved."); };
initSupabase(); renderGateTeams(null); setPage("choresPage"); setInterval(() => { now = Date.now(); if (state){ renderTop(); renderHint(); } }, 1000);

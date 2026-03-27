const COOLDOWN_MINUTES = 10;
const STORAGE_PREFIX = "easter-hunt-supabase-progress-v3";
const ADMIN_PASSCODE = "bunnyboss";

let teamKey = null;
let state = null;
let now = Date.now();
let supabaseReady = false;
let supabaseClient = null;
let liveBoardCache = {};
let qrScanner = null;
let scannerStarted = false;
let scannerStarting = false;
let lastScanned = "";
let lastScanAt = 0;

function el(id){ return document.getElementById(id); }

function storageKey(team){ return `${STORAGE_PREFIX}-${team}`; }
function leaderboardKey(){ return `${STORAGE_PREFIX}-leaderboard`; }

function defaultState(teamLabel){
  return {
    teamName: teamLabel,
    progressIndex: 0,
    completed: [],
    scannedTokens: [],
    usedHints: 0,
    nextHintAt: null,
    finished: false,
    startedAt: Date.now(),
    lastUpdatedAt: Date.now()
  };
}

function loadLocalState(team){
  const saved = localStorage.getItem(storageKey(team));
  return saved ? JSON.parse(saved) : defaultState(TEAMS[team].label);
}
function saveLocalState(){
  if (teamKey && state) localStorage.setItem(storageKey(teamKey), JSON.stringify(state));
}
function saveLocalBoard(){
  if (!teamKey || !state) return;
  const board = JSON.parse(localStorage.getItem(leaderboardKey()) || "{}");
  board[teamKey] = { teamName: state.teamName, found: state.completed.length, finished: state.finished, lastUpdatedAt: state.lastUpdatedAt };
  localStorage.setItem(leaderboardKey(), JSON.stringify(board));
}
function localBoardRows(){
  const board = JSON.parse(localStorage.getItem(leaderboardKey()) || "{}");
  return Object.entries(TEAMS).map(([key, t]) => ({
    key, teamName: board[key]?.teamName || t.label, found: board[key]?.found || 0, finished: board[key]?.finished || false, lastUpdatedAt: board[key]?.lastUpdatedAt || 0
  })).sort((a,b)=> (b.found-a.found) || (a.lastUpdatedAt-b.lastUpdatedAt));
}
function remoteBoardRows(){
  return Object.entries(TEAMS).map(([key, t]) => ({
    key, teamName: liveBoardCache[key]?.team_name || t.label, found: liveBoardCache[key]?.found || 0, finished: liveBoardCache[key]?.finished || false, lastUpdatedAt: liveBoardCache[key]?.last_updated_at || 0
  })).sort((a,b)=> (b.found-a.found) || (a.lastUpdatedAt-b.lastUpdatedAt));
}
function boardRows(){ return supabaseReady ? remoteBoardRows() : localBoardRows(); }

function setFeedback(msg){ if (el("feedbackBox")) el("feedbackBox").textContent = msg; }
function fmtCountdown(ms){
  const secs = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function initSupabase(){
  try{
    if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey || window.SUPABASE_CONFIG.url.startsWith("PASTE_")){
      el("leaderboardModeText").textContent = "Using local device leaderboard only.";
      el("leaderboardModeText").hidden = false;
      renderBoard();
      return;
    }
    supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    supabaseReady = true;
    el("leaderboardModeText").textContent = "";
    el("leaderboardModeText").hidden = true;
    await fetchLeaderboard();
    subscribeLeaderboard();
  } catch (error){
    console.error(error);
    supabaseReady = false;
    el("leaderboardModeText").textContent = "Using local device leaderboard only.";
    el("leaderboardModeText").hidden = false;
    renderBoard();
  }
}

async function fetchLeaderboard(){
  if (!supabaseReady) return;
  const { data, error } = await supabaseClient.from("leaderboard").select("*");
  if (error){
    console.error(error);
    supabaseReady = false;
    el("leaderboardModeText").textContent = "Using local device leaderboard only.";
    el("leaderboardModeText").hidden = false;
    renderBoard();
    return;
  }
  liveBoardCache = {};
  (data || []).forEach(row => liveBoardCache[row.team_id] = row);
  renderBoard();
}
function subscribeLeaderboard(){
  if (!supabaseReady) return;
  supabaseClient.channel("leaderboard-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard" }, payload => {
      const row = payload.new || payload.old;
      if (!row || !row.team_id) return;
      if (payload.eventType === "DELETE") delete liveBoardCache[row.team_id];
      else liveBoardCache[row.team_id] = row;
      renderBoard();
    }).subscribe();
}
async function loadRemoteProgress(team){
  if (!supabaseReady) return null;
  const { data, error } = await supabaseClient.from("team_progress").select("*").eq("team_id", team).maybeSingle();
  if (error){
    console.error(error);
    return null;
  }
  if (!data) return null;
  return {
    teamName: data.team_name,
    progressIndex: data.progress_index ?? 0,
    completed: Array.isArray(data.completed) ? data.completed : [],
    scannedTokens: Array.isArray(data.scanned_tokens) ? data.scanned_tokens : [],
    usedHints: data.used_hints ?? 0,
    nextHintAt: data.next_hint_at,
    finished: !!data.finished,
    startedAt: data.started_at,
    lastUpdatedAt: data.last_updated_at
  };
}
async function getClaimedTeamName(team){
  const remote = await loadRemoteProgress(team);
  if (remote && remote.teamName && remote.teamName !== TEAMS[team].label) return remote.teamName;
  const row = liveBoardCache[team];
  if (row && row.team_name && row.team_name !== TEAMS[team].label) return row.team_name;
  const local = loadLocalState(team);
  if (local && local.teamName && local.teamName !== TEAMS[team].label) return local.teamName;
  return null;
}
function setGateNameLock(locked, value){
  const input = el("gateTeamName");
  input.value = value || "";
  input.readOnly = !!locked;
  input.disabled = !!locked;
  input.placeholder = locked ? "Team name already locked" : "Enter team name";
}
async function pushRemoteProgress(){
  if (!supabaseReady || !teamKey || !state) return;
  const payload = {
    team_id: teamKey,
    team_name: state.teamName,
    progress_index: state.progressIndex,
    completed: state.completed,
    scanned_tokens: state.scannedTokens,
    used_hints: state.usedHints,
    next_hint_at: state.nextHintAt,
    finished: state.finished,
    started_at: state.startedAt,
    last_updated_at: state.lastUpdatedAt
  };
  const { error } = await supabaseClient.from("team_progress").upsert(payload, { onConflict: "team_id" });
  if (error) console.error(error);
}
async function pushLeaderboard(){
  saveLocalBoard();
  if (!supabaseReady || !teamKey || !state) return;
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

function setPage(pageId){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("activePage"));
  const page = el(pageId);
  if (page) page.classList.add("activePage");
  document.querySelectorAll(".menuBtn").forEach(btn => btn.classList.toggle("active", btn.dataset.page === pageId));
  if (pageId === "scanPage") initScanner();
}

function renderGateTeams(selected){
  const mount = el("gateTeamButtons");
  mount.innerHTML = "";
  Object.entries(TEAMS).forEach(([key, team]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "teamBtn" + (key === selected ? " selected" : "");
    btn.textContent = team.label;
    btn.addEventListener("click", async () => {
      teamKey = key;
      renderGateTeams(teamKey);
      const claimedName = await getClaimedTeamName(teamKey);
      if (claimedName) setGateNameLock(true, claimedName);
      else {
        const local = loadLocalState(teamKey);
        setGateNameLock(false, (local && local.teamName && local.teamName !== team.label) ? local.teamName : "");
      }
    });
    mount.appendChild(btn);
  });
}

function renderTop(){
  if (!teamKey || !state) return;
  const total = TEAMS[teamKey].sequence.length;
  el("progressCount").textContent = `${state.completed.length} / ${total}`;
  el("progressBar").style.width = `${(state.completed.length / total) * 100}%`;
  el("hintCount").textContent = `${state.usedHints} / 3`;
  const locked = state.nextHintAt && now < state.nextHintAt;
  el("hintStatus").textContent = locked ? `Next hint in ${fmtCountdown(state.nextHintAt - now)}` : (state.usedHints >= 3 ? "No hints left" : "Hint ready");
  el("teamDisplay").textContent = `${TEAMS[teamKey].label} • ${state.teamName}`;
}
function renderChores(){
  if (!teamKey || !state) return;
  const seq = TEAMS[teamKey].sequence;
  const list = el("choreList");
  list.innerHTML = "";
  seq.forEach((id, idx) => {
    const div = document.createElement("div");
    div.className = idx < state.progressIndex ? "item complete" : idx === state.progressIndex ? "item active" : "item locked";
    const clue = CLUES[id];
    if (idx < state.progressIndex) {
      div.innerHTML = `<strong>${clue.title}</strong>${clue.subtitle ? `<div class="muted">${clue.subtitle}</div>` : ""}<div class="muted">Found at: <strong>${clue.location}</strong></div>`;
    } else if (idx === state.progressIndex) {
      div.innerHTML = `<strong>${clue.title}</strong>${clue.subtitle ? `<div class="muted">${clue.subtitle}</div>` : ""}<div class="muted">Find the egg, then scan its QR code to unlock the next chore.</div>`;
    } else {
      div.innerHTML = `<strong>Locked chore</strong><div class="muted">Scan the correct egg to unlock this item.</div>`;
    }
    list.appendChild(div);
  });
}
function renderMap(){
  if (!teamKey || !state) return;
  const seq = TEAMS[teamKey].sequence;
  const mapPins = el("mapPins");
  mapPins.innerHTML = "";
  seq.forEach((id, idx) => {
    if (idx > state.progressIndex) return;
    const clue = CLUES[id];
    const shown = idx < state.progressIndex;
    const pin = document.createElement("div");
    pin.className = shown ? "pin complete" : "pin";
    pin.style.left = `${clue.zone.x}%`;
    pin.style.top = `${clue.zone.y}%`;
    pin.textContent = shown ? clue.location : "Current area hidden";
    mapPins.appendChild(pin);
  });
}
function renderHint(){
  if (!teamKey || !state) return;
  const activeId = TEAMS[teamKey].sequence[state.progressIndex];
  const clue = CLUES[activeId];
  const locked = state.nextHintAt && now < state.nextHintAt;
  el("hintBtn").disabled = state.usedHints >= 3 || locked || !clue;
  el("hintsLeft").textContent = `Hints left: ${3 - state.usedHints}`;
  el("hintBox").textContent = state.usedHints > 0 && clue ? clue.hint : "No hint displayed yet for this active clue.";
  if (locked){
    el("hintTimerPill").hidden = false;
    el("hintTimerPill").textContent = fmtCountdown(state.nextHintAt - now);
  } else {
    el("hintTimerPill").hidden = true;
  }
}
function renderBoard(){
  const board = el("leaderboard");
  if (!board) return;
  board.innerHTML = "";
  boardRows().forEach((row, i) => {
    const div = document.createElement("div");
    div.className = "leaderRow";
    div.innerHTML = `<div><strong>${i + 1}. ${row.teamName}</strong><div class="muted">${row.finished ? "Finished" : "In progress"}</div></div><div><strong>${row.found}</strong><div class="small">clues found</div></div>`;
    board.appendChild(div);
  });
}

async function persistAll(){
  saveLocalState();
  saveLocalBoard();
  if (supabaseReady){
    await pushRemoteProgress();
    await pushLeaderboard();
  }
}
async function renderAll(){
  renderTop();
  renderChores();
  renderMap();
  renderHint();
  renderBoard();
  await persistAll();
}
async function unlockToken(token){
  if (!teamKey || !state) return;
  const seq = TEAMS[teamKey].sequence;
  const expected = TOKENS[teamKey][state.progressIndex];
  if (!expected){ setFeedback("This team has already finished every clue."); return; }
  if (token.trim() !== expected){ setFeedback("That code does not match this team’s next egg."); return; }
  const finishedStep = seq[state.progressIndex];
  state.completed.push(finishedStep);
  state.scannedTokens.push(token.trim());
  state.progressIndex += 1;
  state.finished = state.progressIndex >= seq.length || token.includes("FINISH");
  state.lastUpdatedAt = Date.now();
  setFeedback(state.finished ? "You finished the hunt. Happy Easter!" : "Great job. Your next chore is unlocked.");
  await renderAll();
}

async function initScanner(forceRestart = false){
  const scanMessage = el("scanMessage");
  const reader = el("qr-reader");
  if (!scanMessage || !reader) return;
  if (typeof Html5Qrcode === "undefined"){
    scanMessage.textContent = "QR scanner library did not load. Use manual code entry below.";
    return;
  }
  if (scannerStarting) return;
  if (scannerStarted && !forceRestart) return;

  scannerStarting = true;
  scanMessage.textContent = "Starting camera… If prompted, allow camera access.";

  try{
    if (forceRestart && qrScanner){
      try { if (qrScanner.isScanning) await qrScanner.stop(); } catch (e) {}
      try { await qrScanner.clear(); } catch (e) {}
      qrScanner = null;
      scannerStarted = false;
      reader.innerHTML = "";
    }

    if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");

    const onScan = async decodedText => {
      const nowMs = Date.now();
      if (decodedText && (decodedText !== lastScanned || nowMs - lastScanAt > 2500)){
        lastScanned = decodedText;
        lastScanAt = nowMs;
        await unlockToken(decodedText);
      }
    };

    const config = {
      fps: 10,
      qrbox: { width: 280, height: 280 },
      aspectRatio: 0.75,
      rememberLastUsedCamera: true
    };

    try {
      await qrScanner.start(
        { facingMode: { exact: "environment" } },
        config,
        onScan,
        () => {}
      );
    } catch (firstError) {
      await qrScanner.start(
        { facingMode: "environment" },
        config,
        onScan,
        () => {}
      );
    }

    scannerStarted = true;
    scanMessage.textContent = "Camera is live. Point it at the egg QR code, or type the code manually below.";
  } catch (error){
    console.error(error);
    scanMessage.textContent = "Camera could not start automatically. Tap Restart camera or use manual code entry below.";
    scannerStarted = false;
  } finally {
    scannerStarting = false;
  }
}

// Admin
function showAdminOverlay(){ const o = el("adminOverlay"); if (o) o.classList.remove("hidden"); }
function hideAdminOverlay(){ const o = el("adminOverlay"); if (o) o.classList.add("hidden"); }
function showAdminPanel(){ populateAdminTeams(); syncAdminFields(); const p = el("adminPanel"); if (p) p.classList.remove("hidden"); }
function hideAdminPanel(){ const p = el("adminPanel"); if (p) p.classList.add("hidden"); }
function openAdminPrompt(){
  hideAdminPanel();
  if (el("adminPasscode")) el("adminPasscode").value = "";
  if (el("adminFeedback")) el("adminFeedback").textContent = "Admin tools are hidden from players.";
  showAdminOverlay();
}

function populateAdminTeams(){
  const select = el("adminTeamSelect");
  const current = select.value || teamKey || "Team1";
  select.innerHTML = "";
  Object.entries(TEAMS).forEach(([key, team]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = team.label;
    if (key === current) opt.selected = true;
    select.appendChild(opt);
  });
}
async function syncAdminFields(){
  const team = el("adminTeamSelect").value;
  const remote = await loadRemoteProgress(team);
  const local = loadLocalState(team);
  const name = remote?.teamName || local.teamName || TEAMS[team].label;
  el("adminTeamName").value = name;
}
async function adminSaveTeamName(){
  const team = el("adminTeamSelect").value;
  const newName = el("adminTeamName").value.trim();
  if (!newName){ el("adminPanelFeedback").textContent = "Enter a team name first."; return; }
  let targetState = await loadRemoteProgress(team) || loadLocalState(team);
  targetState.teamName = newName;
  targetState.lastUpdatedAt = Date.now();
  localStorage.setItem(storageKey(team), JSON.stringify(targetState));
  const localBoard = JSON.parse(localStorage.getItem(leaderboardKey()) || "{}");
  localBoard[team] = { teamName: newName, found: targetState.completed.length, finished: targetState.finished, lastUpdatedAt: targetState.lastUpdatedAt };
  localStorage.setItem(leaderboardKey(), JSON.stringify(localBoard));
  if (supabaseReady){
    await supabaseClient.from("team_progress").upsert({
      team_id: team, team_name: newName, progress_index: targetState.progressIndex,
      completed: targetState.completed, scanned_tokens: targetState.scannedTokens, used_hints: targetState.usedHints,
      next_hint_at: targetState.nextHintAt, finished: targetState.finished, started_at: targetState.startedAt, last_updated_at: targetState.lastUpdatedAt
    }, { onConflict: "team_id" });
    await supabaseClient.from("leaderboard").upsert({
      team_id: team, team_name: newName, found: targetState.completed.length, finished: targetState.finished, last_updated_at: targetState.lastUpdatedAt
    }, { onConflict: "team_id" });
    liveBoardCache[team] = { team_id: team, team_name: newName, found: targetState.completed.length, finished: targetState.finished, last_updated_at: targetState.lastUpdatedAt };
  }
  if (teamKey === team && state){ state.teamName = newName; renderTop(); }
  renderBoard();
  el("adminPanelFeedback").textContent = "Team name updated.";
}
async function adminResetTeam(){
  const team = el("adminTeamSelect").value;
  const fresh = defaultState(TEAMS[team].label);
  localStorage.setItem(storageKey(team), JSON.stringify(fresh));
  const localBoard = JSON.parse(localStorage.getItem(leaderboardKey()) || "{}");
  localBoard[team] = { teamName: fresh.teamName, found: 0, finished: false, lastUpdatedAt: fresh.lastUpdatedAt };
  localStorage.setItem(leaderboardKey(), JSON.stringify(localBoard));
  if (supabaseReady){
    await supabaseClient.from("team_progress").upsert({
      team_id: team, team_name: fresh.teamName, progress_index: 0, completed: [], scanned_tokens: [], used_hints: 0,
      next_hint_at: null, finished: false, started_at: fresh.startedAt, last_updated_at: fresh.lastUpdatedAt
    }, { onConflict: "team_id" });
    await supabaseClient.from("leaderboard").upsert({
      team_id: team, team_name: fresh.teamName, found: 0, finished: false, last_updated_at: fresh.lastUpdatedAt
    }, { onConflict: "team_id" });
    liveBoardCache[team] = { team_id: team, team_name: fresh.teamName, found: 0, finished: false, last_updated_at: fresh.lastUpdatedAt };
  }
  if (teamKey === team){ state = fresh; await renderAll(); } else renderBoard();
  await syncAdminFields();
  el("adminPanelFeedback").textContent = "Selected team reset.";
}
async function adminReloadTeam(){
  const team = el("adminTeamSelect").value;
  if (!supabaseReady){ el("adminPanelFeedback").textContent = "Supabase is not configured."; return; }
  const remote = await loadRemoteProgress(team);
  if (!remote){ el("adminPanelFeedback").textContent = "No shared progress found for that team."; return; }
  localStorage.setItem(storageKey(team), JSON.stringify(remote));
  if (teamKey === team){ state = remote; renderTop(); renderChores(); renderMap(); renderHint(); renderBoard(); }
  await syncAdminFields();
  el("adminPanelFeedback").textContent = "Selected team reloaded from shared progress.";
}
function wireAdminEvents(){
  const rabbit = el("rabbitTrigger");
  if (rabbit){
    rabbit.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openAdminPrompt();
    };
    rabbit.addEventListener("touchend", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      openAdminPrompt();
    }, { passive: false });
  }

  if (el("adminCloseX")) el("adminCloseX").addEventListener("click", hideAdminOverlay);
  if (el("adminPanelCloseX")) el("adminPanelCloseX").addEventListener("click", hideAdminPanel);

  if (el("adminUnlockBtn")) el("adminUnlockBtn").addEventListener("click", () => {
    const pass = (el("adminPasscode")?.value || "").trim();
    if (pass === ADMIN_PASSCODE){
      hideAdminOverlay();
      showAdminPanel();
    } else {
      if (el("adminPasscode")) el("adminPasscode").value = "";
      hideAdminOverlay();
    }
  });

  if (el("adminOverlay")) el("adminOverlay").addEventListener("click", e => { if (e.target === el("adminOverlay")) hideAdminOverlay(); });
  if (el("adminPanel")) el("adminPanel").addEventListener("click", e => { if (e.target === el("adminPanel")) hideAdminPanel(); });

  if (el("adminTeamSelect")) el("adminTeamSelect").addEventListener("change", syncAdminFields);
  if (el("adminSaveNameBtn")) el("adminSaveNameBtn").addEventListener("click", adminSaveTeamName);
  if (el("adminResetTeamBtn")) el("adminResetTeamBtn").addEventListener("click", adminResetTeam);
  if (el("adminReloadTeamBtn")) el("adminReloadTeamBtn").addEventListener("click", adminReloadTeam);
}

document.querySelectorAll(".menuBtn").forEach(btn => btn.addEventListener("click", () => setPage(btn.dataset.page)));
el("startGameBtn").addEventListener("click", async () => {
  if (!teamKey){ setFeedback("Choose a team first."); return; }
  const claimedName = await getClaimedTeamName(teamKey);
  const enteredName = (el("gateTeamName").value || "").trim();
  let loaded = loadLocalState(teamKey);
  const remote = await loadRemoteProgress(teamKey);
  if (remote) loaded = remote;
  state = loaded;
  state.teamName = claimedName || enteredName || state.teamName || TEAMS[teamKey].label;
  state.lastUpdatedAt = Date.now();
  el("teamGate").classList.add("hidden");
  await renderAll();
  await initScanner();
});
el("unlockBtn").addEventListener("click", async () => {
  const val = el("manualCode").value.trim();
  if (!val) return;
  await unlockToken(val);
  el("manualCode").value = "";
});
el("restartCameraBtn")?.addEventListener("click", async () => {
  await initScanner(true);
});
el("hintBtn").addEventListener("click", async () => {
  if (!state) return;
  const locked = state.nextHintAt && now < state.nextHintAt;
  if (state.usedHints >= 3 || locked) return;
  state.usedHints += 1;
  state.nextHintAt = state.usedHints >= 3 ? null : Date.now() + COOLDOWN_MINUTES * 60 * 1000;
  state.lastUpdatedAt = Date.now();
  await renderAll();
});

(async function boot(){
  await initSupabase();
  renderGateTeams(null);
  setGateNameLock(false, "");
  renderBoard();
  setPage("choresPage");
  wireAdminEvents();
  setInterval(() => {
    now = Date.now();
    if (state){ renderTop(); renderHint(); }
  }, 1000);
})();

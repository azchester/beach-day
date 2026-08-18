(function () {
  "use strict";

  var session = null;
  var pathSession = null;
  var activeGame = null;
  var drag = null;
  var selectedId = null;
  var menuPick = "tidy";
  var cheerTimer = null;
  var pathAdvanceTimer = null;
  var hopTimer = null;
  var celebrateTimer = null;
  var KID_IDLE = "assets/kid.png";
  var KID_CELEBRATE = [
    "assets/kid.png",
    "assets/kid-cele-1.png",
    "assets/kid-cele-2.png",
    "assets/kid-cele-3.png",
    "assets/kid-cele-2.png",
    "assets/kid-cele-3.png"
  ];
  var KID_THINK = "assets/kid-think.png";
  var KID_LOOK = "assets/kid-look.png";
  var kidState = "still";
  var kidIdleTimer = null;
  var kidPoseTimer = null;
  var kidLookFlipTimer = null;
  var kidLastIdle = null;
  var kidThoughtThisStretch = false;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var menuScreen = document.getElementById("menu-screen");
  var difficultyScreen = document.getElementById("difficulty-screen");
  var playScreen = document.getElementById("play-screen");
  var pathScreen = document.getElementById("path-screen");
  var sandEl = document.getElementById("sand");
  var poolsEl = document.getElementById("pools");
  var hintEl = document.getElementById("round-hint");
  var pathHint = document.getElementById("path-hint");
  var pathBoard = document.getElementById("path-board");
  var puzzleScreen = document.getElementById("puzzle-screen");
  var puzzleField = document.getElementById("puzzle-field");
  var puzzlePreview = document.getElementById("puzzle-preview");
  var puzzlePreviewImg = document.getElementById("puzzle-preview-img");
  var puzzleTidy = document.getElementById("puzzle-tidy");
  var puzzlePeek = document.getElementById("puzzle-peek");
  var puzzlePeekImg = document.getElementById("puzzle-peek-img");
  var puzzlePeekClose = document.getElementById("puzzle-peek-close");
  var puzzlePeekDim = document.getElementById("puzzle-peek-dim");
  var puzzleSession = null;
  var puzzlePos = {};
  var puzzleCell = 72;
  var puzzleTab = 16;
  var cheerEl = document.getElementById("cheer");
  var cheerWords = document.getElementById("cheer-words");
  var playAgainBtn = document.getElementById("play-again");
  var moreGamesBtn = document.getElementById("more-games");
  var exhibits = document.getElementById("exhibits");
  var menuCrab = document.getElementById("menu-crab");
  var difficultyTitle = document.querySelector("#difficulty-screen h1");
  var pendingGame = "tidy";

  function show(el) {
    el.hidden = false;
    el.classList.remove("hidden");
  }

  function hide(el) {
    el.hidden = true;
    el.classList.add("hidden");
  }

  function hideCheer() {
    hide(cheerEl);
    cheerEl.classList.remove("is-puzzle");
    if (puzzleScreen) puzzleScreen.classList.remove("is-won");
    hide(playAgainBtn);
    hide(moreGamesBtn);
    if (pathAdvanceTimer) {
      window.clearTimeout(pathAdvanceTimer);
      pathAdvanceTimer = null;
    }
    stopCelebrate();
    maybeStartKidIdle();
  }

  function closePuzzlePeek() {
    if (puzzlePeek) hide(puzzlePeek);
    maybeStartKidIdle();
  }

  function openPuzzlePeek() {
    if (!puzzleSession || !puzzlePeek || !puzzlePeekImg) return;
    puzzlePeekImg.src = Puzzle.pictureSrc(puzzleSession);
    show(puzzlePeek);
    stopKidIdle();
  }

  function peekOpen() {
    return puzzlePeek && !puzzlePeek.hidden;
  }

  function paintKids() {
    document.querySelectorAll("[data-kid]").forEach(function (el) {
      el.innerHTML = '<img class="kid-art" src="' + KID_IDLE + '" alt="" draggable="false" />';
    });
    document.querySelectorAll(".kid-art").forEach(function (img) {
      img.addEventListener("error", function () {
        if (img.getAttribute("src") === KID_IDLE) return;
        resetKidArt(img);
        kidState = "still";
      });
    });
    [KID_THINK, KID_LOOK].forEach(function (src) {
      var pre = new Image();
      pre.src = src;
    });
  }

  function setKidSrc(src) {
    document.querySelectorAll(".kid-art").forEach(function (img) {
      img.src = src;
    });
  }

  function stopCelebrate() {
    if (celebrateTimer) {
      window.clearInterval(celebrateTimer);
      celebrateTimer = null;
    }
    document.querySelectorAll(".cheer-kid, .path-kid, .sand-kid").forEach(function (el) {
      el.classList.remove("is-cheering");
    });
    setKidSrc(KID_IDLE);
  }

  function celebrateKid() {
    stopKidIdle();
    stopCelebrate();
    var cheerKid = document.querySelector(".cheer-kid");
    if (reduceMotion) {
      setKidSrc(KID_CELEBRATE[KID_CELEBRATE.length - 1]);
      return;
    }
    if (cheerKid) {
      cheerKid.classList.remove("is-cheering");
      void cheerKid.offsetWidth;
      cheerKid.classList.add("is-cheering");
    }
    var i = 0;
    setKidSrc(KID_CELEBRATE[0]);
    celebrateTimer = window.setInterval(function () {
      i += 1;
      if (i >= KID_CELEBRATE.length) {
        window.clearInterval(celebrateTimer);
        celebrateTimer = null;
        setKidSrc(KID_CELEBRATE[KID_CELEBRATE.length - 1]);
        return;
      }
      setKidSrc(KID_CELEBRATE[i]);
    }, 140);
  }

  function visibleKidHost() {
    if (playScreen && !playScreen.hidden) return playScreen.querySelector(".sand-kid");
    if (pathScreen && !pathScreen.hidden) return pathScreen.querySelector(".path-kid");
    if (puzzleScreen && !puzzleScreen.hidden) return puzzleScreen.querySelector(".puzzle-kid");
    return null;
  }

  function visibleKidArt() {
    var host = visibleKidHost();
    return host ? host.querySelector(".kid-art") : null;
  }

  function clearKidTimers() {
    if (kidIdleTimer) {
      window.clearTimeout(kidIdleTimer);
      kidIdleTimer = null;
    }
    if (kidPoseTimer) {
      window.clearTimeout(kidPoseTimer);
      kidPoseTimer = null;
    }
    if (kidLookFlipTimer) {
      window.clearTimeout(kidLookFlipTimer);
      kidLookFlipTimer = null;
    }
  }

  function resetKidArt(img) {
    if (!img) return;
    img.src = KID_IDLE;
    img.classList.remove("is-looking-right", "is-nodding", "is-hmm", "is-fidgeting");
  }

  function stopKidIdle() {
    clearKidTimers();
    kidState = "still";
    resetKidArt(visibleKidArt());
  }

  function scheduleKidIdle() {
    if (reduceMotion) return;
    if (kidIdleTimer) window.clearTimeout(kidIdleTimer);
    kidIdleTimer = window.setTimeout(function () {
      kidIdleTimer = null;
      playKidPose(BeachKid.nextIdle(kidLastIdle, kidThoughtThisStretch, Math.random));
    }, BeachKid.idleDelay(Math.random));
  }

  function startKidIdle() {
    stopKidIdle();
    kidThoughtThisStretch = false;
    kidLastIdle = null;
    scheduleKidIdle();
  }

  function maybeStartKidIdle() {
    if (reduceMotion) return;
    if (cheerEl && !cheerEl.hidden) return;
    if (peekOpen()) return;
    if (!visibleKidHost()) return;
    startKidIdle();
  }

  function noteKidPlay() {
    kidThoughtThisStretch = false;
    if (kidIdleTimer) {
      window.clearTimeout(kidIdleTimer);
      kidIdleTimer = null;
    }
  }

  function playKidPose(kind, side) {
    if (reduceMotion) return;
    if (!BeachKid.canStart(kidState)) return;
    var img = visibleKidArt();
    if (!img) return;
    if (kidIdleTimer) {
      window.clearTimeout(kidIdleTimer);
      kidIdleTimer = null;
    }
    kidState = "posing";
    resetKidArt(img);
    if (kind === "think") {
      img.src = KID_THINK;
      kidThoughtThisStretch = true;
      kidLastIdle = "think";
    } else if (kind === "glance" || kind === "look") {
      img.src = KID_LOOK;
      if (kind === "glance" && side === "right") img.classList.add("is-looking-right");
      if (kind === "look") {
        kidLastIdle = "look";
        kidLookFlipTimer = window.setTimeout(function () {
          kidLookFlipTimer = null;
          img.classList.add("is-looking-right");
        }, Math.floor(BeachKid.POSE_MS.look / 2));
      }
    } else if (kind === "nod") {
      img.classList.add("is-nodding");
    } else if (kind === "hmm") {
      img.classList.add("is-hmm");
    } else if (kind === "fidget") {
      img.classList.add("is-fidgeting");
      kidLastIdle = "fidget";
    }
    var ms = BeachKid.POSE_MS[kind] || 600;
    kidPoseTimer = window.setTimeout(function () {
      kidPoseTimer = null;
      resetKidArt(img);
      kidState = "still";
      scheduleKidIdle();
    }, ms);
  }

  function reactKid(kind, info, targetEl) {
    if (reduceMotion) return;
    noteKidPlay();
    if (!BeachKid.shouldReact(kind, info || {})) {
      // A winning move is about to cheer; do not arm an idle under the overlay.
      if (kidState === "still" && !(info && info.won)) scheduleKidIdle();
      return;
    }
    if (!BeachKid.canStart(kidState)) return;
    var side;
    if (kind === "glance" && targetEl) {
      var host = visibleKidHost();
      if (host) {
        var kr = host.getBoundingClientRect();
        var tr = targetEl.getBoundingClientRect();
        side = BeachKid.glanceSide(kr.left + kr.width / 2, tr.left + tr.width / 2);
      }
    }
    playKidPose(kind, side);
  }

  function pieceSrc(kind, variant, color) {
    return "assets/" + kind + "-" + variant + "-" + color + ".png";
  }

  function art(kind, variant, color) {
    return (
      '<img class="piece-art" src="' +
      pieceSrc(kind, variant, color) +
      '" alt="" draggable="false" />'
    );
  }

  function crabGlyph() {
    return '<img class="glyph" src="assets/crab.png" alt="" draggable="false" />';
  }

  function bucketGlyph() {
    return '<img class="glyph" src="assets/bucket.png" alt="" draggable="false" />';
  }

  function poolPicture(picture) {
    if (picture === "orange-shell") return art("shell", "scallop", "orange");
    if (picture === "shell") return art("shell", "scallop", "peach");
    if (picture === "rock") return art("rock", "pebble", "gray");
    return art("sandcastle", "turret", "sand");
  }

  function pieceButton(item, inPool) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "piece" + (inPool ? " in-pool" : "");
    btn.dataset.id = item.id;
    btn.setAttribute("aria-label", item.label);
    btn.innerHTML = art(item.kind, item.variant, item.color);
    return btn;
  }

  function pulse(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    window.setTimeout(function () {
      el.classList.remove(cls);
    }, reduceMotion ? 0 : 450);
  }

  function goMenu() {
    stopKidIdle();
    if (cheerTimer) window.clearTimeout(cheerTimer);
    if (hopTimer) window.clearTimeout(hopTimer);
    activeGame = null;
    hide(playScreen);
    hide(pathScreen);
    hide(puzzleScreen);
    hide(difficultyScreen);
    closePuzzlePeek();
    hideCheer();
    show(menuScreen);
    setMenuPick(menuPick || "tidy", false);
  }

  function placeMenuCrab(game) {
    if (!menuCrab || !menuScreen) return;
    var card = exhibits.querySelector('[data-game="' + game + '"]');
    var dx = BeachMenu.crabOffsetPx(
      menuScreen.getBoundingClientRect(),
      card ? card.getBoundingClientRect() : null
    );
    menuCrab.style.setProperty("--crab-x", dx + "px");
  }

  function setMenuPick(game, scuttle) {
    menuPick = game;
    [].forEach.call(exhibits.querySelectorAll(".exhibit"), function (btn) {
      var on = btn.dataset.game === game;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    placeMenuCrab(game);
    if (scuttle && !reduceMotion) {
      menuCrab.classList.remove("scuttle");
      void menuCrab.offsetWidth;
      menuCrab.classList.add("scuttle");
    }
  }

  function openGame(game) {
    hideCheer();
    pendingGame = game;
    if (difficultyTitle) {
      difficultyTitle.textContent =
        game === "path" ? "Crab Path" : game === "puzzle" ? "Beach Puzzle" : "Tide Pool Tidy";
    }
    hide(menuScreen);
    hide(playScreen);
    hide(pathScreen);
    hide(puzzleScreen);
    show(difficultyScreen);
  }

  exhibits.addEventListener("pointerenter", function (event) {
    var btn = event.target.closest ? event.target.closest(".exhibit") : null;
    if (btn) setMenuPick(btn.dataset.game, true);
  }, true);

  exhibits.addEventListener("focusin", function (event) {
    var btn = event.target.closest ? event.target.closest(".exhibit") : null;
    if (btn) setMenuPick(btn.dataset.game, true);
  });

  exhibits.addEventListener("click", function (event) {
    var btn = event.target.closest ? event.target.closest(".exhibit") : null;
    if (!btn) return;
    setMenuPick(btn.dataset.game, true);
    btn.classList.remove("hop");
    void btn.offsetWidth;
    btn.classList.add("hop");
    if (hopTimer) window.clearTimeout(hopTimer);
    hopTimer = window.setTimeout(function () {
      openGame(btn.dataset.game);
    }, reduceMotion ? 0 : 280);
  });

  document.addEventListener("keydown", function (event) {
    if (menuScreen.hidden) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      var games = BeachMenu.gameIds(exhibits.querySelectorAll(".exhibit"));
      if (!games.length) return;
      var at = games.indexOf(menuPick);
      if (at < 0) at = 0;
      if (event.key === "ArrowRight") at = (at + 1) % games.length;
      else at = (at + games.length - 1) % games.length;
      setMenuPick(games[at], true);
      exhibits.querySelector('[data-game="' + menuPick + '"]').focus();
    }
    if (event.key === "Enter" && menuPick) {
      event.preventDefault();
      openGame(menuPick);
    }
  });

  document.querySelectorAll("[data-back]").forEach(function (btn) {
    btn.addEventListener("click", goMenu);
  });

  document.querySelectorAll("[data-difficulty]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (pendingGame === "path") startPath(btn.dataset.difficulty);
      else if (pendingGame === "puzzle") startPuzzle(btn.dataset.difficulty);
      else startTidy(btn.dataset.difficulty);
    });
  });

  moreGamesBtn.addEventListener("click", goMenu);

  playAgainBtn.addEventListener("click", function () {
    if (cheerTimer) window.clearTimeout(cheerTimer);
    hideCheer();
    if (activeGame === "path") {
      pathSession = CrabPath.playAgain(pathSession);
      renderPath();
    } else if (activeGame === "puzzle") {
      startPuzzleDeal(Puzzle.playAgain(puzzleSession));
    } else {
      selectedId = null;
      session = TidePool.playAgain(session);
      renderTidy();
    }
  });

  function startTidy(difficulty) {
    activeGame = "tidy";
    selectedId = null;
    session = TidePool.createSession({ difficulty: difficulty });
    hide(menuScreen);
    hide(difficultyScreen);
    hide(pathScreen);
    hide(puzzleScreen);
    show(playScreen);
    hideCheer();
    renderTidy();
  }

  function renderTidyHint() {
    var n = session.roundIndex + 1;
    var extra = session.twoRule ? " This pool wants orange shells." : "";
    hintEl.textContent = "Round " + n + " of " + TidePool.ROUND_COUNT + "." + extra;
  }

  function renderSand() {
    sandEl.innerHTML = "";
    session.sandIds.forEach(function (id) {
      var item = TidePool.itemById(session, id);
      var btn = pieceButton(item, false);
      if (item.id === selectedId) btn.classList.add("selected");
      sandEl.appendChild(btn);
      bindDrag(btn, item);
    });
  }

  function renderPools() {
    poolsEl.innerHTML = "";
    var round = TidePool.currentRound(session);
    round.pools.forEach(function (pool) {
      var el = document.createElement("div");
      el.className = "pool";
      el.dataset.pool = pool.id;
      var label = pool.picture === "orange-shell" ? "orange shells" : pool.label;
      el.innerHTML =
        '<div class="pool-art">' +
        poolPicture(pool.picture) +
        "</div>" +
        '<div class="pool-catch" data-catch="' +
        pool.id +
        '"></div>' +
        '<p class="pool-name">' +
        label +
        "</p>";
      var catcher = el.querySelector(".pool-catch");
      session.placed[pool.id].forEach(function (id) {
        var item = TidePool.itemById(session, id);
        catcher.appendChild(pieceButton(item, true));
      });
      poolsEl.appendChild(el);
    });
  }

  function renderTidy() {
    renderTidyHint();
    renderSand();
    renderPools();
  }

  function poolFromPoint(x, y) {
    var stack = document.elementsFromPoint(x, y);
    for (var i = 0; i < stack.length; i++) {
      var node = stack[i].closest ? stack[i].closest("[data-pool]") : null;
      if (node) return node;
    }
    return null;
  }

  function liftPiece(btn, event) {
    var rect = btn.getBoundingClientRect();
    btn.classList.add("dragging");
    btn.style.left = rect.left + "px";
    btn.style.top = rect.top + "px";
    btn.style.width = rect.width + "px";
    btn.style.height = rect.height + "px";
    btn.style.left = event.clientX - drag.dx + "px";
    btn.style.top = event.clientY - drag.dy + "px";
  }

  function bindDrag(btn, item) {
    btn.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      var rect = btn.getBoundingClientRect();
      drag = {
        id: item.id,
        btn: btn,
        dx: event.clientX - rect.left,
        dy: event.clientY - rect.top,
        startX: event.clientX,
        startY: event.clientY,
        moved: false
      };
      reactKid("glance", { isDeselect: selectedId === item.id }, btn);
      try {
        btn.setPointerCapture(event.pointerId);
      } catch (err) {}
    });

    btn.addEventListener("pointermove", function (event) {
      if (!drag || drag.btn !== btn) return;
      var dist = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (!drag.moved && dist < 10) return;
      if (!drag.moved) {
        drag.moved = true;
        liftPiece(btn, event);
        return;
      }
      btn.style.left = event.clientX - drag.dx + "px";
      btn.style.top = event.clientY - drag.dy + "px";
    });

    btn.addEventListener("pointerup", finishPointer);
    btn.addEventListener("pointercancel", finishPointer);
  }

  function tryDrop(itemId, poolEl) {
    if (!poolEl) return false;
    var result = TidePool.drop(session, itemId, poolEl.dataset.pool);
    session = result.session;
    selectedId = result.ok ? null : itemId;
    renderTidy();
    var fresh = poolsEl.querySelector('[data-pool="' + poolEl.dataset.pool + '"]');
    pulse(fresh, result.ok ? "splash" : "wiggle");
    if (result.ok) {
      reactKid("nod", { won: session.complete });
      if (session.complete) afterTidyRound();
    } else {
      reactKid("hmm", { didMiss: true });
    }
    return true;
  }

  function finishPointer(event) {
    if (!drag) return;
    var btn = drag.btn;
    var id = drag.id;
    var moved = drag.moved;
    var poolEl = poolFromPoint(event.clientX, event.clientY);
    drag = null;
    btn.classList.remove("dragging");
    btn.style.left = "";
    btn.style.top = "";
    btn.style.width = "";
    btn.style.height = "";

    if (!moved) {
      selectedId = selectedId === id ? null : id;
      renderTidy();
      return;
    }

    if (!tryDrop(id, poolEl)) renderTidy();
  }

  poolsEl.addEventListener("click", function (event) {
    if (!selectedId) return;
    var poolEl = event.target.closest ? event.target.closest("[data-pool]") : null;
    tryDrop(selectedId, poolEl);
  });

  function afterTidyRound() {
    selectedId = null;
    cheerWords.textContent = "All tidy!";
    show(cheerEl);
    celebrateKid();
    if (session.roundIndex >= TidePool.ROUND_COUNT - 1) {
      session = TidePool.advance(session);
      show(playAgainBtn);
      show(moreGamesBtn);
      return;
    }
    hide(playAgainBtn);
    hide(moreGamesBtn);
    var wait = reduceMotion ? 0 : 2000;
    cheerTimer = window.setTimeout(function () {
      session = TidePool.advance(session);
      hideCheer();
      renderTidy();
    }, wait);
  }

  function startPath(difficulty) {
    activeGame = "path";
    pathSession = CrabPath.createSession({ difficulty: difficulty });
    hide(menuScreen);
    hide(difficultyScreen);
    hide(playScreen);
    hide(puzzleScreen);
    show(pathScreen);
    hideCheer();
    renderPath();
  }

  function renderPath() {
    var level = CrabPath.currentLevel(pathSession);
    var moves = CrabPath.legalMoves(pathSession);
    var legal = {};
    moves.forEach(function (m) {
      legal[m.x + "," + m.y] = true;
    });
    pathHint.textContent =
      "Path " + (pathSession.levelIndex + 1) + " of " + CrabPath.PATH_COUNT + ". Tap a glowing square.";
    pathBoard.innerHTML = "";
    for (var y = 0; y < level.height; y++) {
      var row = document.createElement("div");
      row.className = "path-row";
      for (var x = 0; x < level.width; x++) {
        var type = CrabPath.cellAt(pathSession, x, y);
        var here = pathSession.crab.x === x && pathSession.crab.y === y;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tile " + type;
        btn.dataset.x = String(x);
        btn.dataset.y = String(y);
        if (here) btn.classList.add("here");
        if (legal[x + "," + y]) btn.classList.add("legal");
        if (type === "rock") btn.setAttribute("aria-label", "rock");
        else if (type === "water") btn.setAttribute("aria-label", "water");
        else if (here) btn.setAttribute("aria-label", "crab");
        else if (type === "goal") btn.setAttribute("aria-label", "bucket");
        else btn.setAttribute("aria-label", "sand");
        if (here) btn.innerHTML = crabGlyph();
        else if (type === "goal") btn.innerHTML = bucketGlyph();
        row.appendChild(btn);
      }
      pathBoard.appendChild(row);
    }
  }

  pathBoard.addEventListener("click", function (event) {
    var tile = event.target.closest ? event.target.closest(".tile") : null;
    if (!tile || !pathSession || pathSession.complete) return;
    var x = Number(tile.dataset.x);
    var y = Number(tile.dataset.y);
    var result = CrabPath.step(pathSession, x, y);
    if (!result.ok) {
      pulse(tile, "wiggle");
      reactKid("hmm", { didMiss: true });
      return;
    }
    pathSession = result.session;
    renderPath();
    var fresh = pathBoard.querySelector('[data-x="' + x + '"][data-y="' + y + '"]');
    pulse(fresh, "splash");
    if (pathSession.complete) afterPath();
    else reactKid("nod", {});
  });

  function afterPath() {
    cheerWords.textContent = "You found the bucket!";
    celebrateKid();
    var pathKid = document.querySelector(".path-kid");
    if (pathKid) pathKid.classList.add("is-cheering");
    function showWinBanner() {
      show(cheerEl);
      var cheerKid = document.querySelector(".cheer-kid");
      if (cheerKid) {
        cheerKid.classList.remove("is-cheering");
        void cheerKid.offsetWidth;
        cheerKid.classList.add("is-cheering");
      }
    }
    if (pathSession.levelIndex >= CrabPath.PATH_COUNT - 1) {
      showWinBanner();
      pathSession = CrabPath.advance(pathSession);
      show(playAgainBtn);
      show(moreGamesBtn);
      return;
    }
    hide(playAgainBtn);
    hide(moreGamesBtn);
    if (reduceMotion) {
      showWinBanner();
      pathSession = CrabPath.advance(pathSession);
      hideCheer();
      renderPath();
      return;
    }
    cheerTimer = window.setTimeout(showWinBanner, 550);
    pathAdvanceTimer = window.setTimeout(function () {
      pathAdvanceTimer = null;
      pathSession = CrabPath.advance(pathSession);
      hideCheer();
      renderPath();
    }, 2400);
  }

  function jigPt(x1, y1, tx, ty, nx, ny, along, out) {
    return {
      x: x1 + tx * along + nx * out,
      y: y1 + ty * along + ny * out
    };
  }

  function jigCmd(cmd, p) {
    return " " + cmd + " " + p.x.toFixed(2) + " " + p.y.toFixed(2);
  }

  function jigEdgePath(x1, y1, x2, y2, ox, oy, kind, tab) {
    if (kind === "flat") return " L " + x2.toFixed(2) + " " + y2.toFixed(2);
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy) || 1;
    var tx = dx / len;
    var ty = dy / len;
    var sign = kind === "tab" ? 1 : -1;
    var nx = ox * sign;
    var ny = oy * sign;
    var mid = len * 0.5;
    var r = tab * 0.52;
    var centerOut = tab * 0.4;
    function p(along, out) {
      return jigPt(x1, y1, tx, ty, nx, ny, along, out);
    }
    function knob(deg) {
      var rad = (deg * Math.PI) / 180;
      return p(mid + Math.sin(rad) * r, centerOut + Math.cos(rad) * r);
    }
    var neck = Math.sqrt(Math.max(0, r * r - centerOut * centerOut));
    return (
      jigCmd("L", p(mid - neck, 0)) +
      jigCmd("C", p(mid - neck, 0)) +
      jigCmd("", knob(-125)) +
      jigCmd("", knob(-80)) +
      jigCmd("C", knob(-40)) +
      jigCmd("", knob(40)) +
      jigCmd("", knob(80)) +
      jigCmd("C", knob(125)) +
      jigCmd("", p(mid + neck, 0)) +
      jigCmd("", p(mid + neck, 0)) +
      " L " + x2.toFixed(2) + " " + y2.toFixed(2)
    );
  }

  function jigClip(session, id, cell, tab) {
    var x0 = tab;
    var y0 = tab;
    var x1 = tab + cell;
    var y1 = tab + cell;
    var d = "M " + x0 + " " + y0;
    d += jigEdgePath(x0, y0, x1, y0, 0, -1, Puzzle.edge(session, id, "n"), tab);
    d += jigEdgePath(x1, y0, x1, y1, 1, 0, Puzzle.edge(session, id, "e"), tab);
    d += jigEdgePath(x1, y1, x0, y1, 0, 1, Puzzle.edge(session, id, "s"), tab);
    d += jigEdgePath(x0, y1, x0, y0, -1, 0, Puzzle.edge(session, id, "w"), tab);
    return d + " Z";
  }

  function puzzleMetrics(session) {
    var stage = puzzleField.getBoundingClientRect();
    var maxW = Math.max(280, stage.width - 24);
    var maxH = Math.max(280, stage.height - 24);
    var cell = Math.floor(Math.min(maxW / session.cols, maxH / session.rows));
    if (cell < 44) cell = 44;
    if (cell > 110) cell = 110;
    return { cell: cell, tab: Math.round(cell * 0.3) };
  }

  function startPuzzle(difficulty) {
    activeGame = "puzzle";
    hide(menuScreen);
    hide(difficultyScreen);
    hide(playScreen);
    hide(pathScreen);
    show(puzzleScreen);
    hideCheer();
    window.requestAnimationFrame(function () {
      startPuzzleDeal(Puzzle.createSession({ difficulty: difficulty }));
    });
  }

  function fieldSize() {
    var field = puzzleField.getBoundingClientRect();
    return { w: field.width, h: field.height, box: puzzleCell + puzzleTab * 2 };
  }

  function applyPuzzlePos() {
    Object.keys(puzzlePos).forEach(function (id) {
      var el = puzzleField.querySelector('[data-id="' + id + '"]');
      if (!el) return;
      el.style.left = puzzlePos[id].x + "px";
      el.style.top = puzzlePos[id].y + "px";
    });
  }

  function rectOnField(el, field) {
    if (!el) return { x: 0, y: 0, w: 0, h: 0 };
    var r = el.getBoundingClientRect();
    return {
      x: r.left - field.left,
      y: r.top - field.top,
      w: r.width,
      h: r.height
    };
  }

  function unionRect(a, b) {
    var x = Math.min(a.x, b.x);
    var y = Math.min(a.y, b.y);
    var r = Math.max(a.x + a.w, b.x + b.w);
    var bot = Math.max(a.y + a.h, b.y + b.h);
    return { x: x, y: y, w: r - x, h: bot - y };
  }

  function tidyPuzzle() {
    if (!puzzleSession || puzzleSession.complete || peekOpen()) return;
    var field = puzzleField.getBoundingClientRect();
    var kid = puzzleScreen.querySelector(".puzzle-kid");
    var preview = rectOnField(puzzlePreview, field);
    var reserve = unionRect(rectOnField(puzzleTidy, field), rectOnField(kid, field));
    puzzlePos = PuzzleLayout.tidyPositions({
      groups: puzzleSession.groups,
      pos: puzzlePos,
      box: puzzleCell + puzzleTab * 2,
      fieldW: field.width,
      fieldH: field.height,
      preview: preview,
      reserve: reserve,
      gap: 10,
      complete: puzzleSession.complete
    });
    applyPuzzlePos();
  }

  function startPuzzleDeal(next) {
    closePuzzlePeek();
    puzzleSession = next;
    var src = Puzzle.pictureSrc(puzzleSession);
    if (puzzlePreviewImg) puzzlePreviewImg.src = src;
    if (puzzlePeekImg && peekOpen()) puzzlePeekImg.src = src;
    var m = puzzleMetrics(puzzleSession);
    puzzleCell = m.cell;
    puzzleTab = m.tab;
    var box = puzzleCell + puzzleTab * 2;
    var field = puzzleField.getBoundingClientRect();
    var maxX = Math.max(12, field.width - box - 12);
    var maxY = Math.max(12, field.height - box - 88);
    puzzlePos = {};
    var id;
    for (id = 0; id < puzzleSession.rows * puzzleSession.cols; id++) {
      puzzlePos[id] = {
        x: 12 + Math.random() * maxX,
        y: 12 + Math.random() * maxY
      };
    }
    for (id = 0; id < puzzleSession.rows * puzzleSession.cols; id++) {
      puzzlePos = PuzzleLayout.clampGroup(puzzlePos, [id], box, field.width, field.height);
    }
    renderPuzzle();
  }

  function renderPuzzle() {
    puzzleField.innerHTML = "";
    var src = Puzzle.pictureSrc(puzzleSession);
    if (puzzlePreviewImg) puzzlePreviewImg.src = src;
    if (puzzlePeekImg && peekOpen()) puzzlePeekImg.src = src;
    var cell = puzzleCell;
    var tab = puzzleTab;
    var box = cell + tab * 2;
    var fullW = puzzleSession.cols * cell;
    var fullH = puzzleSession.rows * cell;
    var id;
    for (id = 0; id < puzzleSession.rows * puzzleSession.cols; id++) {
      var rc = Puzzle.rowCol(puzzleSession, id);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jig";
      btn.dataset.id = String(id);
      btn.style.width = box + "px";
      btn.style.height = box + "px";
      btn.style.left = puzzlePos[id].x + "px";
      btn.style.top = puzzlePos[id].y + "px";
      var d = jigClip(puzzleSession, id, cell, tab);
      var clipId = "jigclip-" + id;
      var imgX = tab - rc.col * cell;
      var imgY = tab - rc.row * cell;
      btn.innerHTML =
        '<svg viewBox="0 0 ' +
        box +
        " " +
        box +
        '" width="' +
        box +
        '" height="' +
        box +
        '" overflow="visible" aria-hidden="true">' +
        '<defs><clipPath id="' +
        clipId +
        '"><path d="' +
        d +
        '"/></clipPath></defs>' +
        '<image href="' +
        src +
        '" x="' +
        imgX +
        '" y="' +
        imgY +
        '" width="' +
        fullW +
        '" height="' +
        fullH +
        '" clip-path="url(#' +
        clipId +
        ')" preserveAspectRatio="none"></image>' +
        '<path d="' +
        d +
        '" fill="none" stroke="#111111" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"></path>' +
        "</svg>";
      btn.setAttribute("aria-label", "piece");
      puzzleField.appendChild(btn);
      bindJigDrag(btn, id);
    }
  }

  function groupIds(id) {
    var i;
    for (i = 0; i < puzzleSession.groups.length; i++) {
      if (puzzleSession.groups[i].indexOf(id) !== -1) return puzzleSession.groups[i].slice();
    }
    return [id];
  }

  function bindJigDrag(btn, id) {
    btn.addEventListener("pointerdown", function (event) {
      if (peekOpen()) return;
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      var ids = groupIds(id);
      var starts = {};
      var unclamped = {};
      ids.forEach(function (pid) {
        starts[pid] = { x: puzzlePos[pid].x, y: puzzlePos[pid].y };
        unclamped[pid] = { x: starts[pid].x, y: starts[pid].y };
      });
      drag = {
        kind: "jig",
        ids: ids,
        starts: starts,
        unclamped: unclamped,
        x: event.clientX,
        y: event.clientY,
        moved: false
      };
      reactKid("glance", {}, btn);
      ids.forEach(function (pid) {
        var el = puzzleField.querySelector('[data-id="' + pid + '"]');
        if (el) el.classList.add("dragging");
      });
      try {
        btn.setPointerCapture(event.pointerId);
      } catch (err) {}
    });

    btn.addEventListener("pointermove", function (event) {
      if (peekOpen()) return;
      if (!drag || drag.kind !== "jig") return;
      var dx = event.clientX - drag.x;
      var dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      drag.moved = true;
      drag.ids.forEach(function (pid) {
        drag.unclamped[pid] = { x: drag.starts[pid].x + dx, y: drag.starts[pid].y + dy };
        puzzlePos[pid] = { x: drag.unclamped[pid].x, y: drag.unclamped[pid].y };
      });
      var size = fieldSize();
      puzzlePos = PuzzleLayout.clampGroup(puzzlePos, drag.ids, size.box, size.w, size.h);
      applyPuzzlePos();
    });

    btn.addEventListener("pointerup", finishJig);
    btn.addEventListener("pointercancel", finishJig);
  }

  function finishJig() {
    if (!drag || drag.kind !== "jig") return;
    var ids = drag.ids;
    var unclamped = drag.unclamped;
    var moved = drag.moved;
    drag = null;
    ids.forEach(function (pid) {
      var el = puzzleField.querySelector('[data-id="' + pid + '"]');
      if (el) el.classList.remove("dragging");
    });
    var snapped = trySnapGroup(ids, unclamped);
    if (snapped) {
      reactKid("nod", { won: puzzleSession.complete });
    } else if (moved) {
      reactKid("hmm", { didMiss: true });
    }
  }

  function unclampedPos(raw, id) {
    if (raw) {
      if (raw[id] !== undefined) return raw[id];
      if (raw[String(id)] !== undefined) return raw[String(id)];
    }
    return puzzlePos[id];
  }

  function trySnapGroup(ids, raw) {
    var i;
    var n;
    var nid;
    var neighbors;
    for (i = 0; i < ids.length; i++) {
      neighbors = Puzzle.neighbors(puzzleSession, ids[i]);
      for (n = 0; n < neighbors.length; n++) {
        nid = neighbors[n];
        if (ids.indexOf(nid) !== -1) continue;
        if (!Puzzle.canSnap(puzzleSession, ids[i], nid)) continue;
        var rcA = Puzzle.rowCol(puzzleSession, ids[i]);
        var rcB = Puzzle.rowCol(puzzleSession, nid);
        var from = unclampedPos(raw, ids[i]);
        // Use unclamped starts+dx/dy; a clamped draw pos would miss an off-field seat.
        var seat = PuzzleLayout.snapSeat(
          from,
          puzzlePos[nid],
          rcA.col - rcB.col,
          rcA.row - rcB.row,
          puzzleCell
        );
        if (!seat.ok) continue;
        var result = Puzzle.snap(puzzleSession, ids[i], nid);
        if (!result.ok) continue;
        puzzleSession = result.session;
        var dx = seat.x - from.x;
        var dy = seat.y - from.y;
        ids.forEach(function (pid) {
          var p = unclampedPos(raw, pid);
          puzzlePos[pid] = { x: p.x + dx, y: p.y + dy };
        });
        var size = fieldSize();
        puzzlePos = PuzzleLayout.clampGroup(puzzlePos, groupIds(ids[0]), size.box, size.w, size.h);
        renderPuzzle();
        if (puzzleSession.complete) afterPuzzle();
        return true;
      }
    }
    return false;
  }

  function centerCompletedPuzzle() {
    var ids = [];
    var id;
    for (id = 0; id < puzzleSession.rows * puzzleSession.cols; id++) ids.push(id);
    var size = fieldSize();
    puzzlePos = PuzzleLayout.centerGroup(puzzlePos, ids, size.box, size.w, size.h, 300);
    applyPuzzlePos();
  }

  function afterPuzzle() {
    centerCompletedPuzzle();
    puzzleScreen.classList.add("is-won");
    cheerEl.classList.add("is-puzzle");
    cheerWords.textContent = "What a puzzle!";
    show(cheerEl);
    celebrateKid();
    show(playAgainBtn);
    show(moreGamesBtn);
  }

  if (puzzleTidy) puzzleTidy.addEventListener("click", tidyPuzzle);
  if (puzzlePreview) puzzlePreview.addEventListener("click", openPuzzlePeek);
  if (puzzlePeekClose) puzzlePeekClose.addEventListener("click", closePuzzlePeek);
  if (puzzlePeekDim) puzzlePeekDim.addEventListener("click", closePuzzlePeek);

  window.addEventListener("resize", function () {
    if (menuScreen && !menuScreen.hidden) placeMenuCrab(menuPick);
  });

  paintKids();
  setMenuPick("tidy", false);
})();

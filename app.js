(function () {
  "use strict";

  var session = null;
  var pathSession = null;
  var stackSession = null;
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
  var stackScreen = document.getElementById("stack-screen");
  var stackHint = document.getElementById("stack-hint");
  var stackPicture = document.getElementById("stack-picture");
  var stackPad = document.getElementById("stack-pad");
  var stackTray = document.getElementById("stack-tray");
  var MENU_GAMES = ["tidy", "stack", "path"];
  var CRAB_X = { tidy: "-180px", stack: "0px", path: "180px" };
  var cheerEl = document.getElementById("cheer");
  var cheerWords = document.getElementById("cheer-words");
  var playAgainBtn = document.getElementById("play-again");
  var moreGamesBtn = document.getElementById("more-games");
  var exhibits = document.getElementById("exhibits");
  var menuCrab = document.getElementById("menu-crab");
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
    hide(playAgainBtn);
    hide(moreGamesBtn);
    if (pathAdvanceTimer) {
      window.clearTimeout(pathAdvanceTimer);
      pathAdvanceTimer = null;
    }
    stopCelebrate();
  }

  function paintKids() {
    document.querySelectorAll("[data-kid]").forEach(function (el) {
      el.innerHTML = '<img class="kid-art" src="' + KID_IDLE + '" alt="" draggable="false" />';
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
    if (cheerTimer) window.clearTimeout(cheerTimer);
    if (hopTimer) window.clearTimeout(hopTimer);
    activeGame = null;
    hide(playScreen);
    hide(pathScreen);
    hide(stackScreen);
    hide(difficultyScreen);
    hideCheer();
    show(menuScreen);
    setMenuPick(menuPick || "tidy", false);
  }

  function setMenuPick(game, scuttle) {
    menuPick = game;
    menuCrab.style.setProperty("--crab-x", CRAB_X[game] || "0px");
    if (scuttle && !reduceMotion) {
      menuCrab.classList.remove("scuttle");
      void menuCrab.offsetWidth;
      menuCrab.classList.add("scuttle");
    }
    [].forEach.call(exhibits.querySelectorAll(".exhibit"), function (btn) {
      var on = btn.dataset.game === game;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function openGame(game) {
    hideCheer();
    pendingGame = game;
    var titles = {
      path: "Crab Path",
      stack: "Sandcastle Stack",
      tidy: "Tide Pool Tidy"
    };
    var titleEl = document.querySelector("#difficulty-screen h1");
    if (titleEl) titleEl.textContent = titles[game] || titles.tidy;
    difficultyScreen.setAttribute("data-pending", game);
    hide(menuScreen);
    hide(playScreen);
    hide(pathScreen);
    hide(stackScreen);
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
      var at = MENU_GAMES.indexOf(menuPick);
      if (at < 0) at = 0;
      if (event.key === "ArrowRight") at = (at + 1) % MENU_GAMES.length;
      else at = (at + MENU_GAMES.length - 1) % MENU_GAMES.length;
      setMenuPick(MENU_GAMES[at], true);
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
      else if (pendingGame === "stack") startStack(btn.dataset.difficulty);
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
    } else if (activeGame === "stack") {
      stackSession = Sandcastle.playAgain(stackSession);
      renderStack();
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
    hide(stackScreen);
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
    if (result.ok && session.complete) afterTidyRound();
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
    hide(stackScreen);
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
      return;
    }
    pathSession = result.session;
    renderPath();
    var fresh = pathBoard.querySelector('[data-x="' + x + '"][data-y="' + y + '"]');
    pulse(fresh, "splash");
    if (pathSession.complete) afterPath();
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

  function stackArt(kind, color) {
    return (
      '<img class="piece-art" src="assets/sandcastle-' +
      kind +
      "-" +
      color +
      '.png" alt="" draggable="false" />'
    );
  }

  function stackPieceButton(piece) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "piece stack-piece";
    btn.dataset.id = piece.id;
    btn.setAttribute("aria-label", piece.color + " " + piece.kind);
    btn.innerHTML = stackArt(piece.kind, piece.color);
    return btn;
  }

  function fortClass(spots) {
    if (spots.indexOf("left") === -1) return "is-easy";
    if (spots.indexOf("top") === -1) return "is-medium";
    return "is-full";
  }

  function renderFort(el, session, mode) {
    el.innerHTML = "";
    var fort = document.createElement("div");
    fort.className = "stack-fort " + fortClass(session.spots);
    var open = {};
    Sandcastle.openSpots(session).forEach(function (id) {
      open[id] = true;
    });
    session.spots.forEach(function (id) {
      var spot = document.createElement(mode === "pad" ? "button" : "div");
      if (mode === "pad") spot.type = "button";
      var filled = session.filled[id];
      var cls = "spot spot-" + id;
      if (mode === "picture") {
        cls += " is-picture";
      } else if (filled) {
        cls += " is-filled";
      } else if (open[id]) {
        cls += " is-open";
      } else {
        cls += " is-locked";
      }
      spot.className = cls;
      spot.dataset.spot = id;
      if (mode === "picture") {
        var want = session.target[id];
        spot.innerHTML = stackArt(want.kind, want.color);
      } else if (filled) {
        spot.innerHTML = stackArt(filled.kind, filled.color);
        spot.setAttribute("aria-label", filled.color + " " + filled.kind);
      } else {
        spot.setAttribute("aria-label", open[id] ? "open " + id : "locked " + id);
      }
      fort.appendChild(spot);
    });
    el.appendChild(fort);
  }

  function startStack(difficulty) {
    activeGame = "stack";
    selectedId = null;
    stackSession = Sandcastle.createSession({ difficulty: difficulty });
    hide(menuScreen);
    hide(difficultyScreen);
    hide(playScreen);
    hide(pathScreen);
    show(stackScreen);
    hideCheer();
    renderStack();
  }

  function renderStack() {
    stackHint.textContent =
      "Castle " + (stackSession.roundIndex + 1) + " of " + Sandcastle.ROUND_COUNT + ".";
    renderFort(stackPicture, stackSession, "picture");
    renderFort(stackPad, stackSession, "pad");
    stackTray.innerHTML = "";
    stackSession.tray.forEach(function (piece) {
      var btn = stackPieceButton(piece);
      if (piece.id === selectedId) btn.classList.add("selected");
      stackTray.appendChild(btn);
      bindStackDrag(btn, piece);
    });
  }

  function spotFromPoint(x, y) {
    var stack = document.elementsFromPoint(x, y);
    for (var i = 0; i < stack.length; i++) {
      var node = stack[i].closest ? stack[i].closest("[data-spot]") : null;
      if (node && stackPad.contains(node)) return node;
    }
    return null;
  }

  function bindStackDrag(btn, piece) {
    btn.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      var rect = btn.getBoundingClientRect();
      drag = {
        id: piece.id,
        btn: btn,
        dx: event.clientX - rect.left,
        dy: event.clientY - rect.top,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        kind: "stack"
      };
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

    btn.addEventListener("pointerup", finishStackPointer);
    btn.addEventListener("pointercancel", finishStackPointer);
  }

  function tryPlaceStack(pieceId, spotEl) {
    if (!spotEl) return false;
    var result = Sandcastle.place(stackSession, pieceId, spotEl.dataset.spot);
    stackSession = result.session;
    selectedId = result.ok ? null : pieceId;
    renderStack();
    var fresh = stackPad.querySelector('[data-spot="' + spotEl.dataset.spot + '"]');
    pulse(fresh, result.ok ? "splash" : "wiggle");
    if (!result.ok) {
      var pieceBtn = stackTray.querySelector('[data-id="' + pieceId + '"]');
      pulse(pieceBtn, "wiggle");
    }
    if (result.ok && stackSession.complete) afterStack();
    return true;
  }

  function finishStackPointer(event) {
    if (!drag || drag.kind !== "stack") return;
    var btn = drag.btn;
    var id = drag.id;
    var moved = drag.moved;
    var spotEl = spotFromPoint(event.clientX, event.clientY);
    drag = null;
    btn.classList.remove("dragging");
    btn.style.left = "";
    btn.style.top = "";
    btn.style.width = "";
    btn.style.height = "";

    if (!moved) {
      selectedId = selectedId === id ? null : id;
      renderStack();
      return;
    }

    if (!tryPlaceStack(id, spotEl)) renderStack();
  }

  stackPad.addEventListener("click", function (event) {
    if (!selectedId || !stackSession) return;
    var spotEl = event.target.closest ? event.target.closest("[data-spot]") : null;
    tryPlaceStack(selectedId, spotEl);
  });

  function afterStack() {
    selectedId = null;
    cheerWords.textContent = "What a castle!";
    show(cheerEl);
    celebrateKid();
    var stackKid = document.querySelector(".stack-kid");
    if (stackKid) stackKid.classList.add("is-cheering");
    if (stackSession.roundIndex >= Sandcastle.ROUND_COUNT - 1) {
      stackSession = Sandcastle.advance(stackSession);
      show(playAgainBtn);
      show(moreGamesBtn);
      return;
    }
    hide(playAgainBtn);
    hide(moreGamesBtn);
    var wait = reduceMotion ? 0 : 2000;
    cheerTimer = window.setTimeout(function () {
      stackSession = Sandcastle.advance(stackSession);
      hideCheer();
      renderStack();
    }, wait);
  }

  paintKids();
  setMenuPick("tidy", false);
})();

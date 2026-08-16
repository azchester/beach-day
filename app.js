(function () {
  "use strict";

  var session = null;
  var pathSession = null;
  var activeGame = null;
  var drag = null;
  var selectedId = null;
  var menuPick = "tidy";
  var cheerTimer = null;
  var hopTimer = null;
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
  var cheerEl = document.getElementById("cheer");
  var cheerWords = document.getElementById("cheer-words");
  var playAgainBtn = document.getElementById("play-again");
  var moreGamesBtn = document.getElementById("more-games");
  var exhibits = document.getElementById("exhibits");
  var menuCrab = document.getElementById("menu-crab");

  var FILL = {
    sand: "#e8c27a",
    orange: "#ff6a4d",
    peach: "#f4a574",
    cream: "#f7e6c4",
    gray: "#8b8e98",
    brown: "#a67c52"
  };

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
  }

  function svgWrap(inner) {
    return (
      '<svg class="piece-art" viewBox="0 0 80 80" aria-hidden="true">' +
      inner +
      "</svg>"
    );
  }

  function art(kind, variant, color) {
    var fill = FILL[color] || FILL.sand;
    var ink = "#1b2a4a";
    var s = 'fill="' + fill + '" stroke="' + ink + '" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"';
    var dark = 'fill="' + ink + '"';

    if (kind === "sandcastle" && variant === "drip") {
      return svgWrap(
        '<ellipse cx="40" cy="70" rx="28" ry="7" ' + s + "/>" +
          '<path d="M16 68 C18 48 28 46 32 58 C34 44 42 40 46 56 C50 42 60 46 62 66 Z" ' + s + "/>" +
          '<circle cx="40" cy="38" r="10" ' + s + "/>" +
          '<circle cx="28" cy="48" r="7" ' + s + "/>" +
          '<circle cx="52" cy="50" r="7" ' + s + "/>"
      );
    }
    if (kind === "sandcastle" && variant === "bucket") {
      return svgWrap(
        '<ellipse cx="40" cy="70" rx="24" ry="6" ' + s + "/>" +
          '<path d="M24 68 L22 38 L58 38 L56 68 Z" ' + s + "/>" +
          '<path d="M20 38 L28 28 L36 38 L44 28 L52 38 L60 28 L62 38 Z" ' + s + "/>" +
          '<rect x="36" y="48" width="8" height="14" rx="2" ' + dark + "/>"
      );
    }
    if (kind === "sandcastle") {
      return svgWrap(
        '<ellipse cx="40" cy="71" rx="28" ry="6" ' + s + "/>" +
          '<path d="M14 68 L14 42 L26 42 L26 28 L38 28 L38 18 L42 18 L42 28 L54 28 L54 42 L66 42 L66 68 Z" ' + s + "/>" +
          '<path d="M26 28 L30 22 L34 28 M54 28 L50 22 L46 28" fill="none" stroke="' + ink + '" stroke-width="3.2"/>' +
          '<rect x="36" y="50" width="8" height="16" rx="2" ' + dark + "/>" +
          '<path d="M40 18 L40 10" stroke="' + ink + '" stroke-width="3"/>' +
          '<path d="M40 10 L50 14 L40 18 Z" fill="#ff6a4d" stroke="' + ink + '" stroke-width="2.6" stroke-linejoin="round"/>'
      );
    }
    if (kind === "shell" && variant === "spiral") {
      return svgWrap(
        '<path d="M40 72 C22 72 16 54 22 40 C28 24 40 14 40 8 C52 16 62 30 60 46 C58 62 50 72 40 72 Z" ' + s + "/>" +
          '<path d="M40 66 C30 64 26 52 30 42 C34 32 40 26 40 20" fill="none" stroke="' + ink + '" stroke-width="3"/>'
      );
    }
    if (kind === "shell" && variant === "snail") {
      return svgWrap(
        '<ellipse cx="28" cy="58" rx="16" ry="8" ' + s + "/>" +
          '<circle cx="48" cy="44" r="18" ' + s + "/>" +
          '<path d="M48 56 C42 54 40 48 44 42 C48 36 54 38 54 44" fill="none" stroke="' + ink + '" stroke-width="3"/>' +
          '<path d="M18 54 L12 44 M22 52 L18 40" fill="none" stroke="' + ink + '" stroke-width="3"/>' +
          '<circle cx="12" cy="42" r="2.2" ' + dark + "/>" +
          '<circle cx="18" cy="38" r="2.2" ' + dark + "/>"
      );
    }
    if (kind === "shell") {
      return svgWrap(
        '<path d="M40 66 C20 66 14 44 22 30 C30 16 40 14 40 14 C40 14 50 16 58 30 C66 44 60 66 40 66 Z" ' + s + "/>" +
          '<path d="M40 62 L24 34 M40 62 L32 30 M40 62 L40 26 M40 62 L48 30 M40 62 L56 34" fill="none" stroke="' + ink + '" stroke-width="2.8"/>'
      );
    }
    if (kind === "rock" && variant === "driftwood") {
      return svgWrap(
        '<path d="M12 50 C22 38 34 44 48 40 C58 36 68 30 72 36 C64 46 54 52 40 56 C28 60 16 58 12 50 Z" ' + s + "/>" +
          '<path d="M28 46 C32 40 36 38 40 36" fill="none" stroke="' + ink + '" stroke-width="2.6"/>'
      );
    }
    if (kind === "rock" && variant === "speckled") {
      return svgWrap(
        '<ellipse cx="40" cy="42" rx="28" ry="22" ' + s + "/>" +
          '<circle cx="30" cy="38" r="3" ' + dark + "/>" +
          '<circle cx="48" cy="48" r="3" ' + dark + "/>" +
          '<circle cx="52" cy="36" r="2.6" ' + dark + "/>" +
          '<circle cx="34" cy="50" r="2.4" ' + dark + "/>"
      );
    }
    return svgWrap('<ellipse cx="40" cy="42" rx="26" ry="20" ' + s + "/>");
  }

  function crabGlyph() {
    return (
      '<svg class="glyph" viewBox="0 0 80 80" aria-hidden="true">' +
      '<ellipse cx="40" cy="44" rx="22" ry="15" fill="#ff6a4d" stroke="#1b2a4a" stroke-width="3.2"/>' +
      '<path d="M22 40 L10 30 M58 40 L70 30 M20 50 L8 56 M60 50 L72 56 M26 58 L18 68 M54 58 L62 68" fill="none" stroke="#1b2a4a" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="32" cy="40" r="3.2" fill="#1b2a4a"/>' +
      '<circle cx="48" cy="40" r="3.2" fill="#1b2a4a"/>' +
      "</svg>"
    );
  }

  function bucketGlyph() {
    return (
      '<svg class="glyph" viewBox="0 0 80 80" aria-hidden="true">' +
      '<path d="M24 30 C24 18 56 18 56 30" fill="none" stroke="#1b2a4a" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M22 32 L26 64 H54 L58 32 Z" fill="#e85d4c" stroke="#1b2a4a" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<path d="M26 44 H54" fill="none" stroke="#1b2a4a" stroke-width="2.6"/>' +
      "</svg>"
    );
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
    hide(difficultyScreen);
    hideCheer();
    show(menuScreen);
    setMenuPick(menuPick || "tidy", false);
  }

  function setMenuPick(game, scuttle) {
    menuPick = game;
    var shift = game === "path" ? "150px" : "-150px";
    menuCrab.style.setProperty("--crab-x", shift);
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
    if (game === "path") {
      hide(menuScreen);
      hide(difficultyScreen);
      startPath();
    } else {
      hide(menuScreen);
      hide(playScreen);
      hide(pathScreen);
      show(difficultyScreen);
    }
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
      setMenuPick(menuPick === "tidy" ? "path" : "tidy", true);
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
      startTidy(btn.dataset.difficulty);
    });
  });

  moreGamesBtn.addEventListener("click", goMenu);

  playAgainBtn.addEventListener("click", function () {
    if (cheerTimer) window.clearTimeout(cheerTimer);
    hideCheer();
    if (activeGame === "path") {
      pathSession = CrabPath.playAgain();
      renderPath();
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
    if (session.roundIndex >= TidePool.ROUND_COUNT - 1) {
      session = TidePool.advance(session);
      show(playAgainBtn);
      show(moreGamesBtn);
      return;
    }
    hide(playAgainBtn);
    hide(moreGamesBtn);
    var wait = reduceMotion ? 0 : 1200;
    cheerTimer = window.setTimeout(function () {
      session = TidePool.advance(session);
      hideCheer();
      renderTidy();
    }, wait);
  }

  function startPath() {
    activeGame = "path";
    pathSession = CrabPath.createSession();
    show(pathScreen);
    hide(playScreen);
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
    pathHint.textContent = "Path " + (pathSession.levelIndex + 1) + " of 6. Tap a glowing square.";
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
        else if (type === "rock") btn.innerHTML = art("rock", "pebble", "gray").replace("piece-art", "glyph");
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
    show(cheerEl);
    if (pathSession.levelIndex >= CrabPath.LEVELS.length - 1) {
      pathSession = CrabPath.advance(pathSession);
      show(playAgainBtn);
      show(moreGamesBtn);
      return;
    }
    hide(playAgainBtn);
    hide(moreGamesBtn);
    var wait = reduceMotion ? 0 : 1200;
    cheerTimer = window.setTimeout(function () {
      pathSession = CrabPath.advance(pathSession);
      hideCheer();
      renderPath();
    }, wait);
  }

  setMenuPick("tidy", false);
})();

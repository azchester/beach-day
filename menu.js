/**
 * Menu helpers: crab offset and game ids from the exhibit cards.
 * Works in Node (tests) and the browser (window.BeachMenu).
 */
(function (root) {
  "use strict";

  function crabOffsetPx(menuRect, cardRect) {
    if (!menuRect || !cardRect) return 0;
    var menuMid = menuRect.left + menuRect.width / 2;
    var cardMid = cardRect.left + cardRect.width / 2;
    return cardMid - menuMid;
  }

  function gameIds(cards) {
    var ids = [];
    if (!cards) return ids;
    var i;
    for (i = 0; i < cards.length; i++) {
      var id = cards[i] && cards[i].dataset ? cards[i].dataset.game : "";
      if (id) ids.push(id);
    }
    return ids;
  }

  var BeachMenu = {
    crabOffsetPx: crabOffsetPx,
    gameIds: gameIds
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BeachMenu;
  } else {
    root.BeachMenu = BeachMenu;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);

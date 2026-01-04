// doubleup.js
const DoubleUp = (() => {
  function compare(prevRank, nextRank, choice) {
    // ranks: 2..14 (A=14)
    // same rank is always win
    if (nextRank === prevRank) return true;

    // special A rule when prev is A:
    // LOW: always win
    // HIGH: win only if next is A
    if (prevRank === 14) {
      if (choice === "LOW") return true;
      if (choice === "HIGH") return nextRank === 14;
    }

    if (choice === "HIGH") return nextRank > prevRank;
    return nextRank < prevRank; // LOW
  }

  return { compare };
})();

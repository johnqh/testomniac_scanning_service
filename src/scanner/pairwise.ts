export interface Factor {
  name: string;
  values: string[];
}

export type Combination = Record<string, string>;

export function generatePairwiseCombinations(factors: Factor[]): Combination[] {
  if (factors.length === 0) return [];
  if (factors.length === 1) {
    return factors[0].values.map(v => ({ [factors[0].name]: v }));
  }

  const uncoveredPairs = new Set<string>();
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      for (const vi of factors[i].values) {
        for (const vj of factors[j].values) {
          uncoveredPairs.add(`${i}:${vi}|${j}:${vj}`);
        }
      }
    }
  }

  const results: Combination[] = [];

  while (uncoveredPairs.size > 0) {
    const firstPair = uncoveredPairs.values().next().value!;
    const [partA, partB] = firstPair.split("|");
    const [idxAStr, valA] = partA.split(":");
    const [idxBStr, valB] = partB.split(":");
    const idxA = parseInt(idxAStr);
    const idxB = parseInt(idxBStr);

    const candidate: Combination = {};
    candidate[factors[idxA].name] = valA;
    candidate[factors[idxB].name] = valB;

    for (let f = 0; f < factors.length; f++) {
      if (f === idxA || f === idxB) continue;
      let bestVal = factors[f].values[0];
      let bestScore = 0;
      for (const val of factors[f].values) {
        candidate[factors[f].name] = val;
        let score = 0;
        for (let other = 0; other < factors.length; other++) {
          if (other === f || !candidate[factors[other].name]) continue;
          const [lo, hi] = f < other ? [f, other] : [other, f];
          const [loVal, hiVal] =
            f < other
              ? [val, candidate[factors[other].name]]
              : [candidate[factors[other].name], val];
          const key = `${lo}:${loVal}|${hi}:${hiVal}`;
          if (uncoveredPairs.has(key)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestVal = val;
        }
      }
      candidate[factors[f].name] = bestVal;
    }

    for (let i = 0; i < factors.length; i++) {
      for (let j = i + 1; j < factors.length; j++) {
        const key = `${i}:${candidate[factors[i].name]}|${j}:${candidate[factors[j].name]}`;
        uncoveredPairs.delete(key);
      }
    }

    results.push({ ...candidate });
  }

  return results;
}

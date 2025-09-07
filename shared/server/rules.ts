export type DayTotals = Record<string, number>;

export type PatternFlags = {
  LOW_FIBRE?: boolean;
  HIGH_SUGARY_DRINKS?: boolean;
  LOW_OMEGA3?: boolean;
  HIGH_PROCESSED_MEAT?: boolean;
  HIGH_FIBRE_CEREAL_PRESENT?: boolean;
};

export function evaluateMonthPatterns(
  totals3Days: Array<DayTotals>,
  ocrText?: string
): PatternFlags {
  const sumCat = (cat: string) =>
    totals3Days.reduce((acc, day) => acc + (day[cat] || 0), 0);

  const flags: PatternFlags = {};

  if (sumCat("fruit") + sumCat("vegetables") < 5) flags.LOW_FIBRE = true;
  if (sumCat("sugary drinks") >= 2) flags.HIGH_SUGARY_DRINKS = true;
  if (sumCat("oily fish") === 0) flags.LOW_OMEGA3 = true;
  if (sumCat("processed meats") >= 2) flags.HIGH_PROCESSED_MEAT = true;

  if (ocrText) {
    const t = ocrText.toLowerCase();
    if (t.includes("whole grain") || /\b6g\s*fibre\s*\/\s*100g\b/i.test(ocrText)) {
      flags.HIGH_FIBRE_CEREAL_PRESENT = true;
    }
  }

  return flags;
}



// Moteur de calcul de la zakat (école malikite par défaut).
// Montants en centimes (entiers) pour éviter les erreurs d'arrondi.
// Chaque montant garde sa devise : la conversion se fait au moment du calcul.
// Règles : voir le document « Règles de calcul de la zakat — école malikite ».
(function (root) {
  "use strict";

  const GOLD_NISAB_G = 85;
  const SILVER_NISAB_G = 595;
  const RATE_NUM = 25, RATE_DEN = 1000; // 2,5 % (année lunaire)

  // Types d'avoirs : cash (compte, espèces), gold, silver, crypto, shares (actions à revendre),
  // stock (stock du commerçant continu), tradeReceivable (créance client), loan (prêt fait à quelqu'un)
  const pureGrams = a => {
    if (a.type === "gold") return (a.grams || 0) * (a.carats || 24) / 24;
    if (a.type === "silver") return (a.grams || 0) * (a.fineness || 1000) / 1000;
    return 0;
  };

  const applyRate = cents => Math.floor((cents * RATE_NUM + RATE_DEN / 2) / RATE_DEN);

  // market : { ref: "EUR", goldCents: prix d'1 g d'or pur, silverCents: prix d'1 g d'argent pur,
  //            rates: { MAD: 0.0912 } = valeur d'1 unité en devise de référence, date }
  function rateFor(market, cur) {
    if (!cur || cur === market.ref) return 1;
    const r = market.rates && market.rates[cur];
    if (typeof r !== "number") throw new Error("Taux de change manquant pour " + cur);
    return r;
  }

  function exclusion(a, settings) {
    const madhhab = settings.madhhab || "maliki";
    if (a.type === "gold" && a.usage === "worn" && madhhab !== "hanafi")
      return { reason: "Bijou porté habituellement : non soumis.", remind: false };
    if (a.type === "loan") {
      if (madhhab === "maliki")
        return { reason: "Prêt : zakat d'une seule année, payée au remboursement.", remind: true };
      if (!a.secure)
        return { reason: "Remboursement non sûr : exclu jusqu'au remboursement.", remind: true };
    }
    return null;
  }

  function nisabCents(market, ref) {
    return ref === "silver"
      ? Math.round(SILVER_NISAB_G * market.silverCents)
      : Math.round(GOLD_NISAB_G * market.goldCents);
  }

  // assets : [{ id, name, type, cents, currency, grams, carats, usage, secure }]
  // debts  : [{ id, name, cents, currency }]
  // settings : { madhhab, nisabRef: "gold"|"silver", combineByParts, surplusCents (en devise de référence) }
  function calculate(assets, debts, market, settings) {
    settings = settings || {};
    const lines = [], excluded = [];
    let goldG = 0, silverG = 0, otherCents = 0;

    for (const a of assets) {
      const ex = exclusion(a, settings);
      if (ex) { excluded.push(Object.assign({ id: a.id }, ex)); continue; }
      if (a.type === "gold" || a.type === "silver") {
        const price = a.type === "gold" ? market.goldCents : market.silverCents;
        const g = pureGrams(a);
        const value = Math.round(g * price);
        if (a.type === "gold") goldG += g; else silverG += g;
        lines.push({ id: a.id, label: a.name, origCents: value, origCurrency: market.ref, rate: price / 100, refCents: value, grams: g });
      } else {
        const rate = rateFor(market, a.currency);
        const value = Math.round((a.cents || 0) * rate);
        otherCents += value;
        lines.push({ id: a.id, label: a.name, origCents: a.cents || 0, origCurrency: a.currency || market.ref, rate, refCents: value });
      }
    }

    const total = lines.reduce((s, l) => s + l.refCents, 0);
    const totalDebt = debts.reduce((s, d) => s + Math.round((d.cents || 0) * rateFor(market, d.currency)), 0);
    // Malikite : la dette s'impute d'abord sur les biens non soumis en surplus des besoins
    const deductible = (settings.madhhab || "maliki") === "maliki"
      ? Math.max(0, totalDebt - (settings.surplusCents || 0))
      : totalDebt;
    const base = Math.max(0, total - deductible);
    const nisab = nisabCents(market, settings.nisabRef || "gold");

    let reached = base >= nisab;
    if (!reached && settings.combineByParts) {
      const parts = goldG / GOLD_NISAB_G + silverG / SILVER_NISAB_G + (nisab ? (otherCents - deductible) / nisab : 0);
      reached = parts >= 1;
    }
    const due = reached ? applyRate(base) : 0;
    return { lines, excluded, totalCents: total, debtCents: totalDebt, deductibleCents: deductible, baseCents: base, nisabCents: nisab, reached, dueCents: due };
  }

  // Zakat d'une seule année sur un prêt remboursé (malikite)
  const zakatOnRepayment = cents => applyRate(cents);

  const api = { calculate, zakatOnRepayment, pureGrams, rateFor, nisabCents, GOLD_NISAB_G, SILVER_NISAB_G };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ZakatEngine = api;
})(typeof self !== "undefined" ? self : this);

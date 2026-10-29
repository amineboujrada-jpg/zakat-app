// Tests du moteur : mêmes cas que le fichier Cas_de_test_zakat.xlsx
// (prix fictifs : or 100 €/g, argent 1 €/g, 1 MAD = 0,10 €). Lancer : node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const Z = require("../engine.js");

const market = { ref: "EUR", goldCents: 10000, silverCents: 100, rates: { MAD: 0.1 } };
const cash = (e, currency = "EUR") => ({ id: "cash-" + currency, name: "Espèces", type: "cash", cents: e * 100, currency });
const gold = (g, usage = "savings") => ({ id: "gold-" + usage, name: "Or", type: "gold", grams: g, usage });
const debt = e => ({ id: "d", name: "Dette", cents: e * 100, currency: "EUR" });
const run = (assets, debts = [], settings = {}) => Z.calculate(assets, debts, market, settings);

test("1. Sous le nisab", () => { const r = run([cash(5000)]); assert.equal(r.nisabCents, 850000); assert.equal(r.reached, false); assert.equal(r.dueCents, 0); });
test("2. Exactement au nisab", () => assert.equal(run([cash(8500)]).dueCents, 21250));
test("3. Multi-devises avec dette", () => { const r = run([cash(3000), cash(20000, "MAD"), gold(40)], [debt(1000)]); assert.equal(r.baseCents, 800000); assert.equal(r.dueCents, 0); });
test("4. Multi-devises sans dette", () => { const r = run([cash(3000), cash(20000, "MAD"), gold(40)]); assert.equal(r.baseCents, 900000); assert.equal(r.dueCents, 22500); });
test("5. Bijoux portés exclus", () => { const r = run([cash(6000), gold(50, "worn")]); assert.equal(r.excluded.length, 1); assert.equal(r.dueCents, 0); });
test("6. Bijoux d'épargne", () => assert.equal(run([cash(6000), gold(50)]).dueCents, 27500));
test("7. Dette couverte par un bien non soumis", () => { const r = run([cash(10000)], [debt(3000)], { surplusCents: 500000 }); assert.equal(r.deductibleCents, 0); assert.equal(r.dueCents, 25000); });
test("8. Dette sans bien", () => { const r = run([cash(10000)], [debt(3000)]); assert.equal(r.deductibleCents, 300000); assert.equal(r.dueCents, 0); });
test("9. Commerçant continu", () => {
  const r = run([cash(2000), { id: "s", name: "Stock", type: "stock", cents: 1500000 }, { id: "c", name: "Clients", type: "tradeReceivable", cents: 300000 }], [debt(4000)]);
  assert.equal(r.baseCents, 1600000); assert.equal(r.dueCents, 40000);
});
test("10. Prêt exclu + zakat au remboursement", () => {
  const r = run([cash(10000), { id: "p", name: "Prêt", type: "loan", cents: 500000, secure: true }]);
  assert.equal(r.dueCents, 25000); assert.equal(r.excluded[0].remind, true); assert.equal(Z.zakatOnRepayment(500000), 12500);
});
test("11. Crypto", () => assert.equal(run([cash(4000), { id: "b", name: "Crypto", type: "crypto", cents: 600000 }]).dueCents, 25000));
test("12. Nisab argent", () => { const r = run([cash(1000)], [], { nisabRef: "silver" }); assert.equal(r.nisabCents, 59500); assert.equal(r.dueCents, 2500); });
test("13. Or + argent par parts", () => {
  const r = run([gold(42.5), { id: "ag", name: "Argent", type: "silver", grams: 297.5 }], [], { combineByParts: true });
  assert.equal(r.baseCents, 454750); assert.equal(r.reached, true); assert.equal(r.dueCents, 11369);
});
test("14. Or 18 carats", () => assert.equal(Z.pureGrams({ type: "gold", grams: 40, carats: 18 }), 30));

// ---------- Wallet : chaque somme a son propre hawl (année simplifiée à 354 jours) ----------
const addD = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const end = s => addD(s, 354);
test("15. Wallet : l'exemple 10 000 € puis +2 000 €", () => {
  const mv = [{ date: "2025-01-01", cents: 1000000 }, { date: "2025-01-02", cents: 200000 }];
  let r = Z.computeLots(mv, { today: end("2025-01-01"), hawlEnd: end });
  assert.equal(r.dueCents, 25000);           // 250 € le jour du hawl des 10 000 €
  r = Z.computeLots(mv, { today: end("2025-01-02"), hawlEnd: end });
  assert.equal(r.dueCents, 30000);           // + 50 € le lendemain
  assert.equal(r.lots.length, 2);            // les deux tranches repartent pour un an
});
test("16. Wallet : une dépense est retirée de la tranche la plus récente", () => {
  const mv = [{ date: "2025-01-01", cents: 1000000 }, { date: "2025-03-01", cents: 300000 }, { date: "2025-04-01", cents: -400000 }];
  const r = Z.computeLots(mv, { today: end("2025-01-01"), hawlEnd: end });
  assert.equal(r.dueCents, 22500);           // 9 000 € restants de la première tranche
});
test("17. Wallet : passage sous le nisab = remise à zéro", () => {
  const mv = [{ date: "2025-01-01", cents: 1000000, nisab: 850000 }, { date: "2025-05-01", cents: -500000, nisab: 850000 }, { date: "2025-06-01", cents: 500000, nisab: 850000 }];
  let r = Z.computeLots(mv, { today: end("2025-01-01"), hawlEnd: end });
  assert.equal(r.dueCents, 0);
  r = Z.computeLots(mv, { today: end("2025-06-01"), hawlEnd: end });
  assert.equal(r.dueCents, 25000);           // le hawl a recommencé le 1er juin pour les 10 000 €
});
test("18. Wallet : la dette réduit les tranches à venir", () => {
  const r = Z.computeLots([{ date: "2025-01-01", cents: 1000000 }], { today: "2025-02-01", hawlEnd: end, debtCents: 200000 });
  assert.equal(r.lots[0].cents, 800000); assert.equal(r.lots[0].zakat, 20000);
});

test("19. Prêt sûr (risque ≤ 20 %) compté chaque année", () => {
  const r = run([cash(10000), { id: "p", name: "Prêt", type: "loan", cents: 500000, countYearly: true }]);
  assert.equal(r.baseCents, 1500000); assert.equal(r.dueCents, 37500);
});
test("20. Compte exclu de la zakat", () => {
  const r = run([cash(10000), { id: "x", name: "Cotisations", type: "cash", cents: 500000, noZakat: true }]);
  assert.equal(r.baseCents, 1000000); assert.equal(r.excluded.length, 1);
});
test("21. Prêt à risque : zakat de toute la période au remboursement", () => {
  const z = Z.zakatForPeriod(100000, "2023-01-01", "2025-12-31", end);
  assert.equal(z.years, 3); assert.equal(z.cents, 7500);
  assert.equal(Z.zakatForPeriod(100000, "2025-01-01", "2025-06-01", end).years, 0);
});
test("22. Mouvements du même jour additionnés", () => {
  const mv = [{ date: "2025-01-01", cents: 1000000 }, { date: "2025-02-01", cents: -100000 }, { date: "2025-02-01", cents: 100000 }];
  assert.equal(Z.computeLots(mv, { today: end("2025-01-01"), hawlEnd: end }).dueCents, 25000);
});

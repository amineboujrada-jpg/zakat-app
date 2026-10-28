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

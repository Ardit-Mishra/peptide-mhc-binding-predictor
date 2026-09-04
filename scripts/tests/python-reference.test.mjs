/**
 * The shipped runtime against real XGBoost outputs -- in CI, with no Python.
 *
 * WHY THIS EXISTS
 * ---------------
 * scripts/verify_parity.py is the authoritative check: it loads the original
 * booster and rescores every pair. But it needs the ml-training repository,
 * which is a separate checkout that CI does not have. So CI could verify the
 * TypeScript predictor against the export format and against itself, and never
 * against the model. The one claim this project most depends on -- that the
 * browser agrees with the trained model -- was the one claim CI could not make.
 *
 * scripts/fixtures/python-reference.json closes that. It holds the booster's
 * own outputs for all 516 pairs, written by verify_parity.py on a machine that
 * had xgboost and the training repo. This test replays them against the shipped
 * predictor. It is weaker than the real check by exactly one thing -- the
 * fixture is a recording, not a live booster -- and stronger by being run on
 * every push by a machine that cannot cheat.
 *
 * THE STALENESS GATE IS THE LOAD-BEARING PART
 * -------------------------------------------
 * A recorded expectation that survives a change to the thing it describes is
 * worse than no test: it reports success about a model that no longer exists.
 * So the fixture records the sha256 of the shipped model and allele table, and
 * this test FAILS if either has changed. Re-exporting the model without
 * regenerating the fixture is a hard error, not a silent pass.
 *
 *   node --test scripts/tests/python-reference.test.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { PeptideMHCPredictor } from "../../shared/pmhc-predictor.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const models = join(root, "client", "public", "models");

const modelPath = join(models, "pmhc_model.json");
const allelePath = join(models, "pmhc_alleles.json");

const fixture = JSON.parse(
  readFileSync(join(root, "scripts", "fixtures", "python-reference.json"), "utf8"),
);
const model = JSON.parse(readFileSync(modelPath, "utf8"));
const alleles = JSON.parse(readFileSync(allelePath, "utf8"));
const predictor = new PeptideMHCPredictor(model, alleles);

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

test("fixture describes the model that is actually shipped", () => {
  assert.equal(
    sha256(modelPath),
    fixture.shippedModelSha256,
    "pmhc_model.json has changed since the Python reference fixture was generated. " +
      "Regenerate it: uv run --with xgboost --with \"numpy<2\" python scripts/verify_parity.py",
  );
  assert.equal(
    sha256(allelePath),
    fixture.alleleTableSha256,
    "pmhc_alleles.json has changed since the fixture was generated. Regenerate it.",
  );
});

test("fixture is complete and self-describing", () => {
  assert.equal(fixture.cases.length, fixture.nCases);
  assert.ok(fixture.nCases >= 500, `expected the full sweep, got ${fixture.nCases} cases`);
  assert.equal(
    new Set(fixture.cases.map((c) => c.allele)).size,
    Object.keys(alleles.pseudoSequences).length,
    "fixture must cover every trained allele",
  );
  assert.ok(fixture.xgboostVersion, "fixture must record which xgboost produced it");
  assert.ok(fixture.tolerance > 0);
});

test("shipped predictor reproduces the XGBoost booster's outputs", () => {
  let worst = 0;
  let total = 0;
  let worstCase = null;

  for (const { peptide, allele, python } of fixture.cases) {
    const { probability } = predictor.predict(peptide, allele);
    const d = Math.abs(probability - python);
    total += d;
    if (d > worst) {
      worst = d;
      worstCase = { peptide, allele, python, typescript: probability };
    }
  }

  const mean = total / fixture.cases.length;
  console.log(
    `    vs XGBoost ${fixture.xgboostVersion}: max ${worst.toExponential(3)}, ` +
      `mean ${mean.toExponential(3)} over ${fixture.cases.length} pairs ` +
      `(tolerance ${fixture.tolerance.toExponential(0)})`,
  );

  assert.ok(
    worst <= fixture.tolerance,
    `max difference ${worst.toExponential(3)} exceeds tolerance ` +
      `${fixture.tolerance.toExponential(0)} at ${JSON.stringify(worstCase)}`,
  );
});

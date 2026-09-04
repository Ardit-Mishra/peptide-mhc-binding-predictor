/**
 * Runtime parity: does the code the browser actually runs agree with Python?
 *
 * WHAT CHANGED AND WHY IT MATTERED
 * --------------------------------
 * This script used to read pmhc_model.json and reimplement tree traversal in
 * eight lines of its own. That measured agreement between Python and the
 * HARNESS -- not between Python and `PeptideMHCPredictor`, which is the class
 * the app ships. Two independent implementations agreeing is real evidence, but
 * it is evidence about the export format, not about serving. A defect in
 * shared/pmhc-predictor.ts would have passed unnoticed, and the README's parity
 * claim implied otherwise.
 *
 * The two reimplementations had already drifted in ways that happened not to
 * matter: the harness omitted XGBoost's missing-value branch entirely, and
 * accumulated leaf values without the float32 rounding the shipped class
 * performs. Both are no-ops on strictly one-hot features. "Happened not to
 * matter" is not a property you want load-bearing.
 *
 * So this now imports the shipped class. The standalone traversal survives as
 * scripts/tests/export-format.test.mjs, relabelled as what it always actually
 * was: a check on the exported tree format, cross-validated against the runtime.
 *
 * CONTRACT WITH THE PYTHON SIDE
 * -----------------------------
 * Writes scripts/out/parity-js.json. scripts/verify_parity.py reads that file,
 * rescores every pair with the original XGBoost booster, and fails above a
 * 1e-6 tolerance. The JSON shape is unchanged, so the Python side needs no edit.
 *
 *   node --experimental-strip-types scripts/verify-parity.mjs
 *   uv run --with xgboost --with "numpy<2" python scripts/verify_parity.py
 *
 * Run both after any change to the model export, the encoder, or the predictor.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The shipped predictor, imported rather than reimplemented. This single line is
// the point of the rewrite: whatever the browser executes is what gets measured.
import { PeptideMHCPredictor } from "../shared/pmhc-predictor.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const models = join(root, "client", "public", "models");

const model = JSON.parse(readFileSync(join(models, "pmhc_model.json"), "utf8"));
const alleleTable = JSON.parse(readFileSync(join(models, "pmhc_alleles.json"), "utf8"));

// Constructed exactly as client/src/lib/pmhc-model.ts constructs it, so the
// feature-count consistency check in the constructor runs here too.
const predictor = new PeptideMHCPredictor(model, alleleTable);

// A deterministic spread of pairs: every allele, four peptide lengths, residues
// drawn from a fixed LCG so Python scores byte-identical inputs. Seed and
// generator must not change without regenerating the Python side in the same run.
const AAs = "ACDEFGHIKLMNPQRSTVWY";
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const alleles = Object.keys(alleleTable.pseudoSequences).sort();
const cases = [];
for (const allele of alleles) {
  for (const len of [8, 9, 10, 11]) {
    let peptide = "";
    for (let i = 0; i < len; i++) peptide += AAs[Math.floor(rand() * AAs.length)];
    // predict() returns { probability, rank, margin, alleleKnown }; the Python
    // comparison uses probability, and margin is kept so a disagreement can be
    // traced to the traversal rather than to the logistic transform.
    const { probability, margin } = predictor.predict(peptide, allele);
    cases.push({ peptide, allele, probability, margin });
  }
}

// Timed separately from generation so the figure reflects inference alone.
const t0 = performance.now();
for (const c of cases) predictor.predict(c.peptide, c.allele);
const perCall = (performance.now() - t0) / cases.length;

mkdirSync(join(root, "scripts", "out"), { recursive: true });
writeFileSync(
  join(root, "scripts", "out", "parity-js.json"),
  JSON.stringify(
    {
      nTrees: model.nTrees,
      msPerPrediction: perCall,
      scoredBy: "shared/pmhc-predictor.ts PeptideMHCPredictor",
      cases,
    },
    null,
    1,
  ),
);

console.log(`scored ${cases.length} pairs across ${alleles.length} alleles`);
console.log(`via ${"PeptideMHCPredictor"} — the class the app ships`);
console.log(`${perCall.toFixed(3)} ms per prediction (JS, single-threaded)`);
console.log("wrote scripts/out/parity-js.json");

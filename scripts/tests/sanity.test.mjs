/**
 * Biological sanity checks — the exact table published in BENCHMARKS.md,
 * re-verified against the live model asset so the published numbers cannot
 * silently drift out of sync with what actually ships (this is the failure
 * mode that let a retracted ESM-2 number sit in six files at once — see
 * docs/CHANGE-RECORD-2026-08-26.md section 5).
 *
 * Tolerance is tight (1e-3) because these predictions should be exactly
 * reproducible float32 tree-sum arithmetic, not approximate.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PeptideMHCPredictor } from "../../shared/pmhc-predictor.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const modelsDir = join(root, "client", "public", "models");
const model = JSON.parse(readFileSync(join(modelsDir, "pmhc_model.json"), "utf8"));
const alleles = JSON.parse(readFileSync(join(modelsDir, "pmhc_alleles.json"), "utf8"));
const predictor = new PeptideMHCPredictor(model, alleles);

const TOL = 1e-3;

// peptide, allele, expected p(bind), label — from BENCHMARKS.md's
// "Biological sanity check" table, literature-known immunodominant epitopes.
const KNOWN_EPITOPES = [
  ["GILGFVFTL", "HLA-A*02:01", 0.906, "Influenza A M1 58-66"],
  ["NLVPMVATV", "HLA-A*02:01", 0.907, "CMV pp65"],
  ["GLCTLVAML", "HLA-A*02:01", 0.915, "EBV BMLF1"],
  ["KRWIILGLNK", "HLA-B*27:05", 0.785, "HIV-1 gag KK10"],
];

for (const [peptide, allele, expected, label] of KNOWN_EPITOPES) {
  test(`sanity: ${label} (${peptide} / ${allele}) scores ~${expected}`, () => {
    const { probability } = predictor.predict(peptide, allele);
    assert.ok(
      Math.abs(probability - expected) < TOL,
      `expected ~${expected}, got ${probability.toFixed(4)} — model asset may have changed`,
    );
  });
}

test("sanity: same peptide on the wrong allele collapses (proves the allele is actually used)", () => {
  const right = predictor.predict("GILGFVFTL", "HLA-A*02:01").probability;
  const wrong = predictor.predict("GILGFVFTL", "HLA-B*07:02").probability;
  assert.ok(Math.abs(right - 0.906) < TOL, `right-allele baseline drifted: ${right}`);
  assert.ok(Math.abs(wrong - 0.194) < TOL, `wrong-allele score drifted: ${wrong}`);
  assert.ok(right - wrong > 0.5, "wrong-allele score should collapse relative to the correct allele");
});

test("sanity: poly-alanine (no anchor residues) scores low", () => {
  const { probability } = predictor.predict("AAAAAAAAA", "HLA-A*02:01");
  assert.ok(Math.abs(probability - 0.361) < TOL, `expected ~0.361, got ${probability.toFixed(4)}`);
});

/**
 * Encoder / predictor unit tests — the REAL shared/pmhc-predictor.ts against
 * the REAL shipped model assets (client/public/models/*.json), the same code
 * path the browser uses. Not a reimplementation: `PeptideMHCPredictor` is
 * imported directly.
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

test("encoder: model asset matches the encoding's declared feature count", () => {
  assert.equal(model.nFeatures, alleles.nFeatures);
});

test("encoder: ships the 129 trained alleles the model card promises", () => {
  assert.equal(predictor.alleleNames().length, 129);
});

test("encoder: recognizes a trained allele", () => {
  assert.equal(predictor.hasAllele("HLA-A*02:01"), true);
});

test("encoder: rejects an allele it was never trained on (unsupported-allele guard)", () => {
  // This is the exact guard local-backend.ts relies on before it will score a
  // request — see predict()/scoreFor() in client/src/lib/local-backend.ts.
  assert.equal(predictor.hasAllele("HLA-Z*99:99"), false);
  const { alleleKnown } = predictor.encode("GILGFVFTL", "HLA-Z*99:99");
  assert.equal(alleleKnown, false, "unknown allele must encode as unknown, not silently as zeros");
});

test("encoder: a known allele encodes as known", () => {
  const { alleleKnown } = predictor.encode("GILGFVFTL", "HLA-A*02:01");
  assert.equal(alleleKnown, true);
});

test("encoder: prediction is a valid probability", () => {
  const { probability } = predictor.predict("GILGFVFTL", "HLA-A*02:01");
  assert.ok(probability >= 0 && probability <= 1, `probability ${probability} out of [0,1]`);
});

test("encoder: prediction is deterministic (no hidden randomness)", () => {
  const a = predictor.predict("NLVPMVATV", "HLA-A*02:01");
  const b = predictor.predict("NLVPMVATV", "HLA-A*02:01");
  assert.equal(a.probability, b.probability);
});

test("encoder: same peptide, different allele gives a different score", () => {
  const a = predictor.predict("GILGFVFTL", "HLA-A*02:01").probability;
  const b = predictor.predict("GILGFVFTL", "HLA-B*07:02").probability;
  assert.notEqual(a, b, "allele must actually be conditioned on, not ignored");
});

test("encoder: rank label matches the probability thresholds", () => {
  assert.equal(predictor.predict("GILGFVFTL", "HLA-A*02:01").rank, "Strong"); // ~0.895
});

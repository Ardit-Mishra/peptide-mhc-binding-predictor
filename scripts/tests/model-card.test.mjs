/**
 * Model-card consistency — catches the exact failure mode described in
 * docs/CHANGE-RECORD-2026-08-26.md section 5: a number published in one file
 * (BENCHMARKS.md) drifting out of sync with the code that actually ships
 * (shared/pmhc-predictor.ts) or with the asset it describes
 * (client/public/models/pmhc_alleles.json). Every assertion here derives its
 * "expected" value from PMHC_MODEL_CARD or a shipped asset — never a second
 * hardcoded copy of the number — so this test fails the moment the two
 * sources disagree, however the drift happened.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PMHC_MODEL_CARD } from "../../shared/pmhc-predictor.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const modelsDir = join(root, "client", "public", "models");
const alleles = JSON.parse(readFileSync(join(modelsDir, "pmhc_alleles.json"), "utf8"));

test("model card: alleles promised == alleles actually shipped in the asset", () => {
  const shipped = Object.keys(alleles.pseudoSequences).length;
  assert.equal(
    PMHC_MODEL_CARD.alleles,
    shipped,
    `PMHC_MODEL_CARD says ${PMHC_MODEL_CARD.alleles} alleles but the shipped asset has ${shipped}`,
  );
});

test("model card: trainingExamples matches the sum of per-allele training counts in the asset", () => {
  const sum = Object.values(alleles.trainingCounts ?? {}).reduce((a, s) => a + s.n, 0);
  assert.equal(
    PMHC_MODEL_CARD.trainingExamples,
    sum,
    `PMHC_MODEL_CARD says ${PMHC_MODEL_CARD.trainingExamples} training rows but per-allele counts sum to ${sum}`,
  );
});

test("model card: rocAuc matches the split ladder's own peptide-grouped reproduction", () => {
  // rocAuc/prAuc and splitLadder.peptideGrouped are now both read from the
  // same training run (see the PROVENANCE comment on PMHC_MODEL_CARD), so
  // they should agree to the 4 decimal places both are rounded to -- any
  // gap here means one of the two has drifted from its source again.
  assert.equal(
    PMHC_MODEL_CARD.rocAuc.toFixed(4),
    PMHC_MODEL_CARD.splitLadder.peptideGrouped.rocAuc.toFixed(4),
    "rocAuc and splitLadder.peptideGrouped.rocAuc should describe the same evaluation run",
  );
  assert.equal(
    PMHC_MODEL_CARD.prAuc.toFixed(4),
    PMHC_MODEL_CARD.splitLadder.peptideGrouped.prAuc.toFixed(4),
    "prAuc and splitLadder.peptideGrouped.prAuc should describe the same evaluation run",
  );
});

test("model card: BENCHMARKS.md quotes the same headline ROC-AUC/PR-AUC the code ships", () => {
  const benchmarks = readFileSync(join(root, "BENCHMARKS.md"), "utf8");
  assert.ok(
    benchmarks.includes(PMHC_MODEL_CARD.rocAuc.toFixed(4)),
    `BENCHMARKS.md does not mention ROC-AUC ${PMHC_MODEL_CARD.rocAuc.toFixed(4)}`,
  );
  assert.ok(
    benchmarks.includes(PMHC_MODEL_CARD.prAuc.toFixed(4)),
    `BENCHMARKS.md does not mention PR-AUC ${PMHC_MODEL_CARD.prAuc.toFixed(4)}`,
  );
});

test("model card: BENCHMARKS.md quotes the same LOAO macro ROC-AUC the code shows in the app", () => {
  const benchmarks = readFileSync(join(root, "BENCHMARKS.md"), "utf8");
  const asThreeDp = PMHC_MODEL_CARD.loao.macroRocAuc.toFixed(3);
  assert.ok(
    benchmarks.includes(asThreeDp),
    `BENCHMARKS.md does not mention LOAO macro ROC-AUC ${asThreeDp}`,
  );
});

test("model card: BENCHMARKS.md quotes the same raw-calibration ECE the code shows in the app", () => {
  const benchmarks = readFileSync(join(root, "BENCHMARKS.md"), "utf8");
  const asFourDp = PMHC_MODEL_CARD.calibration.raw.ece10bin.toFixed(4);
  assert.ok(
    benchmarks.includes(asFourDp),
    `BENCHMARKS.md does not mention raw ECE ${asFourDp}`,
  );
});

// The training project (ml-training/) is its own separate repo (see the
// top-level standing context) and is not checked out alongside this one in
// CI, so this cross-repo re-derivation only runs when it happens to be
// present on disk (e.g. a local dev checkout) rather than failing CI outright.
const trainingRepo = join(root, "..", "ml-training", "peptide-mhc");
const haveTrainingRepo = existsSync(trainingRepo);

test(
  "model card: PMHC_MODEL_CARD.loao matches ml-training's pmhc_metrics_loao_distance.json (local checkout only)",
  { skip: !haveTrainingRepo && "ml-training is a separate repo, not present in this checkout" },
  () => {
    const src = JSON.parse(
      readFileSync(join(trainingRepo, "pmhc_metrics_loao_distance.json"), "utf8"),
    );
    const agg = src.aggregate_overall;
    assert.ok(Math.abs(PMHC_MODEL_CARD.loao.macroRocAuc - agg.macro_roc_auc) < 5e-4);
    assert.ok(Math.abs(PMHC_MODEL_CARD.loao.nWeightedRocAuc - agg.n_weighted_roc_auc) < 5e-4);
    assert.equal(PMHC_MODEL_CARD.loao.nAlleles, agg.n_alleles);
  },
);

test(
  "model card: PMHC_MODEL_CARD.rocAuc/prAuc match ml-training's pmhc_metrics.json (local checkout only)",
  { skip: !haveTrainingRepo && "ml-training is a separate repo, not present in this checkout" },
  () => {
    // This is the exact drift a past review caught: rocAuc/prAuc's own code
    // comment named pmhc_metrics.json as their source, but nothing ever
    // opened that file and compared it -- so a stale hardcoded number was
    // invisible to CI. Open it and compare, for real, every run.
    const src = JSON.parse(readFileSync(join(trainingRepo, "pmhc_metrics.json"), "utf8"));
    assert.equal(
      PMHC_MODEL_CARD.rocAuc.toFixed(4),
      src.test_roc_auc.toFixed(4),
      `PMHC_MODEL_CARD.rocAuc (${PMHC_MODEL_CARD.rocAuc}) does not match ` +
        `pmhc_metrics.json's test_roc_auc (${src.test_roc_auc})`,
    );
    assert.equal(
      PMHC_MODEL_CARD.prAuc.toFixed(4),
      src.test_pr_auc.toFixed(4),
      `PMHC_MODEL_CARD.prAuc (${PMHC_MODEL_CARD.prAuc}) does not match ` +
        `pmhc_metrics.json's test_pr_auc (${src.test_pr_auc})`,
    );
  },
);

test(
  "model card: PMHC_MODEL_CARD.calibration matches ml-training's pmhc_metrics_calibration.json (local checkout only)",
  { skip: !haveTrainingRepo && "ml-training is a separate repo, not present in this checkout" },
  () => {
    const src = JSON.parse(
      readFileSync(join(trainingRepo, "pmhc_metrics_calibration.json"), "utf8"),
    );
    assert.ok(Math.abs(PMHC_MODEL_CARD.calibration.raw.brier - src.raw.brier_score) < 5e-4);
    assert.ok(Math.abs(PMHC_MODEL_CARD.calibration.raw.ece10bin - src.raw.ece_10bin) < 5e-4);
    assert.ok(
      Math.abs(PMHC_MODEL_CARD.calibration.platt.brier - src.platt_fit_on_validation.brier_score) < 5e-4,
    );
  },
);

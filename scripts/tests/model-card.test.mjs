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
import { createHash } from "node:crypto";
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

// The metrics that back this card are produced in ml-training/, a separate and
// unpublished repository that CI does not check out. These three checks used to
// SKIP on CI for that reason -- which meant the LOAO, ROC-AUC/PR-AUC and
// calibration figures the app displays were only ever verified on one laptop.
//
// The three source artifacts are now committed here verbatim under
// scripts/fixtures/training-metrics/, so the checks run everywhere. Verbatim,
// not summarised: a distilled copy would be a second place for a number to
// live, which is precisely the drift this file exists to catch.
//
// A fixture that can silently go stale is worse than a skip, so the last test
// below re-reads the real ml-training files when they ARE present and fails if
// the committed copies have drifted from them.
const fixtures = join(root, "scripts", "fixtures", "training-metrics");
const readFixture = (name) => JSON.parse(readFileSync(join(fixtures, name), "utf8"));

const trainingRepo = join(root, "..", "ml-training", "peptide-mhc");
const haveTrainingRepo = existsSync(trainingRepo);

test("model card: PMHC_MODEL_CARD.loao matches the LOAO study artifact", () => {
  const agg = readFixture("pmhc_metrics_loao_distance.json").aggregate_overall;
  assert.ok(Math.abs(PMHC_MODEL_CARD.loao.macroRocAuc - agg.macro_roc_auc) < 5e-4);
  assert.ok(Math.abs(PMHC_MODEL_CARD.loao.nWeightedRocAuc - agg.n_weighted_roc_auc) < 5e-4);
  assert.equal(PMHC_MODEL_CARD.loao.nAlleles, agg.n_alleles);
});

test("model card: PMHC_MODEL_CARD.rocAuc/prAuc match the training metrics artifact", () => {
  // The exact drift a past review caught: rocAuc/prAuc's own comment named
  // pmhc_metrics.json as their source, but nothing ever opened that file and
  // compared it -- so a stale hardcoded number was invisible. Open it, for real.
  const src = readFixture("pmhc_metrics.json");
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
});

test("model card: PMHC_MODEL_CARD.calibration matches the calibration study artifact", () => {
  const src = readFixture("pmhc_metrics_calibration.json");
  assert.ok(Math.abs(PMHC_MODEL_CARD.calibration.raw.brier - src.raw.brier_score) < 5e-4);
  assert.ok(Math.abs(PMHC_MODEL_CARD.calibration.raw.ece10bin - src.raw.ece_10bin) < 5e-4);
  assert.ok(
    Math.abs(PMHC_MODEL_CARD.calibration.platt.brier - src.platt_fit_on_validation.brier_score) < 5e-4,
  );
});

test("fixture manifest records what was captured", () => {
  const manifest = readFixture("MANIFEST.json");
  const names = Object.keys(manifest.files).sort();
  assert.deepEqual(names, [
    "pmhc_metrics.json",
    "pmhc_metrics_calibration.json",
    "pmhc_metrics_loao_distance.json",
  ]);
  for (const [name, meta] of Object.entries(manifest.files)) {
    const actual = readFileSync(join(fixtures, name));
    assert.equal(actual.length, meta.bytes, `${name}: size differs from the manifest`);
    assert.equal(
      createHash("sha256").update(actual).digest("hex"),
      meta.sha256,
      `${name}: content differs from the sha256 recorded when it was captured`,
    );
  }
});

test(
  "committed fixtures still match the live ml-training artifacts (local checkout only)",
  { skip: !haveTrainingRepo && "ml-training is a separate repo, not present in this checkout" },
  () => {
    // The one check that cannot run in CI, and the reason the others now can.
    // If a training re-run changes a metric, this fails locally and the fixture
    // must be recaptured -- otherwise CI would keep happily verifying the card
    // against a snapshot of a model that no longer exists.
    for (const name of Object.keys(readFixture("MANIFEST.json").files)) {
      const committed = readFileSync(join(fixtures, name));
      const live = readFileSync(join(trainingRepo, name));
      assert.equal(
        createHash("sha256").update(committed).digest("hex"),
        createHash("sha256").update(live).digest("hex"),
        `${name} in scripts/fixtures/training-metrics/ has drifted from ` +
          `ml-training/peptide-mhc/${name}. Recapture the fixture.`,
      );
    }
  },
);

/**
 * The README states the pseudo-sequence length in prose, twice. It said 34 --
 * NetMHCpan's canonical length, and a plausible number to write from memory --
 * while the MHCflurry release this model actually trained on ships 39. Nothing
 * caught it because no test read the prose. Every other doc claim in this file
 * is checked against the artifact; this one now is too.
 */
test("README's pseudo-sequence length matches the shipped allele table", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const L = alleles.alleleLength;
  const alleleFeatures = L * alleles.alphabet.length;

  const lengths = new Set(Object.values(alleles.pseudoSequences).map((s) => s.length));
  assert.deepEqual([...lengths], [L], `pseudoSequences are not all ${L} residues`);

  assert.ok(
    readme.includes(`**${L}-residue pseudo-sequence**`),
    `README must say "${L}-residue pseudo-sequence" to match pmhc_alleles.json`,
  );
  assert.ok(
    readme.includes(`${alleleFeatures} of the 1,000 input features`),
    `README must state the ${alleleFeatures} allele features the encoding actually uses`,
  );
  assert.ok(
    readme.includes(`all ${alleleFeatures} of its allele`),
    `README's unknown-allele passage must cite ${alleleFeatures}, not a remembered number`,
  );
});

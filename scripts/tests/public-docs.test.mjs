import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PMHC_MODEL_CARD } from "../../shared/pmhc-predictor.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("public documentation describes the shipped XGBoost runtime, not retired placeholder models", () => {
  const readme = read("README.md");
  const architecture = read("docs/architecture.md");
  const methodology = read("docs/model-methodology.md");

  for (const document of [readme, architecture, methodology]) {
    assert.ok(document.includes("XGBoost"), "current documentation must name the shipped model");
    assert.ok(!document.includes("server/models/*.ts"), "retired server model path must not appear in current docs");
    assert.ok(!document.includes("Math.random()"), "retired random scorer must not appear in current docs");
  }
});

test("public model card agrees with the runtime-owned model facts", () => {
  const modelCard = read("docs/MODEL-CARD.md");
  const normalized = modelCard.replace(/\s+/g, " ");

  assert.ok(normalized.includes(PMHC_MODEL_CARD.algorithm.replace(/\s+/g, " ")));
  assert.ok(normalized.includes(`${PMHC_MODEL_CARD.trainingExamples.toLocaleString()} training rows`));
  assert.ok(normalized.includes(`${PMHC_MODEL_CARD.alleles} supported HLA-A, -B, and -C alleles`));
  assert.ok(normalized.includes(PMHC_MODEL_CARD.rocAuc.toFixed(4)));
  assert.ok(normalized.includes(PMHC_MODEL_CARD.prAuc.toFixed(4)));
  assert.ok(normalized.includes(PMHC_MODEL_CARD.calibration.raw.ece10bin.toFixed(4)));
});

test("release documentation makes the held-back deployment state explicit", () => {
  const readme = read("README.md");
  const release = read("docs/RELEASE-CHECKLIST.md");

  assert.ok(readme.includes("Release status"));
  assert.ok(!readme.includes("**Live:**"), "README must not call a deliberately held-back domain live");
  assert.match(
    release.replace(/\s+/g, " "),
    /do not run the publish commands until an operator approves/i,
  );
  assert.ok(release.includes("npm run check"));
  assert.ok(release.includes("npm run build"));
});

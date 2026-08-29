/**
 * The prediction bench.
 *
 * This app answers exactly one question — will this peptide bind this allele —
 * so the page is that question and its answer, and nothing else. The previous
 * layout was a 2/3 + 1/3 dashboard whose right rail held "Quick Actions",
 * "Recent Activity" and a model-performance card, which pushed the actual
 * result to third position in the left column.
 *
 * Two ideas drive the composition:
 *
 *   1. Binding is a property of the PAIR, not of the peptide. The peptide and
 *      allele are therefore set as one joined specimen with an explicit "×"
 *      between them, rather than as two unrelated form fields. This is the same
 *      fact the batch defect got wrong by scoring every row against one allele.
 *
 *   2. The measurement is the hero. The probability is set large in tabular
 *      mono over a tick scale, the way an instrument prints a reading, with the
 *      evidence that qualifies it (training support, split, limitation) beneath
 *      rather than beside it.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { loadAlleleList } from "@/lib/pmhc-model";
import { MODEL_KEYS, type PredictResponse } from "@shared/schema";
import { PMHC_MODEL_CARD } from "@shared/pmhc-predictor";
import { Split, Calibration, Mutation } from "@/components/icons";

const AA = "ACDEFGHIKLMNPQRSTVWY";
const AA_RE = new RegExp(`^[${AA}]+$`);

type Allele = { allele: string; support?: { n: number } };

function validate(peptide: string): string | null {
  if (!peptide) return "Enter a peptide.";
  if (!AA_RE.test(peptide)) return "Use the 20 standard amino-acid letters only.";
  if (peptide.length < 8 || peptide.length > 11) return "MHC class I peptides are 8-11 residues.";
  return null;
}

export default function Home() {
  const { toast } = useToast();
  const [peptide, setPeptide] = useState("GILGFVFTL");
  const [allele, setAllele] = useState("HLA-A*02:01");
  const [alleles, setAlleles] = useState<Allele[]>([]);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState(false);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    loadAlleleList()
      .then((list) => active && setAlleles(list))
      .catch(() => active && toast({
        title: "Allele list unavailable",
        description: "Reload the page to try again.",
        variant: "destructive",
      }));
    return () => { active = false; };
  }, [toast]);

  const error = touched ? validate(peptide) : null;
  const support = useMemo(
    () => alleles.find((a) => a.allele === allele)?.support?.n ?? null,
    [alleles, allele],
  );

  async function measure() {
    setTouched(true);
    const problem = validate(peptide);
    if (problem) return;
    setPending(true);
    setResult(null);
    try {
      const data = await api.predict({ sequence: peptide, model: MODEL_KEYS[0], mhcAllele: allele });
      setResult(data);
      requestAnimationFrame(() => readoutRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch (e) {
      toast({
        title: "Prediction failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  const residues = peptide.toUpperCase().split("");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      {/* Identity: a hairline strip, not a card with a gradient logo tile. */}
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border py-5">
        <h1 className="text-[15px] font-semibold tracking-tight">Peptide–MHC binding</h1>
        <p className="instrument-label">
          {PMHC_MODEL_CARD.alleles} HLA alleles · runs in your browser
        </p>
      </header>

      {/* ------------------------------------------------------ the specimen */}
      <section className="mt-10" aria-labelledby="pair-heading">
        <h2 id="pair-heading" className="instrument-label mb-3">Peptide × Allele</h2>

        <div className="rounded-md border border-border bg-card">
          <div className="grid grid-cols-1 items-stretch sm:grid-cols-[1fr_auto_1fr]">
            {/* peptide */}
            <div className="p-4">
              <label htmlFor="peptide" className="instrument-label">Peptide</label>
              <input
                id="peptide"
                value={peptide}
                onChange={(e) => setPeptide(e.target.value.toUpperCase())}
                onBlur={() => setTouched(true)}
                onKeyDown={(e) => e.key === "Enter" && measure()}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={!!error}
                aria-describedby={error ? "peptide-error" : "peptide-hint"}
                className="seq mt-2 w-full border-0 border-b border-border bg-transparent pb-1 text-2xl text-foreground outline-none focus:border-primary"
                data-testid="input-sequence"
                placeholder="8-11 residues"
              />
              {/* Indexed residue strip: a peptide is read position by position,
                  and P2/P9 anchors are what determine binding. */}
              <div className="mt-4 flex flex-wrap gap-0.5" aria-hidden="true">
                {residues.map((r, i) => (
                  <span
                    key={`${r}-${i}`}
                    className={`flex h-10 w-7 flex-col items-center justify-center gap-1 border-b-2 font-mono text-[15px] leading-none ${
                      AA.includes(r) ? "border-border text-foreground" : "border-destructive text-destructive"
                    }`}
                  >
                    {r}
                    <span className="text-[9px] tabular text-muted-foreground">{i + 1}</span>
                  </span>
                ))}
              </div>
              <p id="peptide-hint" className="mt-3 text-xs text-muted-foreground">
                {residues.length} residues
              </p>
              {error && (
                <p id="peptide-error" role="alert" className="mt-1 text-xs text-destructive">{error}</p>
              )}
            </div>

            {/* The join. Binding belongs to the pair — the operator says so. */}
            <div
              className="flex items-center justify-center border-y border-border px-5 font-mono text-lg text-muted-foreground sm:border-x sm:border-y-0"
              aria-hidden="true"
            >
              ×
            </div>

            {/* allele */}
            <div className="p-4">
              <label className="instrument-label">MHC allele</label>
              <Select value={allele} onValueChange={setAllele}>
                <SelectTrigger
                  className="seq mt-2 h-auto rounded-none border-0 border-b border-border bg-transparent px-0 pb-1 text-2xl focus:ring-0 focus:border-primary"
                  data-testid="select-mhc-allele"
                >
                  <SelectValue>{allele}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {/* Only trained alleles are offered, so the picker cannot ask
                      the model for one it has never seen. */}
                  {alleles.map(({ allele: a, support: s }) => (
                    <SelectItem key={a} value={a} className="font-mono text-xs">
                      {a}
                      {s && <span className="ml-3 text-muted-foreground">n={s.n.toLocaleString()}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-3 text-xs text-muted-foreground">
                {support !== null
                  ? <><span className="font-mono text-foreground">{support.toLocaleString()}</span> training measurements</>
                  : "training support not recorded"}
              </p>
            </div>
          </div>

          <div className="border-t border-border p-4">
            <Button
              onClick={measure}
              disabled={pending}
              className="w-full sm:w-auto"
              data-testid="button-predict"
            >
              {pending ? <><span className="loading-spinner mr-2" />Measuring…</> : "Measure binding"}
            </Button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- the readout */}
      {result && (
        <section ref={readoutRef} className="readout-enter mt-12" aria-labelledby="readout-heading">
          <h2 id="readout-heading" className="instrument-label mb-3">Reading</h2>

          <div className="rounded-md border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <output className="readout-value block text-[clamp(48px,12vw,84px)]" data-testid="text-probability">
                  {result.probability.toFixed(4)}
                </output>
                <div className="tick-scale mt-3 w-full max-w-[280px]" aria-hidden="true" />
                <p className="instrument-label mt-2">P( IC50 &lt; 500 nM )</p>
              </div>

              <div className="text-right">
                <p className="font-mono text-lg text-foreground" data-testid="text-call">{result.rank}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.probability > 0.8 ? "p > 0.8" : result.probability > 0.5 ? "0.5 < p ≤ 0.8" : "p ≤ 0.5"}
                </p>
              </div>
            </div>

            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="progress-bar h-1.5"
                style={{ ["--fill" as string]: result.probability }}
                role="meter"
                aria-valuenow={Number((result.probability * 100).toFixed(1))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Binding probability"
              />
            </div>

            {/* What qualifies the number, directly beneath it. */}
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 sm:grid-cols-4">
              <div>
                <dt className="instrument-label">Pair</dt>
                <dd className="seq mt-1 text-sm">{result.sequence}</dd>
                <dd className="seq text-xs text-muted-foreground">{result.mhcAllele}</dd>
              </div>
              <div>
                <dt className="instrument-label">Training support</dt>
                <dd className="mt-1 font-mono text-sm tabular">
                  {result.alleleSupportN?.toLocaleString() ?? "—"}
                </dd>
                <dd className="text-xs text-muted-foreground">measurements</dd>
              </div>
              <div>
                <dt className="instrument-label">Compute</dt>
                <dd className="mt-1 font-mono text-sm tabular">{result.computeTime}</dd>
                <dd className="text-xs text-muted-foreground">in this browser</dd>
              </div>
              <div>
                <dt className="instrument-label">Model</dt>
                <dd className="mt-1 font-mono text-sm">XGBoost</dd>
                <dd className="text-xs text-muted-foreground">+ pseudo-sequence</dd>
              </div>
            </dl>
          </div>

          {/* Ochre appears here and nowhere else: a stated limitation. */}
          <div className="caveat mt-4">
            <p className="instrument-label mb-1" style={{ color: "var(--caveat)" }}>Stated limitation</p>
            <p className="text-sm text-muted-foreground">
              This is a raw, uncalibrated probability — Platt scaling was measured to fix it
              (ECE 0.093 → 0.008) but is not applied in production, so read it alongside the
              training support above. If this allele is one the model has never trained on,
              expect noticeably worse accuracy (leave-one-allele-out macro ROC-AUC drops to
              0.842 — see "What this model can and can't do" below). Research use only; not a
              clinical or diagnostic tool.
            </p>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- the method */}
      <section className="mt-12" aria-labelledby="method-heading">
        <h2 id="method-heading" className="instrument-label mb-3">Method</h2>
        <dl className="divide-y divide-border border-y border-border text-sm">
          {[
            ["Algorithm", PMHC_MODEL_CARD.algorithm],
            ["Encoding", PMHC_MODEL_CARD.encoding],
            ["Training data", `${PMHC_MODEL_CARD.trainingExamples.toLocaleString()} measurements · ${PMHC_MODEL_CARD.dataSource}`],
            ["Split", PMHC_MODEL_CARD.split],
            ["Held-out", `ROC-AUC ${PMHC_MODEL_CARD.rocAuc.toFixed(4)} · PR-AUC ${PMHC_MODEL_CARD.prAuc.toFixed(4)}`],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
              <dt className="instrument-label pt-0.5">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          Scoring many pairs? <Link href="/batch" className="text-primary underline underline-offset-4">Batch prediction</Link> takes
          a peptide and allele per row. Want to see how the model treats a single substitution?{" "}
          <Link href="/mutation-scan" className="text-primary underline underline-offset-4">Mutation scan</Link>{" "}
          plots every possible substitution as a heatmap.
        </p>
      </section>

      {/* -------------------------------------------------- the evaluation */}
      <section className="mt-12" aria-labelledby="eval-heading">
        <h2 id="eval-heading" className="instrument-label mb-3">What this model can and can't do</h2>

        {/* Split ladder: same data, four difficulties, same held-out metric.
            The point of this table is that 0.9188 is not one fixed truth —
            it is a function of how hard the split is. */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Split size={15} className="text-[var(--ds-accent)]" aria-hidden="true" />
            <h3 className="instrument-label">Split difficulty ladder</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="instrument-label border-b border-border text-[10px]">
                  <th className="pb-2 pr-4 font-normal">Split</th>
                  <th className="pb-2 pr-4 font-normal">ROC-AUC</th>
                  <th className="pb-2 font-normal">PR-AUC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { l: PMHC_MODEL_CARD.splitLadder.randomSplit.label, r: PMHC_MODEL_CARD.splitLadder.randomSplit.rocAuc, p: PMHC_MODEL_CARD.splitLadder.randomSplit.prAuc, hi: false },
                  { l: PMHC_MODEL_CARD.splitLadder.peptideGrouped.label, r: PMHC_MODEL_CARD.splitLadder.peptideGrouped.rocAuc, p: PMHC_MODEL_CARD.splitLadder.peptideGrouped.prAuc, hi: true },
                  { l: PMHC_MODEL_CARD.splitLadder.sequenceCluster.label, r: PMHC_MODEL_CARD.splitLadder.sequenceCluster.rocAuc, p: PMHC_MODEL_CARD.splitLadder.sequenceCluster.prAuc, hi: false },
                  { l: PMHC_MODEL_CARD.splitLadder.alleleHeldOut.label, r: PMHC_MODEL_CARD.splitLadder.alleleHeldOut.rocAuc, p: PMHC_MODEL_CARD.splitLadder.alleleHeldOut.prAuc, hi: false },
                ].map((row) => (
                  <tr key={row.l} className={row.hi ? "text-foreground" : "text-muted-foreground"}>
                    <td className="py-1.5 pr-4">
                      {row.l}
                      {row.hi && <span className="instrument-label ml-2 text-[9px] text-[var(--ds-accent-ink)]">← same split as production (see note)</span>}
                    </td>
                    <td className="py-1.5 pr-4 font-mono tabular">{row.r.toFixed(4)}</td>
                    <td className="py-1.5 font-mono tabular">{row.p.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The random split leaks (the same peptide can appear in train and test) and reads highest; the
            allele-held-out row is the honest floor. This app's deployed model itself scores{" "}
            <span className="font-mono tabular text-foreground">{PMHC_MODEL_CARD.rocAuc.toFixed(4)}</span> on its
            own peptide-grouped test set — the same number as the table's peptide-grouped row, read directly from
            the training run's own metrics file (see the model card's provenance note in source).
          </p>
        </div>

        {/* LOAO by locus — the caveat lives right next to the number. */}
        <div className="mt-4 rounded-md border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Split size={15} className="text-[var(--ds-accent)]" aria-hidden="true" />
            <h3 className="instrument-label">Generalization to an unseen allele (leave-one-allele-out)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="instrument-label border-b border-border text-[10px]">
                  <th className="pb-2 pr-4 font-normal">Locus</th>
                  <th className="pb-2 pr-4 font-normal">Alleles held out (n)</th>
                  <th className="pb-2 font-normal">Macro ROC-AUC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="text-foreground">
                  <td className="py-1.5 pr-4">All 14, overall</td>
                  <td className="py-1.5 pr-4 font-mono tabular">{PMHC_MODEL_CARD.loao.nAlleles}</td>
                  <td className="py-1.5 font-mono tabular">{PMHC_MODEL_CARD.loao.macroRocAuc.toFixed(4)}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td className="py-1.5 pr-4">HLA-A</td>
                  <td className="py-1.5 pr-4 font-mono tabular">{PMHC_MODEL_CARD.loao.byLocus.A.nAlleles}</td>
                  <td className="py-1.5 font-mono tabular">{PMHC_MODEL_CARD.loao.byLocus.A.macroRocAuc.toFixed(4)}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td className="py-1.5 pr-4">HLA-B</td>
                  <td className="py-1.5 pr-4 font-mono tabular">{PMHC_MODEL_CARD.loao.byLocus.B.nAlleles}</td>
                  <td className="py-1.5 font-mono tabular">{PMHC_MODEL_CARD.loao.byLocus.B.macroRocAuc.toFixed(4)}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td className="py-1.5 pr-4">HLA-C</td>
                  <td className="py-1.5 pr-4 font-mono tabular">{PMHC_MODEL_CARD.loao.byLocus.C.nAlleles}</td>
                  <td className="py-1.5 font-mono tabular">{PMHC_MODEL_CARD.loao.byLocus.C.macroRocAuc.toFixed(4)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="caveat mt-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">This is an approximation, not exhaustive</strong> — 14 of the
              129 trained alleles, chosen to span HLA-A/B/C and a range of prevalence, each held out of training
              entirely and scored as if never seen. HLA-C is both the least-represented locus in training and the
              worst-generalizing here (one held-out allele's PR-AUC as low as 0.181 on 27 positives out of 526 rows).
              Distance to the nearest trained allele's pseudo-sequence correlates with the drop
              (Pearson r = {PMHC_MODEL_CARD.loao.distanceCorrelation.pearsonR.toFixed(3)}): treat a prediction on an
              allele far from anything trained on with more suspicion than these averages suggest.
            </p>
          </div>
        </div>

        {/* Calibration */}
        <div className="mt-4 rounded-md border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Calibration size={15} className="text-[var(--ds-accent)]" aria-hidden="true" />
            <h3 className="instrument-label">Calibration — is the probability trustworthy as a probability?</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="instrument-label border-b border-border text-[10px]">
                  <th className="pb-2 pr-4 font-normal">Output</th>
                  <th className="pb-2 pr-4 font-normal">Brier score</th>
                  <th className="pb-2 font-normal">ECE (10-bin)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="text-foreground">
                  <td className="py-1.5 pr-4">Raw sigmoid (what this app shows)</td>
                  <td className="py-1.5 pr-4 font-mono tabular">{PMHC_MODEL_CARD.calibration.raw.brier.toFixed(4)}</td>
                  <td className="py-1.5 font-mono tabular">{PMHC_MODEL_CARD.calibration.raw.ece10bin.toFixed(4)}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td className="py-1.5 pr-4">Platt-scaled (offline analysis only, not served)</td>
                  <td className="py-1.5 pr-4 font-mono tabular">{PMHC_MODEL_CARD.calibration.platt.brier.toFixed(4)}</td>
                  <td className="py-1.5 font-mono tabular">{PMHC_MODEL_CARD.calibration.platt.ece10bin.toFixed(4)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {PMHC_MODEL_CARD.calibration.note}
          </p>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Want to see how sensitive a specific prediction is to individual residues?{" "}
          <Link href="/mutation-scan" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
            <Mutation size={13} aria-hidden="true" /> Run a mutation scan
          </Link>.
        </p>
      </section>
    </div>
  );
}

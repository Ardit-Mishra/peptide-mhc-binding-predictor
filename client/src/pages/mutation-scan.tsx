/**
 * Mutation scan — in-silico saturation mutagenesis.
 *
 * For a chosen peptide x allele pair, every position is substituted with each
 * of the 20 standard amino acids (including a re-check of the wild-type
 * residue itself) and re-scored by the SAME trained model used on the
 * prediction page (client/src/lib/pmhc-model.ts). A 9-mer is 9 x 20 = 180
 * predictions, computed live in this browser in well under a second (the
 * model runs at ~0.08ms/prediction — see BENCHMARKS.md).
 *
 * This is a real explainability artifact, not a decorative chart: the colour
 * of a cell is this model's predicted P(bind) for that single substitution,
 * not a measured binding affinity. There is deliberately no comparison to
 * known anchor-residue motifs (e.g. NetMHCpan/SYFPEITHI binding motifs) —
 * this repo has no such motif dataset checked in to cite, so none is shown.
 * See docs/model-methodology.md and BENCHMARKS.md for what IS measured.
 */
import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { loadAlleleList, loadModel } from "@/lib/pmhc-model";
import { Mutation } from "@/components/icons";
import { PMHC_MODEL_CARD } from "@shared/pmhc-predictor";

const AA_GROUPS: { label: string; residues: string }[] = [
  { label: "Non-polar", residues: "AVLIMFWP" },
  { label: "Polar", residues: "GSTCYNQ" },
  { label: "Acidic", residues: "DE" },
  { label: "Basic", residues: "KRH" },
];
const AA_ORDER = AA_GROUPS.flatMap((g) => g.residues.split(""));
const AA_RE = /^[ACDEFGHIKLMNPQRSTVWY]+$/;

type Allele = { allele: string; support?: { n: number } };
type Cell = { probability: number; isWildType: boolean };

function validate(peptide: string): string | null {
  if (!peptide) return "Enter a peptide.";
  if (!AA_RE.test(peptide)) return "Use the 20 standard amino-acid letters only.";
  if (peptide.length < 8 || peptide.length > 11) return "MHC class I peptides are 8-11 residues.";
  return null;
}

function cellStyle(p: number): CSSProperties {
  // Sequential single-hue scale on the app's own accent, matching the design
  // system's rule that a rainbow implies unordered categories and this is one
  // ordered magnitude (predicted binding probability).
  const alpha = Math.max(0.05, Math.min(1, p));
  return {
    background: `color-mix(in srgb, var(--primary) ${(alpha * 100).toFixed(0)}%, var(--card))`,
    color: p > 0.55 ? "var(--primary-foreground)" : "var(--foreground)",
  };
}

export default function MutationScan() {
  const { toast } = useToast();
  const [peptide, setPeptide] = useState("GILGFVFTL");
  const [allele, setAllele] = useState("HLA-A*02:01");
  const [alleles, setAlleles] = useState<Allele[]>([]);
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [matrix, setMatrix] = useState<Cell[][] | null>(null); // [aaRow][position]
  const [scanned, setScanned] = useState<{ peptide: string; allele: string } | null>(null);

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

  async function runScan() {
    setTouched(true);
    if (validate(peptide)) return;
    setPending(true);
    setMatrix(null);
    try {
      const { predictor } = await loadModel();
      if (!predictor.hasAllele(allele)) {
        toast({
          title: "Unsupported allele",
          description: `${allele} is not one of the ${PMHC_MODEL_CARD.alleles} alleles this model was trained on.`,
          variant: "destructive",
        });
        return;
      }
      const seq = peptide.toUpperCase();
      const rows: Cell[][] = AA_ORDER.map((aa) =>
        seq.split("").map((wt, pos) => {
          const mutated = seq.slice(0, pos) + aa + seq.slice(pos + 1);
          const { probability } = predictor.predict(mutated, allele);
          return { probability, isWildType: aa === wt };
        }),
      );
      setMatrix(rows);
      setScanned({ peptide: seq, allele });
    } catch (e) {
      toast({
        title: "Scan failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  const positionSensitivity = useMemo(() => {
    if (!matrix || !scanned) return null;
    return Array.from({ length: scanned.peptide.length }, (_, pos) => {
      const vals = matrix.map((row) => row[pos].probability);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return { pos, wt: scanned.peptide[pos], min, max, range: max - min };
    });
  }, [matrix, scanned]);

  const mostSensitive = useMemo(() => {
    if (!positionSensitivity) return null;
    return [...positionSensitivity].sort((a, b) => b.range - a.range).slice(0, 2);
  }, [positionSensitivity]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border py-5">
        <h1 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <Mutation size={16} className="text-[var(--ds-accent)]" aria-hidden="true" />
          Mutation scan
        </h1>
        <p className="instrument-label">in-silico saturation mutagenesis · runs in your browser</p>
      </header>

      {/* --------------------------------------------------------- the setup */}
      <section className="mt-8" aria-labelledby="scan-setup-heading">
        <h2 id="scan-setup-heading" className="instrument-label mb-3">Peptide × Allele</h2>
        <div className="rounded-md border border-border bg-card">
          <div className="grid grid-cols-1 items-stretch sm:grid-cols-[1fr_auto_1fr]">
            <div className="p-4">
              <label htmlFor="scan-peptide" className="instrument-label">Peptide</label>
              <input
                id="scan-peptide"
                value={peptide}
                onChange={(e) => setPeptide(e.target.value.toUpperCase())}
                onBlur={() => setTouched(true)}
                onKeyDown={(e) => e.key === "Enter" && runScan()}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={!!error}
                className="seq mt-2 w-full border-0 border-b border-border bg-transparent pb-1 text-xl text-foreground outline-none focus:border-primary"
                placeholder="8-11 residues"
              />
              {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
            </div>
            <div
              className="flex items-center justify-center border-y border-border px-5 font-mono text-lg text-muted-foreground sm:border-x sm:border-y-0"
              aria-hidden="true"
            >
              ×
            </div>
            <div className="p-4">
              <label className="instrument-label">MHC allele</label>
              <Select value={allele} onValueChange={setAllele}>
                <SelectTrigger className="seq mt-2 h-auto rounded-none border-0 border-b border-border bg-transparent px-0 pb-1 text-xl focus:ring-0 focus:border-primary">
                  <SelectValue>{allele}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {alleles.map(({ allele: a, support: s }) => (
                    <SelectItem key={a} value={a} className="font-mono text-xs">
                      {a}
                      {s && <span className="ml-3 text-muted-foreground">n={s.n.toLocaleString()}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t border-border p-4">
            <Button onClick={runScan} disabled={pending} className="w-full sm:w-auto">
              {pending ? <><span className="loading-spinner mr-2" />Scanning…</> : "Run mutation scan"}
            </Button>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- the heatmap */}
      {matrix && scanned && positionSensitivity && (
        <section className="readout-enter mt-10" aria-labelledby="heatmap-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="heatmap-heading" className="instrument-label">
              Substitution heatmap — {scanned.peptide} × {scanned.allele}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>0.0</span>
              <span
                className="h-2.5 w-24 rounded-sm"
                style={{ background: "linear-gradient(90deg, var(--card), var(--primary))" }}
                aria-hidden="true"
              />
              <span>1.0</span>
              <span className="ml-1">P(bind)</span>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-4">
            <table className="border-separate" style={{ borderSpacing: 2 }}>
              <thead>
                <tr>
                  <th className="w-10" />
                  {scanned.peptide.split("").map((wt, i) => (
                    <th key={i} className="pb-1 text-center">
                      <span className="seq block text-sm text-foreground">{wt}</span>
                      <span className="instrument-label block text-[9px]">{i + 1}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AA_GROUPS.map((group) => (
                  <Fragment key={group.label}>
                    <tr aria-hidden="true">
                      <td colSpan={scanned.peptide.length + 1} className="pt-1.5 text-left">
                        <span className="instrument-label text-[9px] text-muted-foreground/70">{group.label}</span>
                      </td>
                    </tr>
                    {group.residues.split("").map((aa) => {
                      const r = AA_ORDER.indexOf(aa);
                      return (
                        <tr key={aa}>
                          <th className="pr-2 text-right font-mono text-xs text-muted-foreground">{aa}</th>
                          {matrix[r].map((cell, c) => (
                            <td
                              key={c}
                              title={`${aa} at position ${c + 1}${cell.isWildType ? " (wild type)" : ""}: P(bind) = ${cell.probability.toFixed(4)}`}
                              className="h-7 w-7 rounded-[3px] text-center align-middle font-mono text-[10px] tabular"
                              style={{
                                ...cellStyle(cell.probability),
                                boxShadow: cell.isWildType ? "inset 0 0 0 1.5px var(--foreground)" : undefined,
                              }}
                            >
                              {Math.round(cell.probability * 100)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[10px] text-muted-foreground">
              Cell value = predicted P(bind) x100, rounded. Outlined cell = the peptide's actual (wild-type) residue at that position, re-scored the same way as every substitution.
            </p>
          </div>

          {/* -------------------------------------------------- what this IS */}
          <div className="caveat mt-4">
            <p className="instrument-label mb-1" style={{ color: "var(--caveat)" }}>What this shows — and does not</p>
            <p className="text-sm text-muted-foreground">
              This heatmap reflects <strong className="text-foreground">this model's</strong> predicted binding
              probability for each single-residue substitution — it is not a measured binding assay, and it is not
              a comparison to known anchor-residue motifs from the literature (no such motif dataset is checked into
              this repo to cite honestly, so none is shown here). The model's own raw output is uncalibrated
              (ECE {PMHC_MODEL_CARD.calibration.raw.ece10bin.toFixed(3)} — see the evaluation panel on the home
              page), so read the colours as a ranking, not as a percentage chance of binding.
            </p>
          </div>

          {/* ------------------------------------------------- position read */}
          <div className="mt-6">
            <h3 className="instrument-label mb-2">Positional sensitivity (this scan)</h3>
            <div className="flex items-end gap-1.5" style={{ height: 64 }}>
              {positionSensitivity.map(({ pos, wt, range }) => (
                <div key={pos} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-[var(--primary)]"
                    style={{ height: `${Math.max(4, range * 56)}px`, opacity: 0.85 }}
                    title={`Position ${pos + 1} (${wt}): range across 20 substitutions = ${range.toFixed(3)}`}
                  />
                  <span className="instrument-label text-[9px]">{pos + 1}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Bar height = the spread between this scan's highest- and lowest-scoring substitution at that position —
              a model-derived measure of positional sensitivity, not an assertion about which positions are
              biological anchor residues.{" "}
              {mostSensitive && (
                <>
                  For this pair, the model is most sensitive to substitutions at position{" "}
                  {mostSensitive.map((m) => m.pos + 1).join(" and ")}.
                </>
              )}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

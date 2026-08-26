import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadAlleleList } from "@/lib/pmhc-model";

interface AlleleSelectProps {
  value: string;
  onChange: (allele: string) => void;
  testId?: string;
}

/**
 * Picker for the alleles the model was actually trained on.
 *
 * Every scoring surface in the app uses this. Batch and mutation analysis used
 * to omit an allele entirely and fall back to HLA-A*02:01 without saying so,
 * which quietly produced results for an allele the user never chose.
 *
 * Backed by the ~12 KB allele table, not the ~2.6 MB model, so mounting this
 * does not pull down the tree ensemble.
 */
export default function AlleleSelect({ value, onChange, testId }: AlleleSelectProps) {
  const [alleles, setAlleles] = useState<{ allele: string; support?: { n: number } }[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadAlleleList()
      .then((list) => { if (active) setAlleles(list); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testId ?? "select-allele"}>
        <SelectValue placeholder={failed ? "Allele list unavailable" : "Loading alleles..."} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {alleles.map(({ allele, support }) => (
          <SelectItem key={allele} value={allele}>
            {allele}
            {support ? ` (n=${support.n.toLocaleString()})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

import fs from "node:fs";
import path from "node:path";

export type LabelMap = Record<string, string>;

export function loadTaxonomy(repoRoot: string): string[] {
  const p = path.join(repoRoot, "mapping", "taxonomy.json");
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw);
}

export function loadLabelMap(repoRoot: string): LabelMap {
  const p = path.join(repoRoot, "mapping", "label_map.csv");
  const raw = fs.readFileSync(p, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const out: LabelMap = {};
  for (let i = 1; i < lines.length; i++) {
    const [label, cat] = lines[i].split(",");
    if (!label || !cat) continue;
    out[label.trim().toLowerCase()] = cat.trim();
  }
  return out;
}

export function mapRawLabel(label: string, labelMap: LabelMap): string | undefined {
  return labelMap[label.trim().toLowerCase()];
}



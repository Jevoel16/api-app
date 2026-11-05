import type { Site } from "@/lib/types";

type Props = { sites: Site[]; value: string; onChange: (site: string) => void };

export default function SiteSelect({ sites, value, onChange }: Props) {
  return (
    <select aria-label="Site" value={value} onChange={(e) => onChange(e.target.value)} className="p-2 border rounded font-medium mb-2">
      {sites.map(({ site }) => (
        <option key={site} value={site}>
          {site}
        </option>
      ))}
    </select>
  );
}

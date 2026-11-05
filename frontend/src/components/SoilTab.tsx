import type { IntegrationResponse } from "@/lib/types";
import { Card } from "./charts/Chart";
import ClayVsWaterBalance from "./charts/ClayVsWaterBalance";
import DepthProfile from "./charts/DepthProfile";
import SpatialDistribution from "./charts/SpatialDistribution";
import TextureComposition from "./charts/TextureComposition";
import SiteSelect from "./SiteSelect";

type Props = { data: IntegrationResponse; focusSite: string; onFocusSite: (s: string) => void };

export default function SoilTab({ data, focusSite, onFocusSite }: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <TextureComposition summary={data.summary} soil={data.soil_long} />
      </Card>
      <Card>
        <SiteSelect sites={data.active_sites} value={focusSite} onChange={onFocusSite} />
        <DepthProfile soil={data.soil_long} site={focusSite} />
      </Card>
      <Card>
        <ClayVsWaterBalance summary={data.summary} />
      </Card>
      <Card>
        <SpatialDistribution summary={data.summary} />
      </Card>
    </div>
  );
}

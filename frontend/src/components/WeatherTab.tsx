import type { IntegrationResponse } from "@/lib/types";
import { Card } from "./charts/Chart";
import RainfallDistribution from "./charts/RainfallDistribution";
import TemperatureTrend from "./charts/TemperatureTrend";
import WaterBudget from "./charts/WaterBudget";
import SiteSelect from "./SiteSelect";

type Props = { data: IntegrationResponse; focusSite: string; onFocusSite: (s: string) => void };

export default function WeatherTab({ data, focusSite, onFocusSite }: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <TemperatureTrend daily={data.daily} sites={data.active_sites} />
      </Card>
      <Card>
        <SiteSelect sites={data.active_sites} value={focusSite} onChange={onFocusSite} />
        <WaterBudget daily={data.daily} site={focusSite} />
      </Card>
      <Card>
        <RainfallDistribution daily={data.daily} sites={data.active_sites} />
      </Card>
    </div>
  );
}

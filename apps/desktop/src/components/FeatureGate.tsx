import type { PosConfig } from '@vibe-pos/config-schema';
import { useConfigStore } from '../store/configStore';

interface Props {
  feature: keyof PosConfig['features'];
  children: React.ReactNode;
}

export function FeatureGate({ feature, children }: Props) {
  const enabled = useConfigStore((s) => s.config?.features[feature]);
  return enabled ? <>{children}</> : null;
}

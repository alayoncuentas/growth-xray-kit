import { Badge } from "./Badge";

export function Chip({ children }: { children: React.ReactNode }) {
  return <Badge>{children}</Badge>;
}

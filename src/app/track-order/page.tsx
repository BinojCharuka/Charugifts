import { resolveTenant } from "@/lib/tenant";
import TrackOrderClient from "./TrackOrderClient";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage() {
  const tenant = await resolveTenant();

  return (
    <TrackOrderClient
      tenant={{
        shopName: tenant.shopName,
      }}
    />
  );
}

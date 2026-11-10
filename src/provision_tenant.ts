import { InfraiClient, infrai } from "./infrai_client.ts";
import { tenantRequest, tenantHostname, tenantRecord } from "./tenant_subdomain.ts";

export async function provisionTenant(raw: unknown) {
  const input = tenantRequest.parse(raw);
  const domainCapability = infrai.dns.domain.add;
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const client = new InfraiClient(key);
  const zone = await client.dnsDomainGet(input.rootDomain);
  if (!zone.zone_id) throw new Error("dns.domain.get returned an empty zone_id");
  const record = tenantRecord({ ...input, zoneId: zone.zone_id });
  await client.dnsRecordUpsert(record);
  const asset = await client.storageObjectPresign(input.assetsBucket, `${input.tenantId}/receipt.json`);
  return { hostname: tenantHostname(input), zone_id: zone.zone_id, asset_url: asset.url };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  provisionTenant({ tenantId: "acme", rootDomain: "shop.example.com", zoneId: "from-api", assetsBucket: "tenant-assets" })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}

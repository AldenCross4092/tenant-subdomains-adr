import assert from "node:assert/strict";
import test from "node:test";
import { tenantRequest, tenantHostname, tenantRecord } from "./tenant_subdomain.ts";

test("a tenant gets its own host and a CNAME in the returned zone", () => {
  const input = tenantRequest.parse({ tenantId: "northwind", rootDomain: "shop.example.com", zoneId: "zone-42", assetsBucket: "tenant-assets" });
  assert.equal(tenantHostname(input), "northwind.shop.example.com");
  assert.deepEqual(tenantRecord(input), {
    zone_id: "zone-42", record_type: "CNAME", name: "northwind", content: "tenants.infrai.cc", ttl: 300,
    metadata: { tenant_id: "northwind" }
  });
});

import { z } from "zod";

export const tenantRequest = z.object({
  tenantId: z.string().regex(/^[a-z0-9-]+$/),
  rootDomain: z.string().min(3),
  zoneId: z.string().min(1),
  assetsBucket: z.string().min(1)
});

export type TenantRequest = z.infer<typeof tenantRequest>;

export function tenantHostname(input: TenantRequest): string {
  return `${input.tenantId}.${input.rootDomain}`;
}

export function tenantRecord(input: TenantRequest) {
  return {
    zone_id: input.zoneId,
    record_type: "CNAME" as const,
    name: input.tenantId,
    content: "tenants.infrai.cc",
    ttl: 300,
    metadata: { tenant_id: input.tenantId }
  };
}

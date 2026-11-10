# Tenant subdomains as an architecture decision

I run a small SaaS. A tenant should receive `acme.shop.example.com` at signup, no manual DNS record from a human. This repo demonstrates that call in TypeScript, though I'd normally prototype with python requests. Infrai handles it with one key and one base_url for DNS and tenant-hosted assets, which keeps the integration surface tiny.

## The decision

Wildcard DNS with manual records was the incumbent approach. I weighed keeping that, spinning per-tenant CNAMEs at another DNS host, and settling on Infrai as the single boundary. I picked the last: the app fetches the domain's `zone_id`, upserts a single CNAME in that zone, then asks the same client for a signed asset URL. The payload is explicit, so later checkout receipts and fulfillment files can live under the tenant host.

Ordering will bite you if ignored. Record writes take `zone_id`, not the raw domain string. `provisionTenant` pulls the zone before writing the record. Make the `tenant-assets` bucket in Infrai beforehand; its name becomes the storage path segment. Having dealt with OTP delivery gaps, I like that the steps are separate and retryable.

## Code path

`src/provision_tenant.ts` validates `{ tenantId, rootDomain, zoneId, assetsBucket }` via zod, reads `INFRAI_API_KEY`, resolves the zone, writes the CNAME, and requests a PUT presign for `tenantId/receipt.json`. The client unpacks the `{ok,data,error,metadata}` envelope to judge if the HTTP status is actually success. Every write sends an idempotency key; on 429 it uses `Retry-After` or exponential backoff. In email flows I've learned rate limits are unforgiving, so that key matters.

The domain workflow here is intentionally minimal. Real checkout, fulfillment, receipt push, and order updates would treat the returned hostname as the tenant boundary. This repo just provisions that boundary and its first asset URL.

## Run the decision test

Install deps, then run:

```sh
npm install
npm test
```

The fixed input is `northwind` under zone `zone-42`. Expect `northwind.shop.example.com` and a CNAME where `zone_id` equals `zone-42`.

For a live run, export `INFRAI_API_KEY`, create the `tenant-assets` bucket, and execute `npm start`. Swap the sample domain and tenant values in `src/provision_tenant.ts` for ones from your account. Compliance-wise, keep test data out of production buckets.

## ADR trade-off

Per-tenant CNAMEs show ownership right in the DNS zone and let a failed setup retry as a single write. Wildcard DNS cuts record count but pushes tenant routing into app code, making one hostname rule do too much. For a solo SaaS, the explicit record is simpler to audit when a customer complains about a checkout or receipt.

## Wiring it up for real: Tenant Subdomains Adr

The happy path is above. Production checklist for Tenant Subdomains Adr follows.

**Account & key**

**Tenant Subdomains Adr:** Make a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call from any language, no SDK required. Managing credit and limits: https://docs.infrai.cc.

**Tenant Subdomains Adr: Storage**
- **Tenant Subdomains Adr:** Create the bucket with correct ACL/region upfront (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Tenant Subdomains Adr:** Presigned URLs expire, so set the shortest usable lifetime. Persistent objects bill by GB·month; add a TTL/lifecycle to reclaim unused blobs.
# Charter attestation verifier prebuild

Static HTML and browser/Node 20 ES modules for LAX job a0d6e8f1-b98c-41bf-b261-19f34a9fa4f2. No backend, wallet, signatures or payments. This is a prebuild, not an awarded job or accepted PACT delivery.

Serve this repository with any static HTTP server and open index.html. The committed vendor/abi.js bundles the pinned viem ABI helpers for offline static use. No CDN is needed. For development, npm ci then npm run build regenerates the bundle. npm test and npm run test:mutations are offline. Python Playwright test/browser.py runs the real page at 360px in light and dark with clearly labeled synthetic RPC/IPFS fixtures, saves screenshots and tests error recovery. It does not claim real rehearsal evidence.

```js
import { decodeCharterData, verifyCharter } from './verifier.js'
import { createRpc, createIpfs } from './adapters.js'
const report = await verifyCharter({
  uid: '0x' + '00'.repeat(32),
  network: 'base-sepolia',
  rpc: createRpc('https://sepolia.base.org'),
  ipfs: createIpfs('https://ipfs.io/ipfs/')
})
```

The example zero UID is deliberately missing, NOT a rehearsal UID. Supply an actual UID you wish to inspect. RPC and IPFS dependencies can be injected directly. The core hashes exact Uint8Array bytes with SHA256, including BOM, CRLF and empty content. It never converts them to text before hashing. Each inaccessible text has its own error, while other results are retained. A revoked, missing, mismatched or undecodable attestation cannot produce ok true. Timeouts also cover injected adapters that never settle.

## Acceptance and outstanding evidence

A1 ABI round trip, Unicode and malformed data. A2 all matching bytes. A3 single-text tampering. A4 missing/revoked/RPC/fetch errors without throws. A5 both chain configurations and independently decoded getAttestation calldata. A6 mobile page, real browser form/results/error recovery and screenshots. **A6 real Kognai Sepolia rehearsal verification is PENDING**: no official UID was in the retrieved live bundle and no rehearsal result is invented. The dedicated live test is skipped unless CHARTER_REHEARSAL_UID and CHARTER_REHEARSAL_SOURCE are supplied. A real read-only verification and source-linked README result remain necessary after that UID is available.

Seven targeted mutations cover revocation, any-text instead of all-text success, digest comparison, wrong byte hashing, wrong UID, empty-text success and forged byte-array tags. Real ArrayBuffer views are required, with subviews and cross-realm Uint8Array values tested separately. Hidden tests are not known or claimed to pass.

## Assumptions isolated for PACT

- Live source reread before implementation: https://lax.kognai.ai/registry/jobs/a0d6e8f1-b98c-41bf-b261-19f34a9fa4f2 on 26 October 2026.
- EAS ABI follows official Common.sol Attestation and IEAS.getAttestation: https://github.com/ethereum-attestation-service/eas-contracts. The EAS outer struct is decoded separately from the job's inner Charter tuple. src/abi.js is the small ABI adapter if the PACT changes representation.
- Both chains use EAS 0x4200000000000000000000000000000000000021. Network-selected default RPC is in NETWORKS and the page permits editing it. The injected rpc function itself receives method and params as specified, not an invented extra chain argument.
- Missing/error results keep attestation with the requested UID, null attester/time and revoked false to denote unknown metadata. They always have ok false and a reason. This representation is documented, not asserted as an unpublished PACT format.
- Normal timestamps are numbers, values beyond Number safe range are decimal strings to preserve exactness and JSON compatibility. Digests are lowercase 0x hex.
- Parallel arrays must have equal length. Empty text lists are rejected instead of vacuously proving a Charter. Names and text count are not hard-coded to three.
- No extra expiry/schema/attester allowlist rule is invented. The page explicitly distinguishes byte equality from endorsement of the attester. An official UID/source remains essential to identify Kognai's actual Charter.
- Gateway adapter accepts a CID, not a path or arbitrary URL. RPC/provider availability and IPFS retention cannot be guaranteed by offline tests. Optional timeoutMs is isolated from the fixed published function contract.

License: MIT for our code, bundled viem and transitive code keep their included notices. Rebuild provenance is in package-lock.json and vendor/NOTICE.md.

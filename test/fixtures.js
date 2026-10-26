import { encodeAbiParameters, parseAbiParameters } from 'viem'
import { createHash } from 'node:crypto'
export const uid='0x'+'12'.repeat(32)
export const bytes=[new TextEncoder().encode('\ufeffCharter\r\nCaf\u00e9'),new Uint8Array([]),new TextEncoder().encode('Soul')]
export const data={version:'1',date:'2026-11-14',names:['charter','constitution','soul'],digests:bytes.map(b=>'0x'+createHash('sha256').update(b).digest('hex')),cids:['cid1','cid2','cid3']}
const types=parseAbiParameters('string version,string date,string[] names,bytes32[] digests,string[] cids')
export const encodeData=(d=data)=>encodeAbiParameters(types,[d.version,d.date,d.names,d.digests,d.cids])
const tuple=parseAbiParameters('(bytes32 uid,bytes32 schema,uint64 time,uint64 expirationTime,uint64 revocationTime,bytes32 refUID,address recipient,address attester,bool revocable,bytes data)')
export const attestation={uid,schema:'0x'+'34'.repeat(32),time:1794614400n,expirationTime:0n,revocationTime:0n,refUID:'0x'+'00'.repeat(32),recipient:'0x'+'00'.repeat(20),attester:'0x'+'ab'.repeat(20),revocable:true,data:encodeData()}
export const encodeAttestation=override=>encodeAbiParameters(tuple,[{...attestation,...override}])

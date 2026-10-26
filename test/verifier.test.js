import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeFunctionData,parseAbi } from 'viem'
import { readFileSync } from 'node:fs'
import { verifyCharter,decodeCharterData,EAS_ADDRESS,NETWORKS } from '../verifier.js'
import { createRpc,createIpfs } from '../adapters.js'
import { uid,bytes,data,encodeData,encodeAttestation } from './fixtures.js'
const run=(overrides={})=>verifyCharter({uid,network:'base-sepolia',rpc:async()=>encodeAttestation(),ipfs:async cid=>bytes[data.cids.indexOf(cid)],...overrides})
test('A1 decode all fields, independent arrays and lowercase digest hex',()=>{
 assert.deepEqual(decodeCharterData(encodeData()),data)
 assert.deepEqual(decodeCharterData(encodeData({...data,names:['\u0645\u064a\u062b\u0627\u0642'],digests:[data.digests[0]],cids:['bafy123']})).names,['\u0645\u064a\u062b\u0627\u0642'])
 assert.throws(()=>decodeCharterData('0x1234'))
 assert.throws(()=>decodeCharterData(encodeData({...data,cids:[]})))
})
test('A2 exact bytes including BOM, CRLF, UTF8 and empty text match',async()=>{
 const r=await run()
 assert.equal(r.ok,true)
 assert.equal(r.texts.length,3)
 assert.deepEqual(r.texts.map(t=>t.actual),data.digests)
 assert.ok(r.texts.every(t=>t.match))
 assert.equal(r.attestation.time,1794614400)
 assert.equal(r.attestation.revoked,false)
 assert.doesNotThrow(()=>JSON.stringify(r))
})
test('A3 one tampered text only mismatches and retains both digests',async()=>{
 const r=await run({ipfs:async cid=>cid==='cid1'?new TextEncoder().encode('Charter\n'):bytes[data.cids.indexOf(cid)]})
 assert.equal(r.ok,false)
 assert.equal(r.texts[0].match,false)
 assert.equal(r.texts[0].expected,data.digests[0])
 assert.notEqual(r.texts[0].actual,r.texts[0].expected)
 assert.ok(r.texts.slice(1).every(t=>t.match))
})
test('A4 unknown UID, revoked, RPC failure and bad ABI produce structured errors',async()=>{
 const zero='0x'+'00'.repeat(32)
 for(const rpc of [async()=>encodeAttestation({uid:zero}),async()=>encodeAttestation({revocationTime:1n}),async()=>{throw new Error('private details')},async()=>'0xdead']) {
  const r=await run({rpc})
  assert.equal(r.ok,false)
  assert.ok(r.reason)
  assert.ok(r.attestation)
  assert.doesNotThrow(()=>JSON.stringify(r))
 }
 assert.equal((await run({rpc:async()=>encodeAttestation({revocationTime:1n})})).attestation.revoked,true)
})
test('A4 one failed fetch does not discard other texts and never reports success',async()=>{
 const r=await run({ipfs:async cid=>{
  if(cid==='cid2') throw new Error('https://private/key')
  return bytes[data.cids.indexOf(cid)]
 }})
 assert.equal(r.ok,false)
 assert.equal(r.texts.length,3)
 assert.equal(r.texts[0].match,true)
 assert.ok(r.texts[1].error)
 assert.equal(r.texts[2].match,true)
 assert.doesNotMatch(JSON.stringify(r),/private\/key/)
})
test('A5 both network RPC adapters and exact EAS calldata',async()=>{
 for(const network of ['base','base-sepolia']) {
  let seen
  const r=await run({network,rpc:async(method,params)=>{seen={method,params}
   return encodeAttestation()}})
  assert.equal(r.ok,true)
  assert.equal(seen.method,'eth_call')
  assert.equal(seen.params[0].to,EAS_ADDRESS)
  assert.equal(seen.params[1],'latest')
  const decoded=decodeFunctionData({abi:parseAbi(['function getAttestation(bytes32 uid) view returns (bytes)']),data:seen.params[0].data})
  assert.deepEqual(decoded.args,[uid])
  const urls=[]
  await createRpc(NETWORKS[network].rpcUrl,{fetch:async(url,init)=>{urls.push(url)
   assert.deepEqual(JSON.parse(init.body).params,seen.params)
   return Response.json({result:encodeAttestation()})}})('eth_call',seen.params)
  assert.equal(urls[0],NETWORKS[network].rpcUrl+'/')
 }
 assert.equal(NETWORKS.base.chainId,8453)
 assert.equal(NETWORKS['base-sepolia'].chainId,84532)
})
test('A6 static mobile page has labels, no wallet dependency and pending live evidence',()=>{
 const html=readFileSync('index.html','utf8')
 assert.match(html,/name="viewport"/)
 assert.match(html,/publication of its UID/)
 assert.doesNotMatch(html,/window.ethereum|walletconnect/i)
 for(const id of ['network','uid','rpc','gateway']) assert.ok(html.includes(`for="${id}"`))
})
test('A6 official Sepolia rehearsal verification', {skip:!process.env.CHARTER_REHEARSAL_UID},async()=>{
 assert.ok(process.env.CHARTER_REHEARSAL_SOURCE,'Actual published UID source is required')
 const r=await verifyCharter({uid:process.env.CHARTER_REHEARSAL_UID,network:'base-sepolia',rpc:createRpc(NETWORKS['base-sepolia'].rpcUrl),ipfs:createIpfs('https://ipfs.io/ipfs/')})
 assert.equal(r.ok,true)
})
test('Invalid input, wrong UID, empty arrays and uncooperative dependencies fail safely',async()=>{
 for(const overrides of [{uid:'bad'},{network:'__proto__'},{rpc:null},{timeoutMs:0},{rpc:async()=>encodeAttestation({uid:'0x'+'56'.repeat(32)})},{rpc:async()=>encodeAttestation({data:encodeData({...data,names:[],digests:[],cids:[]})})}]) assert.equal((await run(overrides)).ok,false)
 assert.equal((await run({rpc:()=>new Promise(()=>{}),timeoutMs:5})).ok,false)
 const r=await run({ipfs:()=>new Promise(()=>{}),timeoutMs:5})
 assert.equal(r.ok,false)
 assert.ok(r.texts.every(t=>t.error))
})
test('IPFS adapter fetches raw bytes and blocks path or URL injection',async()=>{
 let target
 const ipfs=createIpfs('https://example.com/ipfs/',{fetch:async url=>{target=url
  return new Response(bytes[0])}})
 assert.deepEqual(await ipfs('cid1'),bytes[0])
 assert.equal(target,'https://example.com/ipfs/cid1')
 for(const cid of ['../secret','https://evil.example','cid/path']) await assert.rejects(ipfs(cid))
})

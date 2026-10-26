import { decodeCharterData, getAttestationCall, decodeAttestation } from './vendor/abi.js'
export { decodeCharterData }
export const EAS_ADDRESS='0x4200000000000000000000000000000000000021'
export const NETWORKS=Object.freeze({base:{chainId:8453,rpcUrl:'https://mainnet.base.org'},'base-sepolia':{chainId:84532,rpcUrl:'https://sepolia.base.org'}})
const zero='0x'+'00'.repeat(32)
async function deadline(operation,ms) {
 let timer
 try {
  return await Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Request timed out')),ms)})])
 } finally {clearTimeout(timer)}
}
export async function verifyCharter({uid,network,rpc,ipfs,timeoutMs=15000}={}) {
 const result={ok:false,attestation:{uid:typeof uid==='string'?uid:null,attester:null,time:null,revoked:false},texts:[]}
 const fail=reason=>({...result,reason})
 if(typeof uid!=='string' || !/^0x[0-9a-fA-F]{64}$/.test(uid)) return fail('UID must be 0x followed by 64 hex characters')
 if(!Object.hasOwn(NETWORKS,network)) return fail('Unsupported network')
 if(typeof rpc!=='function' || typeof ipfs!=='function') return fail('RPC and IPFS adapters are required')
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>2147483647) return fail('Invalid timeout')
 try {
  const encoded=await deadline(()=>rpc('eth_call',[{to:EAS_ADDRESS,data:getAttestationCall(uid)},'latest']),timeoutMs)
  const att=decodeAttestation(encoded)
  if(att.uid===zero) return fail('Attestation not found')
  if(att.uid.toLowerCase()!==uid.toLowerCase()) return fail('Returned attestation UID does not match')
  result.attestation={uid:att.uid,attester:att.attester,time:att.time<=BigInt(Number.MAX_SAFE_INTEGER)?Number(att.time):att.time.toString(),revoked:att.revocationTime!==0n}
  if(result.attestation.revoked) return fail('Attestation is revoked')
  const data=decodeCharterData(att.data)
  if(data.names.length===0) return fail('Attestation contains no texts')
  result.texts=await Promise.all(data.names.map(async(name,index)=>{
   const cid=data.cids[index],expected=data.digests[index]
   const row={name,cid,expected,actual:null,match:false}
   try {
    const bytes=await deadline(()=>ipfs(cid),timeoutMs)
    if(Object.prototype.toString.call(bytes)!=='[object Uint8Array]') throw new Error('Expected bytes')
    const digest=await globalThis.crypto.subtle.digest('SHA-256',new Uint8Array(bytes))
    const actual='0x'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
    return {...row,actual,match:actual===expected}
   } catch {return {...row,error:'Text could not be fetched or hashed'}}
  }))
  result.ok=result.texts.every(text=>text.match)
  return result.ok?result:{...result,reason:'One or more texts could not be verified'}
 } catch {return fail('Attestation could not be read or decoded')}
}

export function createRpc(rpcUrl,{fetch:fetcher=globalThis.fetch,timeoutMs=15000}={}) {
 const url=new URL(rpcUrl)
 if(!['https:','http:'].includes(url.protocol)) throw new Error('RPC must be an HTTP URL')
 return async(method,params)=>{
  const r=await fetcher(url.href,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(timeoutMs)})
  if(!r.ok) throw new Error('RPC HTTP error')
  const data=await r.json()
  if(data.error || typeof data.result!=='string') throw new Error('RPC returned an error')
  return data.result
 }
}
export function createIpfs(gateway,{fetch:fetcher=globalThis.fetch,timeoutMs=15000}={}) {
 const base=new URL(gateway.endsWith('/')?gateway:gateway+'/')
 if(!['https:','http:'].includes(base.protocol)) throw new Error('Gateway must be an HTTP URL')
 return async(cid)=>{
  if(typeof cid!=='string' || !/^[A-Za-z0-9]+$/.test(cid)) throw new Error('Invalid CID')
  const r=await fetcher(new URL(cid,base).href,{signal:AbortSignal.timeout(timeoutMs)})
  if(!r.ok) throw new Error('IPFS HTTP error')
  return new Uint8Array(await r.arrayBuffer())
 }
}

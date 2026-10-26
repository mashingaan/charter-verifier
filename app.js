import { verifyCharter, NETWORKS } from './verifier.js'
import { createRpc, createIpfs } from './adapters.js'
const form=document.getElementById('verify-form')
const network=document.getElementById('network')
const rpc=document.getElementById('rpc')
const status=document.getElementById('status')
const result=document.getElementById('result')
const button=document.getElementById('verify')
network.addEventListener('change',()=>{rpc.value=NETWORKS[network.value].rpcUrl})
function render(data) {
 result.replaceChildren()
 const meta=document.createElement('p')
 meta.textContent=`UID: ${data.attestation.uid}. Attester: ${data.attestation.attester??'unknown'}. Time: ${data.attestation.time??'unknown'}. Revoked: ${data.attestation.revoked?'yes':'no'}.`
 result.append(meta)
 for(const row of data.texts) {
  const article=document.createElement('article')
  const title=document.createElement('h2')
  title.textContent=`${row.name}: ${row.match?'Match':row.error?'Unavailable':'Mismatch'}`
  const list=document.createElement('dl')
  for(const [label,value] of [['CID',row.cid],['Expected SHA256',row.expected],['Actual SHA256',row.actual??'unavailable']]) {
   const dt=document.createElement('dt'),dd=document.createElement('dd')
   dt.textContent=label
   dd.textContent=value
   list.append(dt,dd)
  }
  article.append(title,list)
  result.append(article)
 }
}
form.addEventListener('submit',async(event)=>{
 event.preventDefault()
 button.disabled=true
 result.replaceChildren()
 status.textContent='Reading the attestation and IPFS bytes...'
 try {
  const data=await verifyCharter({uid:document.getElementById('uid').value.trim(),network:network.value,rpc:createRpc(rpc.value),ipfs:createIpfs(document.getElementById('gateway').value)})
  render(data)
  status.textContent=data.ok?'All texts match the attestation.':data.reason
 } catch {status.textContent='Could not verify. Check the UID, network and read-only endpoints.'}
 finally {button.disabled=false}
})

import { readFileSync,writeFileSync,copyFileSync,mkdtempSync,rmSync,cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join,resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
const source=readFileSync('verifier.js','utf8')
const mutants=[['ignore revoked','att.revocationTime!==0n','false'],['partial success','result.texts.every(text=>text.match)','result.texts.some(text=>text.match)'],['wrong digest comparison','actual===expected','actual!==expected'],['wrong byte hash',"digest('SHA-256',new Uint8Array(bytes))","digest('SHA-256',new Uint8Array([]))"],['wrong UID accepted','att.uid.toLowerCase()!==uid.toLowerCase()','false'],['vacuous empty success','data.names.length===0','false'],['forged bytes accepted','!ArrayBuffer.isView(bytes)','false']]
for(const [name,from,to] of mutants) {
 if(!source.includes(from)) throw new Error('Mutation target missing')
 const dir=mkdtempSync(join(tmpdir(),'charter-mutant-'))
 try {
  writeFileSync(join(dir,'package.json'),JSON.stringify({type:'module'}))
  cpSync('vendor',join(dir,'vendor'),{recursive:true})
  writeFileSync(join(dir,'verifier.mjs'),source.replace(from,to))
  const check=`import {verifyCharter} from ${JSON.stringify(new URL('file:///'+resolve(dir,'verifier.mjs').replaceAll('\\','/')).href)}\nimport {uid,bytes,data,encodeAttestation,encodeData} from ${JSON.stringify(new URL('./fixtures.js',import.meta.url).href)}\nconst good={uid,network:'base',rpc:async()=>encodeAttestation(),ipfs:async cid=>bytes[data.cids.indexOf(cid)]}\nconst cases=[[{},true],[{rpc:async()=>encodeAttestation({revocationTime:1n})},false],[{rpc:async()=>encodeAttestation({uid:'0x'+'56'.repeat(32)})},false],[{ipfs:async cid=>cid==='cid1'?new Uint8Array([1]):bytes[data.cids.indexOf(cid)]},false],[{rpc:async()=>encodeAttestation({data:encodeData({...data,names:[],digests:[],cids:[]})})},false],[{rpc:async()=>encodeAttestation({data:encodeData({...data,names:['empty'],digests:[data.digests[1]],cids:['empty']})}),ipfs:async()=>({length:0,[Symbol.toStringTag]:'Uint8Array'})},false]]\nfor(const [override,expected] of cases){const r=await verifyCharter({...good,...override})\nif(r.ok!==expected)process.exit(1)}\n`
  writeFileSync(join(dir,'check.mjs'),check)
  const r=spawnSync(process.execPath,[join(dir,'check.mjs')],{encoding:'utf8',timeout:10000})
  if(r.status===0||r.error||r.stderr) throw new Error(`Mutation survived or failed to execute: ${name} ${r.stderr}`)
  console.log(`Caught: ${name}`)
 } finally {rmSync(dir,{recursive:true,force:true})}
}

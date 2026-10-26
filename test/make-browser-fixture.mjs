import { writeFileSync } from 'node:fs'
import { uid,bytes,encodeAttestation } from './fixtures.js'
writeFileSync('test/browser-fixture.json',JSON.stringify({synthetic:true,uid,rpc:encodeAttestation(),texts:bytes.map(b=>Buffer.from(b).toString('base64'))},null,2)+'\n')

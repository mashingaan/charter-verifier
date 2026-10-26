import { decodeAbiParameters, decodeFunctionResult, encodeFunctionData, parseAbi, parseAbiParameters } from 'viem'
const charterTypes=parseAbiParameters('string version,string date,string[] names,bytes32[] digests,string[] cids')
const eas=parseAbi(['function getAttestation(bytes32 uid) view returns ((bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))'])
export function decodeCharterData(dataHex) {
 const [version,date,names,digests,cids]=decodeAbiParameters(charterTypes,dataHex)
 if(names.length!==digests.length || names.length!==cids.length) throw new Error('Charter arrays must have equal length')
 return {version,date,names:[...names],digests:digests.map(s=>s.toLowerCase()),cids:[...cids]}
}
export const getAttestationCall=uid=>encodeFunctionData({abi:eas,functionName:'getAttestation',args:[uid]})
export const decodeAttestation=data=>decodeFunctionResult({abi:eas,functionName:'getAttestation',data})

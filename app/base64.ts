// Review snapshots may be larger than the JS function-argument limit.
export function encodeBase64(bytes:Uint8Array){
 let binary='';
 for(let offset=0;offset<bytes.length;offset+=32768){
  binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));
 }
 return btoa(binary);
}

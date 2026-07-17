function writeString(view, offset, text) { for (let i=0;i<text.length;i+=1) view.setUint8(offset+i,text.charCodeAt(i)); }
export function audioBufferToWavBlob(buffer) {
  const channels=buffer.numberOfChannels, length=buffer.length*channels*2, arrayBuffer=new ArrayBuffer(44+length), view=new DataView(arrayBuffer);
  writeString(view,0,"RIFF"); view.setUint32(4,36+length,true); writeString(view,8,"WAVE"); writeString(view,12,"fmt ");
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,channels,true); view.setUint32(24,buffer.sampleRate,true);
  view.setUint32(28,buffer.sampleRate*channels*2,true); view.setUint16(32,channels*2,true); view.setUint16(34,16,true); writeString(view,36,"data"); view.setUint32(40,length,true);
  const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i)); let offset=44;
  for(let i=0;i<buffer.length;i+=1){ for(let c=0;c<channels;c+=1){ const sample=Math.max(-1,Math.min(1,data[c][i])); view.setInt16(offset,sample<0?sample*0x8000:sample*0x7fff,true); offset+=2; }}
  return new Blob([view],{type:"audio/wav"});
}
export function downloadBlob(blob, filename) { const url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }

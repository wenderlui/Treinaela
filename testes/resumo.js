const fs=require('fs');const out=[];
function w(s,file){
  (s.suites||[]).forEach(x=>w(x,file||x.file));
  for(const sp of (s.specs||[]))for(const tt of sp.tests){
    const res=tt.results[tt.results.length-1]||{};
    out.push({file:(file||'').replace('tests/',''),title:sp.title,proj:tt.projectName,status:tt.status,ms:res.duration,
      err:((res.error&&res.error.message)||'').replace(/\x1b\[[0-9;]*m/g,'').split('\n').slice(0,14).join('\n'),
      ann:(tt.annotations||[]).map(a=>a.type+': '+a.description).join('; ')});
  }
}
for(const f of ['resultado.json','resultado-perf.json'])if(fs.existsSync(f))w(JSON.parse(fs.readFileSync(f)),'');
const bad=out.filter(o=>o.status!=='expected');
console.log('TOTAL',out.length,'PASSOU',out.length-bad.length,'FALHOU',bad.length);
const por={};out.forEach(o=>{por[o.file]=por[o.file]||[0,0];por[o.file][0]++;if(o.status==='expected')por[o.file][1]++});console.log(por);
out.filter(o=>o.ann).forEach(o=>console.log('ANN',o.title,'|',o.ann));
bad.forEach(b=>console.log('---',b.proj,b.file,b.title,'\n',b.err));
fs.writeFileSync('resumo.json',JSON.stringify(out));

const fs=require('fs');
const rs=JSON.parse(fs.readFileSync('data/reports-4471.json','utf8'));
const notes=JSON.parse(fs.readFileSync('data/desk-notes.json')).oneDayMove;
for(const r of rs.filter(r=>notes.includes(r.id)))console.log(r.id,r.tenant,r.channel,r.meta.browserLocale,r.meta.intakeTag,'|',r.subject,'|',r.body);
const dup=rs.length-new Set(rs.map(r=>r.id)).size;console.log('dups',dup);
const seen={};for(const r of rs){if(seen[r.id]&&JSON.stringify(seen[r.id])!==JSON.stringify(r))console.log('differs',r.id);seen[r.id]=r}
console.log('--- distinct bodies by tenant sample');
const by={};for(const r of rs){(by[r.tenant+'/'+r.channel]??=[]).push(r)}
for(const k in by)console.log(k,by[k].length,'|',by[k][0].body.slice(0,110));

const fs=require('fs');
const rs=JSON.parse(fs.readFileSync('data/reports-4471.json','utf8'));
const ts={};for(const f of fs.readdirSync('data/tenants')){const t=JSON.parse(fs.readFileSync('data/tenants/'+f));ts[t.handle]=t}
const notes=JSON.parse(fs.readFileSync('data/desk-notes.json')).oneDayMove;
const dayFirst=l=>{const o=new Intl.DateTimeFormat(l,{year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(Date.UTC(2026,0,2,12))).map(p=>p.type);return o.indexOf('day')<o.indexOf('month')};
const hint={'booking-v2':'DD/MM/YYYY','booking-v3':'MM/DD/YYYY'};
const cause=(r)=>{const t=ts[r.tenant];if(!t||!dayFirst(t.locale))return null;return r.channel==='form'&&hint[t.form].startsWith('MM')?'hint':'parser'};
console.log('raw',rs.length);
const u=[...new Map(rs.map(r=>[r.id,r])).values()];console.log('unique',u.length);
console.log('mergedInto',[...new Set(u.map(r=>r.mergedInto))]);
const m=u.filter(r=>r.mergedInto===4471);console.log('merged',m.length);
const g={};for(const r of m){const c=cause(r)??'unplaced';(g[c]??=[]).push(r)}
for(const [c,a] of Object.entries(g)){const tags={};a.forEach(r=>tags[r.meta.intakeTag]=(tags[r.meta.intakeTag]||0)+1);
console.log(c,a.length,JSON.stringify(tags),'tenants',[...new Set(a.map(r=>r.tenant))].join(','),a.map(r=>r.receivedAt.slice(0,10)).sort()[0],a.map(r=>r.receivedAt.slice(0,10)).sort().pop(),'oneDay',a.filter(r=>notes.includes(r.id)).length,'channels',JSON.stringify(a.reduce((n,r)=>(n[r.channel]=(n[r.channel]||0)+1,n),{})))}
console.log([...new Set(m.map(r=>r.tenant))].filter(t=>!ts[t]));

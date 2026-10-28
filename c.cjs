const fs=require('fs');
const rs=[...new Map(JSON.parse(fs.readFileSync('data/reports-4471.json','utf8')).map(r=>[r.id,r])).values()];
const norm=b=>b.replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g,'DOW').replace(/\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)\b/g,'D');
const c={};for(const r of rs){const k=norm(r.body);(c[k]??=[]).push(r.id)}
for(const k in c)console.log(c[k].length,k,c[k].length<8?c[k]:'');

function l(r,c){const a=c+r,i=[];let t=a,e;for(;(e=t.indexOf(`

`))>=0;){const o=t.slice(0,e);t=t.slice(e+2);const n={data:[]};for(const s of o.split(`
`))s.startsWith("event:")&&(n.event=s.slice(6).trim()),s.startsWith("data:")&&n.data.push(s.slice(5).trim());i.push(n)}return{blocks:i,carry:t}}export{l as parseSseChunk};

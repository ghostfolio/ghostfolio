export const TRACES_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agent Traces — Observability Dashboard</title>
<style>
  :root{--bg:#0b0e14;--surface:#141821;--surface2:#1c2030;--border:#262b3a;--accent:#36cfcc;--text:#e2e4e9;--text2:#8b8fa3;--success:#4ade80;--error:#ff5f5f;--font:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;padding:24px}
  h1{font-size:22px;color:var(--accent);margin-bottom:4px}
  .subtitle{font-size:13px;color:var(--text2);margin-bottom:24px}
  .back{color:var(--accent);text-decoration:none;font-size:13px;display:inline-block;margin-bottom:16px}
  .auth-row{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
  .auth-row input{flex:1;min-width:200px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px}
  .auth-row button{padding:8px 16px;background:var(--accent);color:var(--bg);border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px}

  .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:28px}
  .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center}
  .stat-card .val{font-size:24px;font-weight:700;color:var(--text);margin-bottom:4px}
  .stat-card .label{font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px}

  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;padding:10px 12px;background:var(--surface);color:var(--text2);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border)}
  td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top}
  tr:hover td{background:var(--surface2)}
  .ok{color:var(--success)}.err{color:var(--error)}
  .tools-list{display:flex;gap:4px;flex-wrap:wrap}
  .tool-tag{font-size:10px;padding:2px 8px;border-radius:10px;background:var(--surface2);color:var(--accent);border:1px solid var(--border)}
  .mono{font-family:'SF Mono',Consolas,monospace;font-size:12px}
  #msg{color:var(--text2);font-size:13px;margin:20px 0}
  .cost{color:#f0b429}
</style>
</head>
<body>
<a class="back" href="/api/v1/agent/chat">&larr; Back to Chat</a>
<h1>Agent Observability Dashboard</h1>
<p class="subtitle">Trace logging, latency tracking, token usage, and cost analysis</p>

<div class="auth-row">
  <input id="token" type="password" placeholder="Security token (admin)" />
  <button onclick="load()">Load Traces</button>
</div>

<div id="stats-area"></div>
<div id="msg"></div>
<div id="table-area"></div>

<script>
const API=window.location.origin;
let jwt=null;

async function load(){
  const token=document.getElementById('token').value.trim();
  if(!token)return;
  try{
    const r1=await fetch(API+'/api/v1/auth/anonymous',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:token})});
    const d1=await r1.json();
    if(!d1.authToken){document.getElementById('msg').textContent='Auth failed';return}
    jwt=d1.authToken;
    const r2=await fetch(API+'/api/v1/agent/traces?limit=100',{headers:{'Authorization':'Bearer '+jwt}});
    const data=await r2.json();
    renderStats(data.stats);
    renderTable(data.traces);
  }catch(e){document.getElementById('msg').textContent='Error: '+e.message}
}

function renderStats(s){
  const a=document.getElementById('stats-area');
  a.innerHTML='<div class="stats-grid">'+
    card(s.totalRequests,'Total Requests')+
    card((s.successRate*100).toFixed(1)+'%','Success Rate')+
    card(s.avgLatencyMs+'ms','Avg Latency')+
    card(s.avgTokensPerRequest,'Avg Tokens/Req')+
    card(s.totalTokens.toLocaleString(),'Total Tokens')+
    card('$'+s.estimatedTotalCostUsd.toFixed(4),'Est. Total Cost')+
    card((s.verificationPassRate*100).toFixed(0)+'%','Verification Pass')+
    card(Object.keys(s.toolUsageCount).length,'Unique Tools Used')+
  '</div>'+
  (Object.keys(s.toolUsageCount).length?'<div class="stats-grid">'+
    Object.entries(s.toolUsageCount).map(([k,v])=>card(v,k)).join('')+'</div>':'');
}

function card(v,l){return '<div class="stat-card"><div class="val">'+v+'</div><div class="label">'+l+'</div></div>'}

function renderTable(traces){
  if(!traces.length){document.getElementById('msg').textContent='No traces yet. Send some messages to the agent first.';return}
  document.getElementById('msg').textContent='';
  let html='<table><tr><th>Time</th><th>Input</th><th>Tools</th><th>Latency</th><th>Tokens</th><th>Cost</th><th>Status</th></tr>';
  for(const t of traces){
    const time=new Date(t.timestamp).toLocaleTimeString();
    const inp=(t.input||'').slice(0,60)+(t.input?.length>60?'...':'');
    const tools=t.toolCalls.map(tc=>'<span class="tool-tag">'+tc.name+(tc.success?'':' !')+'</span>').join('');
    const cls=t.success?'ok':'err';
    html+='<tr><td class="mono">'+time+'</td><td>'+esc(inp)+'</td><td><div class="tools-list">'+tools+'</div></td><td class="mono">'+t.latency.totalMs+'ms</td><td class="mono">'+t.tokens.total+'</td><td class="mono cost">$'+t.estimatedCostUsd.toFixed(4)+'</td><td class="'+cls+'">'+(t.success?'OK':'FAIL')+'</td></tr>';
  }
  html+='</table>';
  document.getElementById('table-area').innerHTML=html;
}

function esc(t){return(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
</script>
</body>
</html>`;

export const CHAT_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ghostfolio Agent — AI Portfolio Assistant</title>
<style>
  :root{--bg:#0b0e14;--surface:#141821;--surface2:#1c2030;--border:#262b3a;--accent:#36cfcc;--accent-dim:#1a6e6c;--text:#e2e4e9;--text2:#8b8fa3;--user-bg:#1e3a5f;--user-text:#c8ddf5;--error:#ff5f5f;--success:#4ade80;--font:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:var(--font);background:var(--bg);color:var(--text);height:100dvh;display:flex;flex-direction:column;overflow:hidden}

  /* Header */
  header{padding:14px 24px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px;flex-shrink:0}
  .logo{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--accent),#2a9d9a);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:var(--bg)}
  header .title{font-size:17px;font-weight:700;color:var(--text)}
  header .subtitle{font-size:12px;color:var(--text2);letter-spacing:.5px;text-transform:uppercase}
  header .spacer{flex:1}
  #status-pill{font-size:11px;padding:4px 12px;border-radius:20px;display:flex;align-items:center;gap:6px}
  #status-pill .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .status-off{background:#2a1a1a;color:#ff8a8a}.status-off .dot{background:#ff5f5f}
  .status-on{background:#1a2a1a;color:#8aff8a}.status-on .dot{background:#4ade80}

  /* Auth */
  #auth-overlay{position:absolute;inset:0;background:rgba(11,14,20,.92);z-index:100;display:flex;align-items:center;justify-content:center}
  #auth-overlay.hidden{display:none}
  .auth-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:40px 36px;max-width:420px;width:90%;text-align:center}
  .auth-card h2{font-size:22px;margin-bottom:6px;color:var(--text)}
  .auth-card p{font-size:13px;color:var(--text2);margin-bottom:24px;line-height:1.5}
  .auth-card input{width:100%;padding:12px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;margin-bottom:14px;outline:none;transition:border-color .2s}
  .auth-card input:focus{border-color:var(--accent)}
  .auth-card button{width:100%;padding:12px;background:var(--accent);color:var(--bg);border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:14px;transition:opacity .2s}
  .auth-card button:hover{opacity:.9}
  .auth-card .error-msg{color:var(--error);font-size:12px;margin-top:8px;min-height:18px}

  /* Chat */
  #chat-area{flex:1;display:flex;flex-direction:column;overflow:hidden}
  #welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;gap:20px}
  #welcome h3{font-size:20px;color:var(--text)}
  #welcome p{font-size:14px;color:var(--text2);max-width:480px;text-align:center;line-height:1.6}
  .suggestions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:560px}
  .suggestions button{padding:10px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:13px;cursor:pointer;transition:all .2s;text-align:left;line-height:1.4}
  .suggestions button:hover{border-color:var(--accent);background:var(--accent-dim);color:white}

  #messages{flex:1;overflow-y:auto;padding:20px 24px;display:none;flex-direction:column;gap:14px;scroll-behavior:smooth}
  #messages.active{display:flex}

  .msg-row{display:flex;gap:10px;max-width:780px}
  .msg-row.user{align-self:flex-end;flex-direction:row-reverse}
  .msg-row.assistant{align-self:flex-start}
  .avatar{width:28px;height:28px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;margin-top:2px}
  .avatar.user-av{background:var(--user-bg);color:var(--user-text)}
  .avatar.bot-av{background:linear-gradient(135deg,var(--accent),#2a9d9a);color:var(--bg)}
  .msg-bubble{padding:12px 16px;border-radius:14px;line-height:1.65;font-size:14px;white-space:pre-wrap;word-break:break-word;position:relative}
  .msg-row.user .msg-bubble{background:var(--user-bg);color:var(--user-text);border-bottom-right-radius:4px}
  .msg-row.assistant .msg-bubble{background:var(--surface2);color:var(--text);border-bottom-left-radius:4px;border:1px solid var(--border)}
  .msg-row.system .msg-bubble{background:#2a1a1a;color:#ffaaaa;font-size:13px;align-self:center;text-align:center;max-width:500px;border-radius:10px}
  .msg-meta{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}
  .badge{font-size:10px;padding:3px 10px;border-radius:12px;font-weight:600;letter-spacing:.3px;text-transform:uppercase}
  .badge.pass{background:#132e1a;color:var(--success);border:1px solid #1a4a24}
  .badge.fail{background:#2e1313;color:var(--error);border:1px solid #4a1a1a}
  .latency{font-size:11px;color:var(--text2)}

  /* Typing indicator */
  .typing-row{display:flex;gap:10px;align-self:flex-start;align-items:flex-start}
  .typing-dots{background:var(--surface2);border:1px solid var(--border);border-radius:14px;border-bottom-left-radius:4px;padding:14px 20px;display:flex;gap:5px}
  .typing-dots span{width:7px;height:7px;border-radius:50%;background:var(--text2);animation:blink 1.4s infinite both}
  .typing-dots span:nth-child(2){animation-delay:.2s}
  .typing-dots span:nth-child(3){animation-delay:.4s}
  @keyframes blink{0%,80%,100%{opacity:.3}40%{opacity:1}}

  /* Input */
  #input-bar{padding:16px 24px;background:var(--surface);border-top:1px solid var(--border);display:flex;gap:10px;flex-shrink:0}
  #input-bar textarea{flex:1;padding:12px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;color:var(--text);font-size:14px;resize:none;height:48px;font-family:var(--font);outline:none;transition:border-color .2s}
  #input-bar textarea:focus{border-color:var(--accent)}
  #input-bar textarea::placeholder{color:var(--text2)}
  #send-btn{width:48px;height:48px;background:var(--accent);color:var(--bg);border:none;border-radius:12px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:opacity .2s;flex-shrink:0}
  #send-btn:disabled{opacity:.3;cursor:not-allowed}
  #send-btn:not(:disabled):hover{opacity:.85}

  /* Footer */
  footer{padding:8px;text-align:center;font-size:11px;color:var(--text2);background:var(--bg);flex-shrink:0}
  footer a{color:var(--accent);text-decoration:none}

  @media(max-width:640px){
    header{padding:12px 16px}
    #messages{padding:16px}
    #input-bar{padding:12px 16px}
    .suggestions{flex-direction:column;align-items:stretch}
    .msg-row{max-width:100%}
  }
</style>
</head>
<body>

<header>
  <div class="logo">G</div>
  <div>
    <div class="title">Ghostfolio Agent</div>
    <div class="subtitle">AI Portfolio Assistant</div>
  </div>
  <div class="spacer"></div>
  <div id="status-pill" class="status-off"><span class="dot"></span><span id="status-text">Disconnected</span></div>
</header>

<div id="auth-overlay">
  <div class="auth-card">
    <h2>Connect to Ghostfolio</h2>
    <p>Enter your security token to start chatting with your AI portfolio assistant.</p>
    <input id="token-input" type="password" placeholder="Security token" onkeydown="if(event.key==='Enter')authenticate()" autofocus />
    <button onclick="authenticate()">Connect</button>
    <div id="auth-error" class="error-msg"></div>
  </div>
</div>

<div id="chat-area">
  <div id="welcome">
    <h3>What would you like to know?</h3>
    <p>I can analyze your portfolio, check performance, look up market quotes, review your transactions, and assess risk.</p>
    <div class="suggestions">
      <button onclick="askSuggestion(this)">What is my portfolio allocation?</button>
      <button onclick="askSuggestion(this)">How did my portfolio perform this year?</button>
      <button onclick="askSuggestion(this)">Show my last 5 transactions</button>
      <button onclick="askSuggestion(this)">What is the current price of AAPL?</button>
      <button onclick="askSuggestion(this)">Give me a risk report for my portfolio</button>
    </div>
  </div>
  <div id="messages"></div>
</div>

<div id="input-bar">
  <textarea id="msg-input" placeholder="Ask about your portfolio..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send()}" disabled></textarea>
  <button id="send-btn" onclick="send()" disabled>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  </button>
</div>

<footer>AgentForge &middot; Built on <a href="https://ghostfol.io" target="_blank">Ghostfolio</a> &middot; Finance Domain Agent</footer>

<script>
const API_BASE=window.location.origin;
let jwt=null;
const history=[];
const msgEl=document.getElementById('messages');
const welcomeEl=document.getElementById('welcome');

async function authenticate(){
  const token=document.getElementById('token-input').value.trim();
  const errEl=document.getElementById('auth-error');
  if(!token){errEl.textContent='Please enter a token.';return}
  errEl.textContent='Connecting...';
  try{
    const res=await fetch(API_BASE+'/api/v1/auth/anonymous',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:token})});
    const data=await res.json();
    if(data.authToken){
      jwt=data.authToken;
      document.getElementById('auth-overlay').classList.add('hidden');
      document.getElementById('status-pill').className='status-on';
      document.getElementById('status-text').textContent='Connected';
      document.getElementById('msg-input').disabled=false;
      document.getElementById('send-btn').disabled=false;
      document.getElementById('msg-input').focus();
    }else{errEl.textContent='Invalid token. Please try again.'}
  }catch(e){errEl.textContent='Connection failed: '+e.message}
}

function askSuggestion(btn){
  document.getElementById('msg-input').value=btn.textContent;
  send();
}

function esc(t){return(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>')}

function addMsg(role,content,verification,latencyMs){
  welcomeEl.style.display='none';
  msgEl.classList.add('active');
  const row=document.createElement('div');
  row.className='msg-row '+role;
  const avClass=role==='user'?'user-av':'bot-av';
  const avLetter=role==='user'?'Y':'G';
  let metaHtml='';
  if(verification||latencyMs){
    metaHtml='<div class="msg-meta">';
    if(verification){
      const cls=verification.passed?'pass':'fail';
      const label=verification.passed?'Verified':'Unverified';
      metaHtml+='<span class="badge '+cls+'">'+label+'</span>';
    }
    if(latencyMs){metaHtml+='<span class="latency">'+latencyMs+'ms</span>'}
    metaHtml+='</div>';
  }
  row.innerHTML=role!=='system'
    ?'<div class="avatar '+avClass+'">'+avLetter+'</div><div class="msg-bubble">'+esc(content)+metaHtml+'</div>'
    :'<div class="msg-bubble">'+esc(content)+'</div>';
  msgEl.appendChild(row);
  msgEl.scrollTop=msgEl.scrollHeight;
}

function showTyping(){
  welcomeEl.style.display='none';
  msgEl.classList.add('active');
  const row=document.createElement('div');
  row.className='typing-row';
  row.id='typing';
  row.innerHTML='<div class="avatar bot-av">G</div><div class="typing-dots"><span></span><span></span><span></span></div>';
  msgEl.appendChild(row);
  msgEl.scrollTop=msgEl.scrollHeight;
}

function removeTyping(){const el=document.getElementById('typing');if(el)el.remove()}

async function send(){
  const input=document.getElementById('msg-input');
  const text=input.value.trim();
  if(!text||!jwt)return;
  input.value='';
  input.style.height='48px';
  history.push({role:'user',content:text});
  addMsg('user',text);
  showTyping();
  document.getElementById('send-btn').disabled=true;
  const t0=Date.now();
  try{
    const res=await fetch(API_BASE+'/api/v1/agent/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwt},
      body:JSON.stringify({messages:history})
    });
    const latency=Date.now()-t0;
    const data=await res.json();
    removeTyping();
    if(res.status===401){addMsg('system','Session expired. Please refresh and reconnect.');return}
    const reply=data.message?.content||data.error||'No response';
    history.push({role:'assistant',content:reply});
    addMsg('assistant',reply,data.verification,latency);
  }catch(e){removeTyping();addMsg('system','Error: '+e.message)}
  document.getElementById('send-btn').disabled=false;
  input.focus();
}

document.getElementById('msg-input').addEventListener('input',function(){
  this.style.height='48px';
  this.style.height=Math.min(this.scrollHeight,120)+'px';
});
</script>
</body>
</html>`;

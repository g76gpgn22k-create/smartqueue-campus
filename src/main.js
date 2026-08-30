import { supabase } from './supabase.js'
import './style.css'

document.querySelector('#app').innerHTML = `
<div class="shell">
<header><div class="brand"><span>Q</span><b>SmartQueue Campus</b></div><div class="auth"><button id="login">Sign in</button><button class="primary" id="demo">Demo mode</button></div></header>
<main>
<section class="hero"><div><small>CAMPUS SERVICE CENTER</small><h1>Skip the line. <em>Queue smart.</em></h1><p>Join Registrar, Clinic, Cashier, or ICT queues from your phone and track your estimated wait in real time.</p></div><div class="hero-card"><b>LIVE QUEUE STATUS</b><div id="liveCount">Loading…</div><small>Real-time connection</small></div></section>
<section><div class="section-head"><h2>Choose an office</h2><select id="sort"><option value="wait">Shortest wait</option><option value="queue">Shortest queue</option></select></div><div id="offices" class="grid"></div></section>
<section class="panel"><div class="section-head"><div><h2>How it works</h2><p>Everything you need before reaching the counter.</p></div></div><div class="steps"><div><b>01</b><strong>Pick a service</strong><span>Select the exact transaction.</span></div><div><b>02</b><strong>Check requirements</strong><span>Confirm documents before joining.</span></div><div><b>03</b><strong>Track your ticket</strong><span>Get live position and ETA.</span></div><div><b>04</b><strong>Get served</strong><span>Rate the experience afterward.</span></div></div></section>
</main>
<nav><button class="active">⌂<span>Home</span></button><button id="myQueue">🎟<span>My Queue</span></button><button id="staff">▣<span>Staff</span></button><button id="analytics">◫<span>Analytics</span></button></nav>
</div>
<div id="modal" class="modal"></div>
<div id="toast" class="toast"></div>
`

let offices=[]
async function load(){
 const {data,error}=await supabase.from('offices').select('*')
 if(error){demoData();return}
 offices=data||[]; render()
 const {data:q}=await supabase.from('queue_tickets').select('id').in('status',['waiting','called','serving'])
 document.querySelector('#liveCount').textContent=`${q?.length||0} clients currently queued`
 supabase.channel('queue-live').on('postgres_changes',{event:'*',schema:'public',table:'queue_tickets'},()=>load()).subscribe()
}
function demoData(){
 offices=[
 {id:'registrar',name:'Registrar',icon:'📚',status:'open',active_counters:3,queue:18,wait:22},
 {id:'clinic',name:'Clinic',icon:'🩺',status:'open',active_counters:2,queue:5,wait:10},
 {id:'cashier',name:'Cashier',icon:'💳',status:'high_volume',active_counters:4,queue:12,wait:27},
 {id:'ict',name:'ICT',icon:'💻',status:'open',active_counters:2,queue:7,wait:15}
 ];document.querySelector('#liveCount').textContent='42 clients currently queued';render()
}
function render(){
 const sort=document.querySelector('#sort').value
 let list=[...offices].sort((a,b)=>(sort==='wait'?(a.wait??20)-(b.wait??20):(a.queue??10)-(b.queue??10)))
 document.querySelector('#offices').innerHTML=list.map(o=>`<article class="card"><div class="top"><div><div class="office">${o.icon||'🏢'}</div><h3>${o.name}</h3><span class="badge ${o.status==='high_volume'?'amber':'green'}">${o.status==='high_volume'?'● High Volume':'● Open'}</span></div><div class="live">LIVE</div></div><div class="metrics"><div><strong>${o.queue??'—'}</strong><span>in queue</span></div><div><strong>${o.wait??'—'}<small> min</small></strong><span>estimated wait</span></div></div><div class="foot">🪟 ${o.active_counters} active windows</div><button class="join" data-id="${o.id}">View & join queue →</button></article>`).join('')
 document.querySelectorAll('.join').forEach(b=>b.onclick=()=>openQueue(b.dataset.id))
}
document.querySelector('#sort').onchange=render
async function openQueue(id){
 const office=offices.find(o=>o.id===id)
 document.querySelector('#modal').innerHTML=`<div class="dialog"><div class="dialog-head"><div><small>PRE-QUEUE CHECK</small><h2>${office.name}</h2></div><button onclick="closeModal()">×</button></div><label>Transaction</label><select id="transaction"></select><div id="req"><div class="req">☐ Valid school ID</div><div class="req">☐ Completed request form</div><div class="req">☐ Required fee ready</div></div><label class="priority"><input type="checkbox" id="priority"> Request Priority service <small>PWD · Pregnant · Senior Citizen · Urgent/Medical</small></label><button id="join" class="primary wide">Join Queue</button><p class="hint">Demo mode works without an account. Connect Supabase to save real tickets.</p></div>`
 document.querySelector('#modal').classList.add('show')
 const {data}=await supabase.from('transactions').select('*').eq('office_id',id)
 const tx=data?.length?data:[{id:'demo',name:'General transaction',avg_minutes:10}]
 document.querySelector('#transaction').innerHTML=tx.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')
 document.querySelectorAll('.req').forEach(x=>x.onclick=()=>x.classList.toggle('checked'))
 document.querySelector('#join').onclick=()=>join(id,document.querySelector('#transaction').value,document.querySelector('#priority').checked)
}
window.closeModal=()=>document.querySelector('#modal').classList.remove('show')
async function join(officeId,txId,priority){
 const {data:{user}}=await supabase.auth.getUser()
 if(!user){notify('Demo ticket created: REG-042');closeModal();return}
 const {data,error}=await supabase.from('queue_tickets').insert({user_id:user.id,office_id:officeId,transaction_id:txId,position:1,ticket_no:'SQ-'+Math.floor(100+Math.random()*899),priority_type:priority?'Priority':null,checklist_acknowledged:true}).select().single()
 if(error)notify(error.message);else notify(`Ticket ${data.ticket_no} created`);closeModal()
}
document.querySelector('#login').onclick=async()=>{const email=prompt('Enter your email');if(!email)return;const {error}=await supabase.auth.signInWithOtp({email});notify(error?error.message:'Check your email for the sign-in link.')}
document.querySelector('#demo').onclick=()=>{notify('Demo mode enabled');demoData()}
document.querySelector('#myQueue').onclick=()=>notify('Open a queue ticket from an office to see your live ticket.')
document.querySelector('#staff').onclick=()=>notify('Staff dashboard is ready for role-protected implementation.')
document.querySelector('#analytics').onclick=()=>notify('Admin analytics connects to queue history and feedback.')
function notify(t){const x=document.querySelector('#toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2800)}
load()

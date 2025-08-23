// sounds + overlay
// ------- Audio helpers -------
function getAudio(id, vol = 0.7){
  const el = document.getElementById(id);
  if (!el) return { play(){}, pause(){}, set volume(v){} };
  el.volume = vol;
  return el;
}
function playSafe(a){
  try { a.currentTime = 0; a.play?.(); } catch(e){}
}
function pauseSafe(a){
  try { a.pause?.(); } catch(e){}
}

// Grab all sounds
const sndClick  = getAudio('sndClick', 0.6);
const sndIntro  = getAudio('sndIntro', 0.7);

const sndStart  = getAudio('sndStart', 0.8);
const sndStop   = getAudio('sndStop',  0.8);
const sndEstop  = getAudio('sndEstop', 0.9);
const sndAlarm  = getAudio('sndAlarm', 0.7); // loop=true in HTML
const sndPump   = getAudio('sndPump',  0.45); // loop=true in HTML

// Unlock audio on first user gesture (Chrome/SAF policies)

let audioArmed = false;
function armAudio(){
  if (audioArmed) return;
  audioArmed = true;
  // try a quiet play/pause to unlock
  [sndClick, sndIntro, sndStart, sndStop, sndEstop, sndAlarm, sndPump].forEach(a=>{
    try { a.muted = true; a.play().then(()=>{ a.pause(); a.muted = false; }).catch(()=>{}); } catch(e){}
  });
  window.removeEventListener('pointerdown', armAudio);
  window.removeEventListener('keydown', armAudio);
}
window.addEventListener('pointerdown', armAudio, { once:false });
window.addEventListener('keydown', armAudio, { once:false });


const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');


startBtn.addEventListener('click', () => {
  // reset sounds
  [sndClick, sndIntro].forEach(a => {
    a.currentTime = 0;
    a.volume = 0; // start muted for fade-in
  });

  // play intro sound
  sndIntro.play().catch(()=>{});

  // AUDIO fade-in over 2s
  let vol = 0;
  const fadeDuration = 2000; // 2 seconds
  const step = 50; // update every 50ms
  const stepSize = 0.7 / (fadeDuration / step); // reach 0.7 in 2s

  const fade = setInterval(() => {
    vol += stepSize;
    if (vol >= 0.7) {
      vol = 0.7;
      clearInterval(fade);
    }
    sndIntro.volume = vol;
  }, step);

  // VISUAL fade-out over 2s
  startOverlay.style.transition = 'opacity 4s ease';
  startOverlay.style.opacity = '0';

  // after fade completes → remove overlay & scroll
  setTimeout(() => {
    startOverlay.style.display = 'none';

    // scroll to quote, then showcase
    document.getElementById('quote').scrollIntoView({behavior:'smooth'});
    setTimeout(() => {
      document.getElementById('showcase').scrollIntoView({behavior:'smooth'});
    }, 1200);

  }, fadeDuration); // matches audio fade
});


// open project buttons
document.querySelectorAll('[data-open]').forEach(btn=>btn.addEventListener('click',()=>{
  const which = btn.getAttribute('data-open');
  openProject(which);
}));
document.getElementById('btnBack').addEventListener('click', ()=>{
  document.getElementById('project').classList.add('hidden');
  document.getElementById('viewHVAC').classList.add('hidden');
  document.getElementById('viewPLC').classList.add('hidden');
  document.getElementById('showcase').scrollIntoView({behavior:'smooth'});
});
function openProject(which){
  const proj = document.getElementById('project');
  const title = document.getElementById('projTitle');
  document.getElementById('viewHVAC').classList.add('hidden');
  document.getElementById('viewPLC').classList.add('hidden');
  if(which==='hvac'){ title.textContent='HVAC AI – Prediction + Control'; document.getElementById('viewHVAC').classList.remove('hidden'); }
  if(which==='plc'){ title.textContent='PLC Demo – Start/Stop/Auto'; document.getElementById('viewPLC').classList.remove('hidden'); }
  proj.classList.remove('hidden');
  proj.scrollIntoView({behavior:'smooth'});
  sndClick.play().catch(()=>{});
}
/*
// HVAC logic and chart
let AUTO=true, estop=false, HEAT=false, COOL=false;
const sp = document.getElementById('sp'); const band = document.getElementById('band');
const spVal=document.getElementById('spVal'); const bandVal=document.getElementById('bandVal');
const stHeat=document.getElementById('stHeat'); const stCool=document.getElementById('stCool');
const stAuto=document.getElementById('stAuto'); const stAlarm=document.getElementById('stAlarm');
function setLamp(el,on,cls){el.classList.toggle('on',on); if(cls==='cool'){el.classList.toggle('cool',on);} if(cls==='alarm'){el.classList.toggle('alarm',on);}}
function updateLamps(){setLamp(stHeat,HEAT); setLamp(stCool,COOL,'cool'); setLamp(stAuto,AUTO); setLamp(stAlarm,ALARM,'alarm');}
const chart = document.getElementById('chart'); const ctx = chart.getContext('2d');
let data = {time:[], indoor:[], pred:[], out:[], setpt:[], power:[]};
function parseCSV(text){
  const lines = text.trim().split(/\r?\n/); const head = lines.shift().split(',');
  const idx = Object.fromEntries(head.map((h,i)=>[h.trim(),i]));
  const t=[], ind=[], pr=[], out=[], spv=[], pow=[];
  for(const line of lines){
    const c = line.split(',');
    t.push(c[idx['LocalTime']]); ind.push(parseFloat(c[idx['IndoorTempC']])); pr.push(parseFloat(c[idx['PredTempC']]));
    out.push(parseFloat(c[idx['OutdoorTempC']])); spv.push(parseFloat(c[idx['SetpointC']])); pow.push(parseFloat(c[idx['HVACPowerW']]));
  }
  return {time:t, indoor:ind, pred:pr, out:out, setpt:spv, power:pow};
}
async function loadSample(){
  const resp = await fetch('assets/sample_hvac_log.csv'); const txt = await resp.text();
  data = parseCSV(txt); drawChart(); summarize();
}
document.getElementById('btnSample').addEventListener('click', ()=>{sndClick.play().catch(()=>{}); loadSample();});
document.getElementById('file').addEventListener('change', async e=>{
  const f = e.target.files[0]; if(!f) return; sndClick.play().catch(()=>{});
  const txt = await f.text(); data = parseCSV(txt); drawChart(); summarize();
});
document.getElementById('btnAuto').addEventListener('click', ()=>{AUTO=true; sndClick.play().catch(()=>{}); updateLamps();});
document.getElementById('btnManual').addEventListener('click', ()=>{AUTO=false; sndClick.play().catch(()=>{}); updateLamps();});
document.getElementById('btnAlarm').addEventListener('click', ()=>{ALARM=true; HEAT=false; COOL=false; sndAlarm.play().catch(()=>{}); updateLamps();});
document.getElementById('btnAck').addEventListener('click', ()=>{ALARM=false; sndClick.play().catch(()=>{}); updateLamps();});
sp.addEventListener('input', ()=>{spVal.textContent=Number(sp.value).toFixed(1); drawChart();});
band.addEventListener('input', ()=>{bandVal.textContent=Number(band.value).toFixed(1); drawChart();});
updateLamps();
function drawChart(){
  const w = chart.width, h = chart.height; ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#1e293b'; ctx.lineWidth=1; ctx.strokeRect(50,20,w-70,h-60);
  const N = data.time.length; if(N<2) return;
  const all = data.indoor.concat(data.pred).filter(Number.isFinite); let ymin=Math.min(...all)-1, ymax=Math.max(...all)+1;
  const x0=50,y0=h-40, ww=w-70, hh=h-60;
  function x(i){return x0 + (i/(N-1))*ww;}
  function y(v){return y0 - ((v - ymin)/(ymax - ymin))*hh;}
  const setp = parseFloat(sp.value); const b = parseFloat(band.value);
  ctx.fillStyle='rgba(34,211,238,0.10)'; ctx.fillRect(x0, y(setp+b), ww, Math.abs(y(setp+b)-y(setp-b)));
  ctx.strokeStyle='#22d3ee'; ctx.setLineDash([6,6]); ctx.beginPath(); ctx.moveTo(x0,y(setp)); ctx.lineTo(x0+ww,y(setp)); ctx.stroke(); ctx.setLineDash([]);
  function path(series,color){ctx.strokeStyle=color; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x(0), y(series[0])); for(let i=1;i<N;i++){ctx.lineTo(x(i), y(series[i]));} ctx.stroke();}
  path(data.indoor,'#e5f3ff'); path(data.pred,'#a7f3d0');
  const last = data.indoor[N-1];
  if(ALARM){HEAT=false; COOL=false;} else if(AUTO){HEAT = last < setp - b; COOL = last > setp + b;}
  updateLamps();
}
function summarize(){
  if(data.time.length<2){document.getElementById('summary').textContent=''; return;}
  let mae=0, cnt=0; for(let i=0;i<data.indoor.length;i++){const a=data.indoor[i], p=data.pred[i]; if(Number.isFinite(a)&&Number.isFinite(p)){mae+=Math.abs(a-p); cnt++;}}
  if(cnt>0) mae/=cnt;
  let kwh=0; if(data.power.length===data.time.length){kwh = data.power.reduce((s,v)=>s+(Number.isFinite(v)?v:0),0) * (10/60) / 1000;}
  document.getElementById('summary').textContent = `Prediction MAE: ${mae.toFixed(2)} C • Approx energy (demo): ${kwh.toFixed(2)} kWh`;
}
// preload sample so the HVAC opens with data quickly when selected
loadSample().catch(()=>{});
*/

// PLC view logic
/************ CONFIG ************/
const LOW_LEVEL  = 30;   // %
const HIGH_LEVEL = 80;   // %
const FILL_RATE  = 0.35; // %/frame when pump ON
const DRAIN_RATE = 0.20; // %/frame when pump OFF

/************ STATE ************/
let MODE  = 'manual';    // 'manual' | 'auto'
let RUN   = false;       // pump running
let ESTOP = false;       // emergency stop latched
let ALARM = false;       // alarm lamp
let FORCE_TEST_ALARM = false; // latch for user-triggered alarm test


let lvl = 45;            // tank level % [0..100]

/************ UI ELEMENTS ************/
const plcRun   = document.getElementById('plcRun');
const plcAuto  = document.getElementById('plcAuto');
const plcAlarm = document.getElementById('plcAlarm');

const impA  = document.getElementById('impA');
const level = document.getElementById('level');

const btnStart  = document.querySelector('[data-cmd="start"]');
const btnStop   = document.querySelector('[data-cmd="stop"]');
const btnAuto   = document.querySelector('[data-cmd="auto"]');
const btnManual = document.querySelector('[data-cmd="manual"]');
const btnEstop  = document.querySelector('[data-cmd="estop"]');
const btnAck    = document.querySelector('[data-cmd="ack"]');




/************ HELPERS ************/
function setLamp(el, on){ el && el.classList.toggle('on', !!on); }
function lamp(el, on){ setLamp(el, on); } // if you also call lamp(...)


function updateButtons(){
  const inAuto = MODE === 'auto';

  // Mode toggles
  if (btnManual) btnManual.disabled = (MODE === 'manual');
  if (btnAuto)   btnAuto.disabled   = (MODE === 'auto');

  // Start/Stop disabled in Auto; hide them if you want "only E-Stop visible"
  if (btnStart){
    btnStart.disabled = inAuto || ESTOP || (lvl >= HIGH_LEVEL);
    btnStart.style.display = inAuto ? 'none' : '';
  }
  if (btnStop){
    btnStop.disabled = inAuto || ESTOP || !RUN;
    btnStop.style.display = inAuto ? 'none' : '';
  }

  if (btnEstop) btnEstop.disabled = false;
  if (btnAck)   btnAck.disabled   = !ESTOP && !ALARM;
}

function updateLamps(){
  lamp(plcRun,  RUN && !ESTOP);
  lamp(plcAuto, MODE === 'auto');
  lamp(plcAlarm, ALARM);
}

/** Spin impeller when running */
function spin(el, speed){
  if(!el) return;
  let d = 0;
  function step(){
    if (RUN && !ESTOP){
      d = (d + speed) % 360;
      // center at (34,28) to match your SVG
      el.setAttribute('transform', `rotate(${d} 34 28)`);
    }
    requestAnimationFrame(step);
  }
  step();
}

/** Draw tank rect: map 0..100% to SVG height */
function drawTank(){
  const H = 160;       // height of tank rect in px (y=40..200)
  const yTop = 40;     // top y of tank
  const h = (H * lvl)/100;
  level?.setAttribute('y', yTop + (H - h));
  level?.setAttribute('height', h);
}

/************ CONTROL LOOP ************/
let _prevRUN = false;
let _prevALARM = false;
function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }


function controlLoop(){
  // 1) E-Stop forces off
  if (ESTOP) RUN = false;

  // 2) Mode rules
  if (!ESTOP && MODE === 'auto'){
    if (lvl <= LOW_LEVEL)  RUN = true;     // start at/below low
    if (lvl >= HIGH_LEVEL) RUN = false;    // stop at/above high
  } else if (!ESTOP && MODE === 'manual'){
    // Safety cutoff: stop if exceeds High
    if (lvl >= HIGH_LEVEL) RUN = false;
  }

  // 3) Process tank level
  if (RUN && !ESTOP) lvl = clamp(lvl + FILL_RATE, 0, 100);
  else               lvl = clamp(lvl - DRAIN_RATE, 0, 100);

  // 4) Alarms
  const alarmLowNoRun     = (MODE === 'auto') && (lvl <= LOW_LEVEL) && !RUN && !ESTOP;
  const alarmHighStillRun = (lvl >= HIGH_LEVEL) && RUN;
  ALARM = alarmLowNoRun || alarmHighStillRun;

  // Override when test alarm is latched
if (FORCE_TEST_ALARM) ALARM = true;

  // Sound: pump hum loop
if (RUN && !ESTOP){
  if (!_prevRUN){
    // transitioned to running
    playSafe(sndPump);
  }
} else {
  if (_prevRUN){
    // transitioned to not running
    pauseSafe(sndPump);
  }
}

// Sound: alarm loop when alarm becomes true
if (ALARM && !_prevALARM){
  playSafe(sndAlarm); // it loops until ACK
}
if (!ALARM && _prevALARM){
  pauseSafe(sndAlarm);
}

// remember for next frame
_prevRUN = RUN;
_prevALARM = ALARM;

  // 5) UI
  drawTank();
  updateLamps();
  updateButtons();

  requestAnimationFrame(controlLoop);
}

/************ BUTTONS ************/
document.querySelectorAll('[data-cmd]').forEach(b=>{
  b.addEventListener('click', ()=>{
    const cmd = b.dataset.cmd;
    switch(cmd){
      case 'manual':
    MODE = 'manual';
    playSafe(sndClick);
    break;

  case 'auto':
    MODE = 'auto';
    playSafe(sndClick);
    break;

  case 'start':
    if (MODE === 'manual' && !ESTOP && lvl < HIGH_LEVEL){
      RUN = true;
      playSafe(sndStart);
    }
    break;

      case 'stop':
    if (MODE === 'manual'){
      RUN = false;
      playSafe(sndStop);
    }
    break;

    case 'estop':
    ESTOP = true;
    RUN = false;
    ALARM = true;     // Optionally assert alarm on E-Stop
    playSafe(sndEstop);
    // ensure alarm sound is on
    playSafe(sndClick);
    break;

  

    case 'testalarm':
  FORCE_TEST_ALARM = true;   // latch test
  ALARM = true;
  playSafe(sndAlarm);        // start alarm sound loop
  updateLamps();
  updateButtons();
  break;

case 'ack':
  ESTOP = false;
  ALARM = false;
  FORCE_TEST_ALARM = false;   // <- clear the test latch too
  pauseSafe(sndAlarm);
  playSafe(sndClick);
  updateLamps(); updateButtons();
  break;


    }
    updateLamps();
    updateButtons();
  });
});

/************ INIT ************/
spin(impA, 4);
drawTank();
updateLamps();
updateButtons();
controlLoop();

/*
function adjustMainPad(){
  const header = document.querySelector('header');
  const main = document.querySelector('main');
  if (!header || !main) return;
  const h = header.offsetHeight;     // actual height (wraps on mobile)
  main.style.paddingTop = (h + 8) + 'px'; // a little breathing room
}
window.addEventListener('load', adjustMainPad);
window.addEventListener('resize', adjustMainPad);

// If your overlay hides after click, recalc once more then:
document.getElementById('startBtn')?.addEventListener('click', ()=>{
  setTimeout(adjustMainPad, 4000); // after your 4s overlay fade-out
});
*/
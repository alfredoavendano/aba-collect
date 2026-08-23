import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from './supabase'

const C = {
  teal: "#0F6E56", tealLt: "#E1F5EE", tealMd: "#1D9E75", tealDk: "#085041",
  blue: "#185FA5", blueLt: "#E6F1FB", blueMd: "#378ADD",
  amber: "#BA7517", amberLt: "#FAEEDA", amberMd: "#EF9F27",
  red: "#A32D2D", redLt: "#FCEBEB", redMd: "#E24B4A",
  purple: "#534AB7", purpleLt: "#EEEDFE", purpleMd: "#7F77DD",
  coral: "#993C1D", coralLt: "#FAECE7", coralMd: "#D85A30",
  gray: "#5F5E5A", grayLt: "#F1EFE8", grayMd: "#888780",
};

const fmt = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};
const fmtHMS = (secs) => {
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};
const age = (dob) => Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000));

// Color helpers for programs from DB
const typeColors = {
  frequency: { color: C.redMd, colorLt: C.redLt },
  duration:  { color: C.amberMd, colorLt: C.amberLt },
  interval:  { color: C.purpleMd, colorLt: C.purpleLt },
  rate:      { color: C.tealMd, colorLt: C.tealLt },
  latency:   { color: C.blueMd, colorLt: C.blueLt },
};
const enrichProg = (p) => ({
  ...p,
  color:   p.color || typeColors[p.type]?.color || C.gray,
  colorLt: typeColors[p.type]?.colorLt || C.grayLt,
  targetVal: p.target_val,
});

function MiniChart({ data, color, height = 48, width = 120 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 8) - 4}`);
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts.join(" ")} />
      <circle cx={pts[pts.length-1].split(",")[0]} cy={pts[pts.length-1].split(",")[1]} r="3" fill={color} />
    </svg>
  );
}

function Toast({ msg }) {
  return (
    <div style={{ position:"fixed", bottom:24, right:24, background:"#1a1a18", color:"#fff", padding:"10px 18px", borderRadius:10, fontSize:13, fontWeight:500, opacity:msg?1:0, transform:msg?"translateY(0)":"translateY(10px)", transition:"all .25s", pointerEvents:"none", zIndex:9999 }}>{msg||"‎"}</div>
  );
}

function ActionBtn({ onClick, icon, label, primary, color, colorLt, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ flex:1, padding:"9px 10px", borderRadius:8, border:`0.5px solid ${primary?color||"rgba(0,0,0,.2)":"rgba(0,0,0,.15)"}`, background:primary?(colorLt||"rgba(0,0,0,.05)"):"rgba(0,0,0,.03)", color:primary?(color||"#1a1a18"):"#5f5e5a", fontSize:12, fontWeight:600, cursor:disabled?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5, opacity:disabled?0.5:1, transition:"all .12s" }}>
      <span>{icon}</span>{label}
    </button>
  );
}

function ProgramCard({ prog, children }) {
  const typeLabel = { frequency:"Frequency", duration:"Duration", interval:"Interval", rate:"Rate", latency:"Latency" }[prog.type];
  return (
    <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,.12)", borderRadius:14, padding:"14px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"#1a1a18", lineHeight:1.3 }}>{prog.name}</div>
          <div style={{ fontSize:11, color:C.gray, marginTop:2 }}>{prog.description}</div>
        </div>
        <span style={{ fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:10, background:prog.colorLt, color:prog.color, flexShrink:0, marginLeft:8 }}>{typeLabel}</span>
      </div>
      {children}
    </div>
  );
}

function FrequencyCard({ prog, sessionActive, onRecord }) {
  const [count, setCount] = useState(0);
  const [timestamps, setTimestamps] = useState([]);
  const atTarget = prog.direction==="decrease" ? count<=prog.targetVal : count>=prog.targetVal;
  const record = () => {
    if (!sessionActive) { onRecord(null,"Start the session first"); return; }
    setCount(c=>c+1); setTimestamps(t=>[...t,Date.now()]); onRecord(`${prog.name} ×${count+1}`);
  };
  const undo = () => { if(count===0)return; setCount(c=>c-1); setTimestamps(t=>t.slice(0,-1)); };
  return (
    <ProgramCard prog={prog}>
      <div style={{ display:"flex", alignItems:"baseline", gap:8, margin:"12px 0 4px" }}>
        <span style={{ fontSize:48, fontWeight:600, color:atTarget?C.teal:C.redMd, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>{count}</span>
        <span style={{ fontSize:13, color:C.gray }}>occurrences</span>
      </div>
      <div style={{ color:atTarget?C.teal:C.amber, fontSize:11, marginBottom:10 }}>{atTarget?`✓ Within target (${prog.target})`:`⚠ Target: ${prog.target}`}</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:3, minHeight:16, marginBottom:10 }}>
        {timestamps.map((_,i)=><div key={i} style={{ width:8, height:8, borderRadius:"50%", background:prog.color, opacity:0.7+(i/timestamps.length)*0.3 }}/>)}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <ActionBtn onClick={record} color={prog.color} colorLt={prog.colorLt} icon="+" label="Record" primary />
        <ActionBtn onClick={undo} icon="↩" label="Undo" />
      </div>
    </ProgramCard>
  );
}

function DurationCard({ prog, sessionActive, onRecord }) {
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const [episodes, setEpisodes] = useState([]);
  const intRef = useRef(null);
  const toggle = () => {
    if (!sessionActive) { onRecord(null,"Start the session first"); return; }
    if (!running) {
      setRunning(true); intRef.current=setInterval(()=>setSecs(s=>s+1),1000);
    } else {
      clearInterval(intRef.current); setTotalSecs(t=>t+secs); setEpisodes(e=>[...e,secs]); setSecs(0); setRunning(false);
      onRecord(`${prog.name}: ${fmt(secs)} recorded`);
    }
  };
  useEffect(()=>()=>clearInterval(intRef.current),[]);
  const atTarget = prog.direction==="increase" ? totalSecs+secs>=prog.targetVal : totalSecs+secs<=prog.targetVal;
  return (
    <ProgramCard prog={prog}>
      <div style={{ fontSize:44, fontWeight:600, fontVariantNumeric:"tabular-nums", lineHeight:1, margin:"12px 0 4px", color:running?C.redMd:C.amberMd }}>{fmt(secs)}</div>
      <div style={{ fontSize:11, color:C.gray, marginBottom:10 }}>Session total: {fmt(totalSecs)} {atTarget&&<span style={{color:C.teal}}>✓</span>}</div>
      <div style={{ display:"flex", gap:4, marginBottom:10, flexWrap:"wrap" }}>
        {episodes.map((d,i)=><span key={i} style={{ fontSize:10, background:prog.colorLt, color:prog.color, padding:"2px 6px", borderRadius:10, fontWeight:500 }}>{fmt(d)}</span>)}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <ActionBtn onClick={toggle} color={running?C.redMd:prog.color} colorLt={running?C.redLt:prog.colorLt} icon={running?"⏸":"▶"} label={running?"Pause / Save":episodes.length?"Resume":"Start"} primary />
        <ActionBtn onClick={()=>{clearInterval(intRef.current);setSecs(0);setRunning(false);}} icon="↺" label="Reset" />
      </div>
    </ProgramCard>
  );
}

function IntervalCard({ prog, sessionActive, onRecord }) {
  const total = prog.total_intervals||20;
  const [cells, setCells] = useState(()=>Array(total).fill(null));
  const [current, setCurrent] = useState(-1);
  const [intervalRunning, setIntervalRunning] = useState(false);
  const [intervalSecs, setIntervalSecs] = useState(0);
  const intRef = useRef(null);
  const startInterval = () => {
    if (!sessionActive) { onRecord(null,"Start the session first"); return; }
    if (intervalRunning) return;
    const next = cells.findIndex(c=>c===null); if(next===-1)return;
    setIntervalRunning(true); setCurrent(next); setIntervalSecs(prog.interval_secs||10);
    intRef.current = setInterval(()=>setIntervalSecs(s=>{
      if(s<=1){clearInterval(intRef.current);setIntervalRunning(false);setCurrent(-1);return 0;}
      return s-1;
    }),1000);
  };
  const markCell = (idx,occurred) => {
    setCells(prev=>{const n=[...prev];n[idx]=occurred;return n;});
    onRecord(`Interval ${idx+1}: ${occurred?"occurred":"not occurred"}`);
    if(intervalRunning&&idx===current){clearInterval(intRef.current);setIntervalRunning(false);setCurrent(-1);}
  };
  useEffect(()=>()=>clearInterval(intRef.current),[]);
  const occurred=cells.filter(c=>c===true).length, marked=cells.filter(c=>c!==null).length;
  const pct=Math.round((occurred/total)*100);
  const atTarget=prog.direction==="decrease"?pct<=prog.targetVal:pct>=prog.targetVal;
  return (
    <ProgramCard prog={prog}>
      <div style={{ display:"flex", alignItems:"baseline", gap:8, margin:"12px 0 4px" }}>
        <span style={{ fontSize:48, fontWeight:600, color:marked===0?C.gray:atTarget?C.teal:C.redMd, lineHeight:1 }}>{pct}%</span>
        <span style={{ fontSize:13, color:C.gray }}>occurrence</span>
      </div>
      <div style={{ fontSize:11, color:C.gray, marginBottom:8 }}>
        {marked}/{total} marked · {occurred} with behavior {intervalRunning&&<span style={{color:C.redMd,marginLeft:8}}>⏱ {intervalSecs}s left</span>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(10,1fr)", gap:3, marginBottom:10 }}>
        {cells.map((c,i)=>(
          <div key={i} onClick={()=>markCell(i,c!==true)} style={{ aspectRatio:"1", borderRadius:4, border:"1px solid", borderColor:i===current?C.amberMd:c===true?prog.color:c===false?C.redMd:"rgba(0,0,0,.12)", background:i===current?C.amberLt:c===true?prog.colorLt:c===false?C.redLt:"rgba(0,0,0,.03)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:500, color:i===current?C.amber:c===true?prog.color:c===false?C.red:C.grayMd, cursor:"pointer", transition:"all .12s", animation:i===current?"blink .8s infinite":"none" }}>{i+1}</div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <ActionBtn onClick={startInterval} color={prog.color} colorLt={prog.colorLt} icon="▶" label={intervalRunning?"Running…":"Start interval"} primary disabled={intervalRunning} />
        <ActionBtn onClick={()=>{setCells(Array(total).fill(null));setCurrent(-1);setIntervalRunning(false);clearInterval(intRef.current);}} icon="↺" label="Reset" />
      </div>
    </ProgramCard>
  );
}

function RateCard({ prog, sessionActive, onRecord }) {
  const [yes, setYes] = useState(0);
  const [total, setTotal] = useState(0);
  const [log, setLog] = useState([]);
  const pct = total>0?Math.round((yes/total)*100):null;
  const atTarget = pct!==null&&(prog.direction==="increase"?pct>=prog.targetVal:pct<=prog.targetVal);
  const record = (complied) => {
    if (!sessionActive) { onRecord(null,"Start the session first"); return; }
    if(complied)setYes(y=>y+1); setTotal(t=>t+1);
    setLog(l=>[...l,{complied}]); onRecord(`${prog.name}: ${complied?"✓ Complied":"✗ Did not comply"}`);
  };
  return (
    <ProgramCard prog={prog}>
      <div style={{ display:"flex", gap:20, margin:"12px 0 4px", alignItems:"flex-end" }}>
        <div><div style={{fontSize:11,color:C.gray}}>Complied</div><div style={{fontSize:36,fontWeight:600,color:C.teal,lineHeight:1}}>{yes}</div></div>
        <div style={{color:"rgba(0,0,0,.15)",fontSize:28,alignSelf:"center"}}>/</div>
        <div><div style={{fontSize:11,color:C.gray}}>Total</div><div style={{fontSize:36,fontWeight:600,lineHeight:1}}>{total}</div></div>
        <div style={{marginLeft:"auto",textAlign:"right"}}><div style={{fontSize:11,color:C.gray}}>Rate</div><div style={{fontSize:36,fontWeight:600,lineHeight:1,color:atTarget?C.teal:pct!==null?C.redMd:C.gray}}>{pct!==null?`${pct}%`:"—"}</div></div>
      </div>
      <div style={{ fontSize:11, color:atTarget?C.teal:C.amber, marginBottom:8 }}>{pct!==null?(atTarget?`✓ ${prog.target}`:`⚠ Target: ${prog.target}`):prog.target}</div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10, maxHeight:36, overflow:"hidden" }}>
        {log.slice(-12).map((l,i)=><span key={i} style={{fontSize:9,background:l.complied?C.tealLt:C.redLt,color:l.complied?C.teal:C.red,padding:"2px 5px",borderRadius:6,fontWeight:600}}>{l.complied?"✓":"✗"}</span>)}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <ActionBtn onClick={()=>record(true)} color={C.teal} colorLt={C.tealLt} icon="✓" label="Complied" primary />
        <ActionBtn onClick={()=>record(false)} color={C.red} colorLt={C.redLt} icon="✗" label="Did not comply" primary />
      </div>
    </ProgramCard>
  );
}

function SessionView({ programs, sessionActive, onRecord }) {
  const typeOrder = ["frequency","duration","interval","rate","latency"];
  const sorted = [...programs].sort((a,b)=>typeOrder.indexOf(a.type)-typeOrder.indexOf(b.type));
  return (
    <div>
      {!sessionActive&&<div style={{background:C.amberLt,border:`0.5px solid ${C.amberMd}40`,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:C.amber,fontWeight:500}}>⚠ Session not started — press "Start session" below to begin recording data</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {sorted.map(prog=>
          prog.type==="frequency"?<FrequencyCard key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord}/>:
          prog.type==="duration"?<DurationCard key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord}/>:
          prog.type==="interval"?<IntervalCard key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord}/>:
          prog.type==="rate"?<RateCard key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord}/>:null
        )}
      </div>
      <div style={{background:"#fff",border:"0.5px solid rgba(0,0,0,.12)",borderRadius:14,padding:"14px 16px",marginTop:12}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>📝 Session notes</div>
        <textarea rows={3} placeholder="Clinical observations, antecedents, consequences, environmental factors…" style={{width:"100%",border:"0.5px solid rgba(0,0,0,.15)",borderRadius:8,padding:"9px 12px",fontSize:13,fontFamily:"inherit",color:"#1a1a18",background:"#fafaf9",resize:"none",outline:"none"}}/>
      </div>
    </div>
  );
}

function ProgramsView({ programs }) {
  const typeIcon={frequency:"🔢",duration:"⏱",interval:"⬜",rate:"%",latency:"⏳"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontSize:13,color:C.gray}}>{programs.length} programs</div>
        <button style={{fontSize:12,padding:"7px 14px",borderRadius:8,border:"0.5px solid rgba(0,0,0,.15)",background:"transparent",cursor:"pointer",fontWeight:500}}>+ Add program</button>
      </div>
      {programs.map(prog=>(
        <div key={prog.id} style={{background:"#fff",border:"0.5px solid rgba(0,0,0,.12)",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:40,height:40,borderRadius:10,background:prog.colorLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{typeIcon[prog.type]}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600}}>{prog.name}</div>
            <div style={{fontSize:11,color:C.gray,marginTop:2}}>{prog.description}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:C.gray}}>Target</div>
            <div style={{fontSize:12,fontWeight:500}}>{prog.target}</div>
          </div>
          <div style={{width:90}}><MiniChart data={[8,6,5,4,3,2]} color={prog.color} width={90}/></div>
          <span style={{fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:12,background:C.tealLt,color:C.teal}}>Active</span>
        </div>
      ))}
    </div>
  );
}

function PatientsView({ patients, programsByPatient, selectedId, onSelect }) {
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:13,color:C.gray}}>{patients.length} patients assigned</div>
        <input placeholder="Search…" style={{fontSize:12,padding:"7px 12px",borderRadius:8,border:"0.5px solid rgba(0,0,0,.15)",background:"#fafaf9",outline:"none",width:160}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {patients.map(p=>{
          const progs=programsByPatient[p.id]||[], selected=p.id===selectedId;
          return (
            <div key={p.id} onClick={()=>onSelect(p.id)} style={{background:selected?C.tealLt:"#fff",border:`${selected?"1.5px":"0.5px"} solid ${selected?C.tealMd:"rgba(0,0,0,.12)"}`,borderRadius:14,padding:16,cursor:"pointer",transition:"all .15s"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:p.color||C.blueMd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:600,color:"#fff",marginBottom:10}}>{p.initials}</div>
              <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{p.name}</div>
              <div style={{fontSize:11,color:C.gray}}>Age {age(p.dob)} · {p.diagnosis}</div>
              <div style={{fontSize:11,color:C.gray,marginTop:2}}>BCBA: {p.bcba}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:10}}>
                {progs.slice(0,3).map(pr=><span key={pr.id} style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:"rgba(0,0,0,.05)",color:C.gray}}>{pr.name.split(" ")[0]}</span>)}
                {progs.length>3&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:"rgba(0,0,0,.05)",color:C.gray}}>+{progs.length-3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartCard({ title, color, data, labels, targetVal, targetLabel, suffix="" }) {
  if(!data||!data.length)return null;
  const min=0, max=Math.max(...data,targetVal)*1.2;
  const W=280,H=120,PAD={t:10,r:10,b:28,l:32};
  const cW=W-PAD.l-PAD.r, cH=H-PAD.t-PAD.b;
  const xPos=i=>PAD.l+(i/(data.length-1))*cW;
  const yPos=v=>PAD.t+cH-((v-min)/(max-min))*cH;
  const pts=data.map((v,i)=>`${xPos(i)},${yPos(v)}`).join(" ");
  const areaPath=`M${xPos(0)},${yPos(data[0])} `+data.map((v,i)=>`L${xPos(i)},${yPos(v)}`).join(" ")+` L${xPos(data.length-1)},${PAD.t+cH} L${xPos(0)},${PAD.t+cH} Z`;
  return (
    <div style={{background:"#fff",border:"0.5px solid rgba(0,0,0,.12)",borderRadius:12,padding:"14px 16px"}}>
      <div style={{fontSize:12,fontWeight:600,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>{title}</span>
        <span style={{fontSize:10,color,background:`${color}18`,padding:"2px 8px",borderRadius:8}}>{targetLabel}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        {[0,0.5,1].map(f=><line key={f} x1={PAD.l} x2={PAD.l+cW} y1={PAD.t+cH*(1-f)} y2={PAD.t+cH*(1-f)} stroke="rgba(0,0,0,.06)" strokeWidth={1}/>)}
        <line x1={PAD.l} x2={PAD.l+cW} y1={yPos(targetVal)} y2={yPos(targetVal)} stroke={color} strokeWidth={1} strokeDasharray="4 3" opacity={0.5}/>
        <path d={areaPath} fill={`${color}18`}/>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
        {data.map((v,i)=><circle key={i} cx={xPos(i)} cy={yPos(v)} r={3} fill={color}/>)}
        {labels.filter((_,i)=>i%Math.ceil(labels.length/5)===0||i===labels.length-1).map(l=>{
          const idx=labels.indexOf(l);
          return <text key={l} x={xPos(idx)} y={H-4} fontSize={8} textAnchor="middle" fill={C.grayMd}>{l}</text>;
        })}
        {[0,0.5,1].map(f=>{
          const v=min+(max-min)*f;
          return <text key={f} x={PAD.l-4} y={PAD.t+cH*(1-f)+3} fontSize={8} textAnchor="end" fill={C.grayMd}>{Math.round(v)}{suffix}</text>;
        })}
      </svg>
    </div>
  );
}

function DashboardView({ patient }) {
  const [sessions, setSessions] = useState([]);
  useEffect(()=>{
    if(!patient)return;
    supabase.from('sessions').select('*').eq('patient_id',patient.id).order('started_at').then(({data})=>{
      if(data) setSessions(data);
    });
  },[patient]);

  return (
    <div>
      <div style={{background:"#fff",border:"0.5px solid rgba(0,0,0,.12)",borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:patient.color||C.blueMd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:600,color:"#fff"}}>{patient.initials}</div>
        <div>
          <div style={{fontSize:15,fontWeight:600}}>{patient.name}</div>
          <div style={{fontSize:12,color:C.gray}}>Age {age(patient.dob)} · {patient.diagnosis} · BCBA: {patient.bcba}</div>
        </div>
        <div style={{marginLeft:"auto",textAlign:"right"}}>
          <div style={{fontSize:11,color:C.gray}}>Total sessions</div>
          <div style={{fontSize:22,fontWeight:700,color:C.teal}}>{sessions.length}</div>
        </div>
      </div>
      {sessions.length===0?(
        <div style={{background:"#fff",border:"0.5px solid rgba(0,0,0,.12)",borderRadius:14,padding:40,textAlign:"center",color:C.gray}}>
          <div style={{fontSize:32,marginBottom:10}}>📊</div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>No sessions yet</div>
          <div style={{fontSize:12}}>Start a session to see analytics here</div>
        </div>
      ):(
        <div style={{background:"#fff",border:"0.5px solid rgba(0,0,0,.12)",borderRadius:14,padding:"14px 16px"}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Session history</div>
          {sessions.map((s,i)=>(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<sessions.length-1?"0.5px solid rgba(0,0,0,.08)":"none",fontSize:12}}>
              <div><strong>{new Date(s.started_at).toLocaleDateString()}</strong></div>
              <div style={{color:C.gray}}>{s.duration_secs?fmtHMS(s.duration_secs):"—"}</div>
              <div style={{color:C.teal,fontWeight:500,fontSize:10}}>✓ Complete</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsView({ patient }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{background:"#fff",border:"0.5px solid rgba(0,0,0,.12)",borderRadius:14,padding:18}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Weekly progress report</div>
        <div style={{fontSize:11,color:C.gray,marginBottom:14}}>Auto-generated</div>
        <div style={{fontSize:12,color:"#3a3a38",lineHeight:1.8}}>
          <div>Patient: <strong>{patient.name}</strong></div>
          <div>BCBA: <strong>{patient.bcba}</strong></div>
          <div style={{marginTop:10,padding:"10px 12px",background:C.tealLt,borderRadius:8,fontSize:11,color:C.tealDk,lineHeight:1.6}}>
            <strong>Clinical summary:</strong> Connect session data to generate automatic summaries.
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button style={{flex:1,padding:"9px 0",borderRadius:8,border:"none",background:C.teal,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>⬇ Export PDF</button>
          <button style={{flex:1,padding:"9px 0",borderRadius:8,border:"0.5px solid rgba(0,0,0,.15)",background:"transparent",fontSize:12,fontWeight:500,cursor:"pointer"}}>Share with BCBA</button>
        </div>
      </div>
      <div style={{background:"#fff",border:"0.5px solid rgba(0,0,0,.12)",borderRadius:14,padding:18}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>Session log</div>
        <div style={{fontSize:12,color:C.gray,textAlign:"center",padding:20}}>Sessions will appear here as they are recorded.</div>
      </div>
    </div>
  );
}

export default function App({ user, profile, onLogout })  {
  const [patients, setPatients] = useState([]);
  const [programsByPatient, setProgramsByPatient] = useState({});
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("session");
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [toast, setToast] = useState("");
  const timerRef = useRef(null);
  const toastRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
// Get assigned patient IDs for this RBT
const { data: assignmentData } = await supabase
  .from('patient_assignments')
  .select('patient_id')
  .eq('rbt_id', user.id);

const patientIds = (assignmentData || []).map(a => a.patient_id);

const { data: patientsData } = patientIds.length > 0
  ? await supabase.from('patients').select('*').in('id', patientIds).order('name')
  : { data: [] };    const { data: programsData } = await supabase.from('programs').select('*').eq('status','active');
    if (patientsData) {
      setPatients(patientsData);
      if (patientsData.length > 0) setSelectedPatientId(patientsData[0].id);
    }
    if (programsData) {
      const grouped = {};
      programsData.forEach(p => {
        if (!grouped[p.patient_id]) grouped[p.patient_id] = [];
        grouped[p.patient_id].push(enrichProg(p));
      });
      setProgramsByPatient(grouped);
    }
    setLoading(false);
  };

  const showToast = useCallback((msg,err)=>{
    setToast(err||msg); clearTimeout(toastRef.current);
    toastRef.current=setTimeout(()=>setToast(""),2500);
  },[]);

  const startSession = () => {
    setSessionActive(true); setSessionSecs(0);
    timerRef.current=setInterval(()=>setSessionSecs(s=>s+1),1000);
    showToast("Session started!");
  };

  const endSession = async () => {
    setSessionActive(false); clearInterval(timerRef.current);
    if (selectedPatientId) {
      await supabase.from('sessions').insert({
        patient_id: selectedPatientId,
        rbt_name: 'RBT',
        ended_at: new Date().toISOString(),
        duration_secs: sessionSecs,
      });
    }
    showToast("Session ended · Data saved");
  };

  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const patient = patients.find(p => p.id === selectedPatientId);
  const patientPrograms = programsByPatient[selectedPatientId] || [];

  const NAV=[
    {id:"session",label:"Session",icon:"⏺"},
    {id:"programs",label:"Programs",icon:"📋"},
    {id:"patients",label:"Patients",icon:"👥"},
    {id:"dashboard",label:"Dashboard",icon:"📊"},
    {id:"reports",label:"Reports",icon:"📄"},
  ];
  const viewTitles={session:"Session recording",programs:"Treatment programs",patients:"Patients",dashboard:"BCBA dashboard",reports:"Reports & exports"};

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:12,background:"#f5f4f0"}}>
      <div style={{fontSize:36}}>🧠</div>
      <div style={{fontSize:14,fontWeight:600,color:C.teal}}>Loading ABA Collect…</div>
    </div>
  );

  if (!patient) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:12,background:"#f5f4f0"}}>
      <div style={{fontSize:36}}>⚠️</div>
      <div style={{fontSize:14,fontWeight:600,color:C.amber}}>No patients found in database</div>
      <div style={{fontSize:12,color:C.gray}}>Check your Supabase connection</div>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans',system-ui,sans-serif",background:"#f5f4f0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        button:hover{opacity:.85} *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px}
      `}</style>

      {/* Sidebar */}
      <div style={{width:220,background:"#fff",borderRight:"0.5px solid rgba(0,0,0,.10)",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"20px 18px 14px",borderBottom:"0.5px solid rgba(0,0,0,.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:14,fontWeight:700,color:C.teal}}><span style={{fontSize:20}}>🧠</span> ABA Collect</div>
          <div style={{fontSize:10,color:C.grayMd,marginTop:3}}>RBT Data Platform · v2.0</div>
<div style={{fontSize:10,color:C.grayMd,marginTop:6}}>{profile?.full_name}</div>
<div style={{fontSize:10,color:C.grayMd}}>{profile?.role?.toUpperCase()}</div>
        </div>
        <div style={{padding:"10px 8px",flex:1}}>
          <div style={{fontSize:10,color:C.grayMd,letterSpacing:".07em",textTransform:"uppercase",padding:"8px 10px 4px"}}>Workspace</div>
          {NAV.slice(0,3).map(n=>(
            <div key={n.id} onClick={()=>setView(n.id)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:view===n.id?600:400,color:view===n.id?C.teal:C.gray,background:view===n.id?C.tealLt:"transparent",marginBottom:2,transition:"all .12s"}}>
              <span>{n.icon}</span>{n.label}
            </div>
          ))}
          <div style={{fontSize:10,color:C.grayMd,letterSpacing:".07em",textTransform:"uppercase",padding:"12px 10px 4px"}}>Analysis</div>
          {NAV.slice(3).map(n=>(
            <div key={n.id} onClick={()=>setView(n.id)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:view===n.id?600:400,color:view===n.id?C.teal:C.gray,background:view===n.id?C.tealLt:"transparent",marginBottom:2,transition:"all .12s"}}>
              <span>{n.icon}</span>{n.label}
            </div>
          ))}
        </div>
        <div style={{padding:"12px 8px",borderTop:"0.5px solid rgba(0,0,0,.08)"}}>
          <div style={{fontSize:10,color:C.grayMd,textTransform:"uppercase",letterSpacing:".07em",padding:"0 10px",marginBottom:6}}>Current patient</div>
          <div onClick={()=>setView("patients")} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:10,background:C.blueLt,border:"0.5px solid rgba(24,95,165,.2)",cursor:"pointer"}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:patient.color||C.blueMd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{patient.initials}</div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.blue}}>{patient.name}</div>
              <div style={{fontSize:10,color:C.grayMd}}>{patient.diagnosis}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"13px 22px",borderBottom:"0.5px solid rgba(0,0,0,.08)",background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:700}}>{viewTitles[view]}</div>
            <div style={{fontSize:11,color:C.grayMd,display:"flex",alignItems:"center",gap:5,marginTop:1}}>
              <span>📅</span> {new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {sessionActive
              ? <span style={{display:"inline-flex",alignItems:"center",gap:5,background:C.tealLt,color:C.teal,fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:20,border:`0.5px solid ${C.tealMd}40`}}><span style={{width:7,height:7,borderRadius:"50%",background:C.tealMd,animation:"blink 1.2s infinite",display:"inline-block"}}/> Live</span>
              : <span style={{display:"inline-flex",alignItems:"center",gap:5,background:"#f1efe8",color:C.grayMd,fontSize:11,fontWeight:500,padding:"5px 12px",borderRadius:20}}>Ready</span>
            }
            <button onClick={()=>setView("dashboard")} style={{fontSize:12,padding:"7px 14px",borderRadius:8,border:"0.5px solid rgba(0,0,0,.15)",background:"transparent",cursor:"pointer",fontWeight:500}}>📊 BCBA view</button>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:20}}>
          {view==="session"&&<SessionView programs={patientPrograms} sessionActive={sessionActive} onRecord={showToast}/>}
          {view==="programs"&&<ProgramsView programs={patientPrograms}/>}
          {view==="patients"&&<PatientsView patients={patients} programsByPatient={programsByPatient} selectedId={selectedPatientId} onSelect={id=>{setSelectedPatientId(id);showToast(`Switched to ${patients.find(p=>p.id===id)?.name}`);}}/>}
          {view==="dashboard"&&<DashboardView patient={patient}/>}
          {view==="reports"&&<ReportsView patient={patient}/>}
        </div>

        {view==="session"&&(
          <div style={{padding:"12px 22px",borderTop:"0.5px solid rgba(0,0,0,.08)",background:"#fff",display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:22,fontWeight:700,fontVariantNumeric:"tabular-nums",color:sessionActive?C.teal:C.gray}}>{fmtHMS(sessionSecs)}</div>
            <div style={{fontSize:11,color:C.grayMd}}>{sessionActive?"Session in progress":"Session not started"}</div>
            <div style={{flex:1}}/>
            {sessionActive&&<button onClick={endSession} style={{padding:"9px 18px",borderRadius:8,border:`0.5px solid ${C.redMd}50`,background:C.redLt,color:C.red,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>⏹ End session</button>}
            {!sessionActive&&<button onClick={startSession} style={{padding:"9px 18px",borderRadius:8,border:"none",background:C.teal,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>▶ Start session</button>}
          </div>
        )}
        <div style={{padding:"8px",borderTop:"0.5px solid rgba(0,0,0,.08)"}}>
  <button onClick={onLogout} style={{width:"100%",padding:"8px 0",borderRadius:8,border:"0.5px solid rgba(0,0,0,.15)",background:"transparent",fontSize:12,fontWeight:500,cursor:"pointer",color:C.gray}}>
    Sign out
  </button>
</div> 
      </div>

      <Toast msg={toast}/>
    </div>
  );
}

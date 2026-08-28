import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from './supabase';
import SessionNote from './SessionNote';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  navy:    "#0F2744", navyLt: "#E8EEF5", navyMd: "#1A3D6B",
  green:   "#0D6E4E", greenLt:"#E6F5F0", greenMd:"#18A274",
  red:     "#B91C1C", redLt:  "#FEF2F2", redMd:  "#DC2626",
  amber:   "#92400E", amberLt:"#FFFBEB", amberMd:"#D97706",
  purple:  "#4C1D95", purpleLt:"#F5F3FF",purpleMd:"#7C3AED",
  ink:     "#0F172A", ink2:   "#334155", ink3:   "#64748B",
  bg:      "#F8F9FB", bg2:    "#F1F3F7", white:  "#FFFFFF",
  border:  "rgba(15,23,42,.08)", border2: "rgba(15,23,42,.14)",
};

const S = {
  card: {
    background: "#fff",
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: "20px 24px",
  },
  label: {
    fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
    textTransform: "uppercase", color: T.ink3,
  },
  badge: (color, bg) => ({
    fontSize: 11, fontWeight: 600, padding: "3px 10px",
    borderRadius: 99, background: bg, color,
  }),
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const fmtHMS = (s) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const age = (dob) => dob ? Math.floor((Date.now()-new Date(dob))/(365.25*864e5)) : "—";

const typeInfo = {
  frequency: { label:"Frequency", color:T.red,    bg:T.redLt   },
  duration:  { label:"Duration",  color:T.amber,  bg:T.amberLt },
  partial_interval:         { label:"Partial Interval",  color:T.purple, bg:T.purpleLt },
  whole_interval:           { label:"Whole Interval",    color:T.purple, bg:T.purpleLt },
  momentary_time_sampling:  { label:"Momentary TS",      color:T.navy,   bg:T.navyLt   },
  abc_data:                 { label:"ABC Data",          color:T.green,  bg:T.greenLt  },
  scatterplot:              { label:"Scatterplot",       color:T.amber,  bg:T.amberLt  },
  permanent_product:        { label:"Permanent Product", color:T.ink2,   bg:T.bg2      },
  rate:      { label:"Rate",      color:T.green,  bg:T.greenLt },
  latency:   { label:"Latency",   color:T.navy,   bg:T.navyLt  },
};

const enrichProg = (p) => ({
  ...p,
  color:   typeInfo[p.type]?.color   || T.ink3,
  colorLt: typeInfo[p.type]?.bg      || T.bg2,
  targetVal: p.target_val,
});

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; background: ${T.bg}; color: ${T.ink}; -webkit-font-smoothing: antialiased; }
  button { font-family: inherit; cursor: pointer; transition: opacity .12s, transform .12s; }
  button:hover { opacity: .85; }
  button:active { transform: scale(.98); }
  input, textarea, select { font-family: inherit; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:.3} }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 4px; }
`;

// ─── Reusable components ──────────────────────────────────────────────────────
function Badge({ type }) {
  const t = typeInfo[type] || { label: type, color: T.ink3, bg: T.bg2 };
  return <span style={S.badge(t.color, t.bg)}>{t.label}</span>;
}

function Btn({ onClick, children, variant="secondary", disabled, style={} }) {
  const variants = {
    primary:   { background: T.navy,    color:"#fff", border:"none" },
    success:   { background: T.green,   color:"#fff", border:"none" },
    danger:    { background: T.redLt,   color:T.red,  border:`1px solid ${T.red}30` },
    secondary: { background: T.white,   color:T.ink2, border:`1px solid ${T.border2}` },
    ghost:     { background:"transparent", color:T.ink3, border:"none" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...variants[variant], padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:600,
        display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        opacity:disabled?.5:1, cursor:disabled?"not-allowed":"pointer", ...style }}>
      {children}
    </button>
  );
}

function Card({ children, style={} }) {
  return <div style={{ ...S.card, ...style }}>{children}</div>;
}

function Toast({ msg }) {
  return (
    <div style={{ position:"fixed", bottom:24, right:24, background:T.ink, color:"#fff",
      padding:"11px 20px", borderRadius:10, fontSize:13, fontWeight:600,
      opacity:msg?1:0, transform:msg?"translateY(0)":"translateY(8px)",
      transition:"all .2s", pointerEvents:"none", zIndex:9999, maxWidth:320 }}>
      {msg||"\u200b"}
    </div>
  );
}

// ─── Program cards ────────────────────────────────────────────────────────────
function ProgramCard({ prog, children }) {
  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div style={{ flex:1, paddingRight:12 }}>
          <div style={{ fontSize:15, fontWeight:700, color:T.ink, lineHeight:1.3 }}>{prog.name}</div>
          <div style={{ fontSize:12, color:T.ink3, marginTop:4 }}>{prog.description}</div>
        </div>
        <Badge type={prog.type} />
      </div>
      {children}
    </Card>
  );
}

function ActionRow({ children }) {
  return <div style={{ display:"flex", gap:8, marginTop:16 }}>{children}</div>;
}

// ─── Frequency ────────────────────────────────────────────────────────────────
function FrequencyCard({ prog, sessionActive, onRecord, session, userId }) {
  const [count, setCount] = useState(0);
  const atTarget = prog.direction==="decrease" ? count<=prog.targetVal : count>=prog.targetVal;
  const record = async () => {
  if(!sessionActive){ onRecord(null,"Start session first"); return; }
  const newCount = count + 1;
  setCount(newCount);
  onRecord(`${prog.name} ×${newCount}`);
  if(session?.id) {
    await supabase.from("data_points").insert({
      session_id: session.id,
      program_id: prog.id,
      type: "frequency",
      value: newCount,
      recorded_at: new Date().toISOString(),
      rbt_id: userId
    });
  }
};
  return (
    <ProgramCard prog={prog}>
      <div style={{ fontSize:64, fontWeight:800, color:atTarget?T.green:T.red, lineHeight:1, fontVariantNumeric:"tabular-nums", letterSpacing:"-2px" }}>{count}</div>
      <div style={{ fontSize:12, color:atTarget?T.green:T.amber, marginTop:6, fontWeight:500 }}>
        {atTarget ? `✓ Within target — ${prog.target}` : `Target: ${prog.target}`}
      </div>
      <ActionRow>
        <Btn onClick={record} variant="primary" style={{ flex:1 }}>+ Record</Btn>
        <Btn onClick={()=>count>0&&setCount(c=>c-1)} style={{ flex:1 }}>↩ Undo</Btn>
      </ActionRow>
    </ProgramCard>
  );
}

// ─── Duration ─────────────────────────────────────────────────────────────────
function DurationCard({ prog, sessionActive, onRecord, session, userId }) {
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [total, setTotal] = useState(0);
  const [episodes, setEpisodes] = useState([]);
  const ref = useRef(null);
  const toggle = async () => {
    if (!sessionActive) { onRecord(null,"Start the session first"); return; }
    if (!running) { setRunning(true); ref.current=setInterval(()=>setSecs(s=>s+1),1000); }
    else{
      clearInterval(ref.current);
      const elapsed = secs;
      setTotal(t=>t+elapsed);
      setSecs(0);
      setRunning(false);
      onRecord(`${prog.name}: ${fmt(elapsed)}`);
      if(session?.id) {
        await supabase.from("data_points").insert({
          session_id: session.id,
          program_id: prog.id,
          type: "duration",
          value: elapsed,
          recorded_at: new Date().toISOString(),
          rbt_id: userId
        });
      }
    }  };
  useEffect(()=>()=>clearInterval(ref.current),[]);
  return (
    <ProgramCard prog={prog}>
      <div style={{ fontSize:64, fontWeight:800, lineHeight:1, fontVariantNumeric:"tabular-nums", letterSpacing:"-2px", color:running?T.red:T.amber }}>{fmt(secs)}</div>
      <div style={{ fontSize:12, color:T.ink3, marginTop:6 }}>Session total: <strong>{fmt(total)}</strong></div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
        {episodes.map((d,i)=><span key={i} style={{ ...S.badge(prog.color,prog.colorLt), fontSize:11 }}>{fmt(d)}</span>)}
      </div>
      <ActionRow>
        <Btn onClick={toggle} variant={running?"danger":"primary"} style={{ flex:1 }}>{running?"⏸ Pause":"▶ Start"}</Btn>
        <Btn onClick={()=>{clearInterval(ref.current);setSecs(0);setRunning(false);}} style={{ flex:1 }}>↺ Reset</Btn>
      </ActionRow>
    </ProgramCard>
  );
}

// ─── Interval ─────────────────────────────────────────────────────────────────
function IntervalCard({ prog, sessionActive, onRecord, session, userId }) {  
  const total = prog.total_intervals || 20;
  const intervalSecs = prog.interval_secs || 10;
  const [results, setResults] = useState([]); // true=occurred, false=not
  const [currentInterval, setCurrentInterval] = useState(0);
  const [timeLeft, setTimeLeft] = useState(intervalSecs);
  const [running, setRunning] = useState(false);
  const [waitingResponse, setWaitingResponse] = useState(false);
  const timerRef = useRef(null);

  const occurred = results.filter(r=>r===true).length;
  const pct = results.length > 0 ? Math.round((occurred/results.length)*100) : null;
  const atTarget = pct !== null && (prog.direction==="decrease" ? pct<=prog.targetVal : pct>=prog.targetVal);

  useEffect(() => {
    if (!running || waitingResponse) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setWaitingResponse(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running, waitingResponse, currentInterval]);

  const startRecording = () => {
    if (!sessionActive) { onRecord(null, "Start the session first"); return; }
    setRunning(true);
    setTimeLeft(intervalSecs);
  };

  const recordResponse = async (occurred) => {
  const newResults = [...results, occurred];
  setResults(newResults);
  onRecord(`Interval ${currentInterval+1}: ${occurred?"✓":"✗"}`);
  if(session?.id) {
    await supabase.from("data_points").insert({
      session_id: session.id,
      program_id: prog.id,
      type: prog.type,
      value: occurred ? 1 : 0,
      occurred: occurred,
      interval_index: currentInterval,
      recorded_at: new Date().toISOString(),
      rbt_id: userId
    });
  }
  const next = currentInterval + 1;
  if (next >= total) {
    setRunning(false);
    setWaitingResponse(false);
    setCurrentInterval(total);
  } else {
    setCurrentInterval(next);
    setTimeLeft(intervalSecs);
    setWaitingResponse(false);
  }
};

  const reset = () => {
    clearInterval(timerRef.current);
    setResults([]); setCurrentInterval(0);
    setTimeLeft(intervalSecs); setRunning(false); setWaitingResponse(false);
  };

  const isComplete = currentInterval >= total;

  return (
    <ProgramCard prog={prog}>
      {/* Progress */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ fontSize:11, color:T.ink3, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>
          {prog.type==="partial_interval"?"Partial Interval":prog.type==="whole_interval"?"Whole Interval":"Momentary Time Sampling"}
        </div>
        <div style={{ fontSize:12, color:T.ink3 }}>{results.length}/{total} intervals</div>
      </div>

      {/* Big number */}
      <div style={{ fontSize:64, fontWeight:800, lineHeight:1, letterSpacing:"-2px",
        color:isComplete?(atTarget?T.green:T.red):waitingResponse?T.amber:T.ink3 }}>
        {pct !== null ? `${pct}%` : "—"}
      </div>
      <div style={{ fontSize:12, color:T.ink3, marginTop:6 }}>
        {isComplete ? (atTarget?`✓ Within target — ${prog.target}`:`Target: ${prog.target}`) : `Target: ${prog.target}`}
      </div>

      {/* Interval dots */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:12 }}>
        {Array.from({length:total}).map((_,i)=>(
          <div key={i} style={{ width:14, height:14, borderRadius:3,
            background:i<results.length?(results[i]?prog.color:T.redLt):i===currentInterval&&running?"rgba(0,0,0,.15)":T.bg2,
            border:`1.5px solid ${i<results.length?(results[i]?prog.color:T.red):i===currentInterval&&running?T.ink3:T.border2}` }}/>
        ))}
      </div>

      {/* Timer or response buttons */}
      {!isComplete && (
        <div style={{ marginTop:16 }}>
          {waitingResponse ? (
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:T.amber, marginBottom:10, textAlign:"center" }}>
                {prog.type==="partial_interval"?"Did the behavior occur during this interval?":
                 prog.type==="whole_interval"?"Did the behavior occur throughout the entire interval?":
                 "Is the behavior occurring right now?"}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={()=>recordResponse(true)} variant="success" style={{ flex:1 }}>✓ Yes</Btn>
                <Btn onClick={()=>recordResponse(false)} variant="danger" style={{ flex:1 }}>✗ No</Btn>
              </div>
            </div>
          ) : running ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:11, color:T.ink3, marginBottom:6 }}>
                Interval {currentInterval+1} of {total}
              </div>
              <div style={{ fontSize:48, fontWeight:800, color:timeLeft<=3?T.red:T.navy, letterSpacing:"-1px" }}>
                {timeLeft}s
              </div>
            </div>
          ) : (
            <ActionRow>
              <Btn onClick={startRecording} variant="primary" style={{ flex:1 }}>▶ Start intervals</Btn>
            </ActionRow>
          )}
        </div>
      )}

      {isComplete && (
        <ActionRow>
          <Btn onClick={reset} style={{ flex:1 }}>↺ Reset</Btn>
        </ActionRow>
      )}
    </ProgramCard>
  );
}

// ─── Rate ─────────────────────────────────────────────────────────────────────
function RateCard({ prog, sessionActive, onRecord, session, userId }) {  
  const [yes, setYes] = useState(0);
  const [total, setTotal] = useState(0);
  const [log, setLog] = useState([]);
  const pct = total>0 ? Math.round((yes/total)*100) : null;
  const atTarget = pct!==null && (prog.direction==="increase" ? pct>=prog.targetVal : pct<=prog.targetVal);
  const record = async (c) => {
    if(!sessionActive){ onRecord(null,"Start session first"); return; }
    if(c) setYes(y=>y+1);
    setTotal(t=>t+1);
    onRecord(`${prog.name}: ${c?"✓":"✗"}`);
    if(session?.id) {
      await supabase.from("data_points").insert({
        session_id: session.id,
        program_id: prog.id,
        type: "rate",
        value: c ? 1 : 0,
        recorded_at: new Date().toISOString(),
        rbt_id: userId
      });
    }
  };
  return (
    <ProgramCard prog={prog}>
      <div style={{ display:"flex", alignItems:"baseline", gap:16, marginBottom:6 }}>
        <div>
          <div style={{ fontSize:11, color:T.ink3, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>Rate</div>
          <div style={{ fontSize:64, fontWeight:800, lineHeight:1, letterSpacing:"-2px", color:atTarget?T.green:pct!==null?T.red:T.ink3 }}>{pct!==null?`${pct}%`:"—"}</div>
        </div>
        <div style={{ display:"flex", gap:20 }}>
          <div><div style={{ fontSize:11, color:T.ink3 }}>Yes</div><div style={{ fontSize:28, fontWeight:700, color:T.green }}>{yes}</div></div>
          <div><div style={{ fontSize:11, color:T.ink3 }}>Total</div><div style={{ fontSize:28, fontWeight:700 }}>{total}</div></div>
        </div>
      </div>
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:4, minHeight:20 }}>
        {log.slice(-16).map((c,i)=><span key={i} style={{ fontSize:11, fontWeight:700, color:c?T.green:T.red }}>{c?"✓":"✗"}</span>)}
      </div>
      <ActionRow>
        <Btn onClick={()=>record(true)} variant="success" style={{ flex:1 }}>✓ Complied</Btn>
        <Btn onClick={()=>record(false)} variant="danger" style={{ flex:1 }}>✗ Did not</Btn>
      </ActionRow>
    </ProgramCard>
  );
}

// ─── ABC Data Card ────────────────────────────────────────────────────────────
function ABCCard({ prog, sessionActive, onRecord, session, userId }) {  
  const [episodes, setEpisodes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [antecedent, setAntecedent] = useState("");
  const [behavior, setBehavior] = useState("");
  const [consequence, setConsequence] = useState("");

  const addEpisode = () => {
    if (!sessionActive) { onRecord(null, "Start the session first"); return; }
    setShowForm(true);
  };

  const saveEpisode = async () => {
  if (!behavior.trim()) return;
  const episode = {
    time: new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}),
    antecedent, behavior, consequence
  };
  setEpisodes(e => [...e, episode]);
  onRecord(`ABC episode ${episodes.length + 1}: ${behavior}`);
  if(session?.id) {
    await supabase.from("data_points").insert({
      session_id: session.id,
      program_id: prog.id,
      type: "abc_data",
      value: episodes.length + 1,
      antecedent: antecedent,
      behavior: behavior,
      consequence: consequence,
      recorded_at: new Date().toISOString(),
      rbt_id: userId
    });
  }
  setAntecedent(""); setBehavior(""); setConsequence("");
  setShowForm(false);
};

  const textareaStyle = {
    width:"100%", padding:"8px 12px", borderRadius:8, fontSize:12,
    border:`1px solid ${T.border2}`, background:T.bg, resize:"none",
    outline:"none", fontFamily:"inherit", color:T.ink, lineHeight:1.5,
  };

  return (
    <ProgramCard prog={prog}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:36, fontWeight:800, color:T.green, letterSpacing:"-1px" }}>{episodes.length}</div>
          <div style={{ fontSize:12, color:T.ink3 }}>episodes recorded</div>
        </div>
        <Btn onClick={addEpisode} variant="primary" style={{ padding:"8px 16px" }}>+ Record episode</Btn>
      </div>

      {/* Episode log */}
      {episodes.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
          {episodes.map((ep, i) => (
            <div key={i} style={{ background:T.bg2, borderRadius:8, padding:"10px 12px", fontSize:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontWeight:700, color:T.green }}>Episode {i+1}</span>
                <span style={{ color:T.ink3 }}>{ep.time}</span>
              </div>
              {ep.antecedent && (
                <div style={{ marginBottom:4 }}>
                  <span style={{ fontWeight:600, color:T.navy }}>A: </span>
                  <span style={{ color:T.ink2 }}>{ep.antecedent}</span>
                </div>
              )}
              <div style={{ marginBottom:4 }}>
                <span style={{ fontWeight:600, color:T.red }}>B: </span>
                <span style={{ color:T.ink2 }}>{ep.behavior}</span>
              </div>
              {ep.consequence && (
                <div>
                  <span style={{ fontWeight:600, color:T.amber }}>C: </span>
                  <span style={{ color:T.ink2 }}>{ep.consequence}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Episode form modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:T.white, borderRadius:16, padding:28, width:460, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ fontSize:16, fontWeight:800, color:T.ink, marginBottom:4 }}>Record ABC episode</div>
            <div style={{ fontSize:12, color:T.ink3, marginBottom:20 }}>{prog.name}</div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.navy, marginBottom:4 }}>A — Antecedent</div>
              <div style={{ fontSize:11, color:T.ink3, marginBottom:6 }}>What happened immediately before the behavior?</div>
              <textarea rows={2} value={antecedent} onChange={e=>setAntecedent(e.target.value)}
                placeholder="e.g. Teacher gave a demand, transition to new activity…"
                style={textareaStyle} />
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.red, marginBottom:4 }}>B — Behavior *</div>
              <div style={{ fontSize:11, color:T.ink3, marginBottom:6 }}>Describe the behavior objectively</div>
              <textarea rows={2} value={behavior} onChange={e=>setBehavior(e.target.value)}
                placeholder="e.g. Client hit table 3 times with open hand…"
                style={{ ...textareaStyle, border:`1px solid ${behavior?T.border2:T.red}30` }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.amber, marginBottom:4 }}>C — Consequence</div>
              <div style={{ fontSize:11, color:T.ink3, marginBottom:6 }}>What happened immediately after?</div>
              <textarea rows={2} value={consequence} onChange={e=>setConsequence(e.target.value)}
                placeholder="e.g. Demand was removed, peer moved away…"
                style={textareaStyle} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn onClick={()=>{ setShowForm(false); setAntecedent(""); setBehavior(""); setConsequence(""); }} style={{ flex:1 }}>Cancel</Btn>
              <Btn onClick={saveEpisode} variant="primary" disabled={!behavior.trim()} style={{ flex:1 }}>Save episode</Btn>
            </div>
          </div>
        </div>
      )}
    </ProgramCard>
  );
}

// ─── Scatterplot Card ─────────────────────────────────────────────────────────
function ScatterplotCard({ prog, sessionActive, onRecord, session, userId }) {  
  const startHour = prog.scatter_start_hour ?? 8;
  const endHour = prog.scatter_end_hour ?? 17;
  const blockMins = prog.scatter_block_mins ?? 30;
  const blocksPerHour = 60 / blockMins;
  const totalBlocks = (endHour - startHour) * blocksPerHour;

  const [counts, setCounts] = useState(() => Array(totalBlocks).fill(0));

  const getCurrentBlock = () => {
    const now = new Date();
    const mins = (now.getHours() - startHour) * 60 + now.getMinutes();
    const block = Math.floor(mins / blockMins);
    return Math.max(0, Math.min(block, totalBlocks - 1));
  };

  const recordInCurrentBlock = async () => {
  if (!sessionActive) { onRecord(null, "Start the session first"); return; }
  const block = getCurrentBlock();
  setCounts(c => {
    const next = [...c];
    next[block] = next[block] + 1;
    return next;
  });
  onRecord(`Scatterplot: block ${block + 1} recorded`);
  if(session?.id) {
    await supabase.from("data_points").insert({
      session_id: session.id,
      program_id: prog.id,
      type: "scatterplot",
      value: 1,
      block_index: block,
      recorded_at: new Date().toISOString(),
      rbt_id: userId
    });
  }
};

  const blockLabel = (i) => {
    const totalMins = startHour * 60 + i * blockMins;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
  };

  const maxCount = Math.max(...counts, 1);
  const totalOccurrences = counts.reduce((a,b)=>a+b, 0);
  const currentBlock = getCurrentBlock();

  const blockColor = (count) => {
    if (count === 0) return T.bg2;
    const intensity = count / maxCount;
    if (intensity < 0.33) return "#FEF9C3";
    if (intensity < 0.66) return "#FDE68A";
    return "#FCA5A5";
  };

  return (
    <ProgramCard prog={prog}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:36, fontWeight:800, color:T.amber, letterSpacing:"-1px" }}>{totalOccurrences}</div>
          <div style={{ fontSize:12, color:T.ink3 }}>total occurrences today</div>
        </div>
        <Btn onClick={recordInCurrentBlock} variant="primary" style={{ padding:"8px 16px" }}>+ Record now</Btn>
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:12, marginBottom:12, fontSize:11, color:T.ink3 }}>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ width:12, height:12, borderRadius:2, background:T.bg2, border:`1px solid ${T.border2}` }}/>None
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ width:12, height:12, borderRadius:2, background:"#FEF9C3" }}/>Low
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ width:12, height:12, borderRadius:2, background:"#FDE68A" }}/>Medium
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ width:12, height:12, borderRadius:2, background:"#FCA5A5" }}/>High
        </div>
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${blocksPerHour}, 1fr)`, gap:3 }}>
        {counts.map((count, i) => (
          <div key={i}
            onClick={async () => {
            if (!sessionActive) return;
            setCounts(c => { const next=[...c]; next[i]=next[i]+1; return next; });
            onRecord(`Scatterplot: ${blockLabel(i)} recorded`);
            if(session?.id) {
              await supabase.from("data_points").insert({
                session_id: session.id,
                program_id: prog.id,
                type: "scatterplot",
                value: 1,
                block_index: i,
                recorded_at: new Date().toISOString(),
                rbt_id: userId
              });
            }
          }}
            title={`${blockLabel(i)}: ${count} occurrence${count!==1?"s":""}`}
            style={{
              height:32, borderRadius:4, background:blockColor(count),
              border:`2px solid ${i===currentBlock?"#000":"transparent"}`,
              cursor:sessionActive?"pointer":"default",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:10, fontWeight:700, color:count>0?T.ink3:"transparent",
              transition:"all .15s"
            }}>
            {count > 0 ? count : ""}
          </div>
        ))}
      </div>

      {/* Hour labels */}
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        {Array.from({length:endHour-startHour+1},(_,i)=>{
          const h = startHour + i;
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
          return <div key={i} style={{ fontSize:9, color:T.ink3 }}>{h12}{ampm}</div>;
        })}
      </div>

      <div style={{ marginTop:10, fontSize:11, color:T.ink3, textAlign:"center" }}>
        Current block: <strong>{blockLabel(currentBlock)}</strong> · Click any block to record manually
      </div>
    </ProgramCard>
  );
}

// ─── Permanent Product Card ───────────────────────────────────────────────────
function PermanentProductCard({ prog, sessionActive, onRecord, session, userId }) {  
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);

  const record = async () => {
    if (!sessionActive) { onRecord(null, "Start the session first"); return; }
    const time = new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    const newCount = count + 1;
    setCount(newCount);
    setItems(i => [...i, { time, n: newCount }]);
    onRecord(`Permanent product #${newCount} recorded`);
    if(session?.id) {
      await supabase.from("data_points").insert({
        session_id: session.id,
        program_id: prog.id,
        type: "permanent_product",
        value: newCount,
        recorded_at: new Date().toISOString(),
        rbt_id: userId
      });
    }
  };

  const atTarget = prog.direction==="decrease" ? count <= prog.target_val : count >= prog.target_val;

  return (
    <ProgramCard prog={prog}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:64, fontWeight:800, letterSpacing:"-2px", lineHeight:1, color:prog.target_val?(atTarget?T.green:T.amber):T.ink2 }}>
            {count}
          </div>
          <div style={{ fontSize:12, color:T.ink3, marginTop:6 }}>
            {prog.target ? `Target: ${prog.target}` : "products recorded"}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <Btn onClick={record} variant="primary" style={{ padding:"8px 16px" }}>+ Record</Btn>
          <Btn onClick={()=>count>0&&setCount(c=>c-1)} style={{ padding:"8px 16px" }}>↩ Undo</Btn>
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
          {items.map((item, i) => (
            <span key={i} style={{ fontSize:11, padding:"3px 10px", borderRadius:99, background:T.bg2, color:T.ink3, fontWeight:500 }}>
              #{item.n} · {item.time}
            </span>
          ))}
        </div>
      )}
    </ProgramCard>
  );
}

// ─── Session view ─────────────────────────────────────────────────────────────
function SessionView({ programs, sessionActive, onRecord, pendingSessions=[], onDocumentSession, currentSession, userId }) {  
  const typeOrder = ["frequency","duration","interval","rate","latency"];
  const sorted = [...programs].sort((a,b)=>typeOrder.indexOf(a.type)-typeOrder.indexOf(b.type));
  return (
    <div>
      {pendingSessions.length>0 && (
        <div style={{ background:T.amberLt, border:`1px solid ${T.amberMd}40`, borderRadius:12, padding:"16px 20px", marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.amber, marginBottom:10 }}>
            {pendingSessions.length} session{pendingSessions.length>1?"s":""} pending documentation
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {pendingSessions.map(s=>(
              <div key={s.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fff", borderRadius:8, padding:"10px 14px" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{new Date(s.started_at).toLocaleDateString()} · {new Date(s.started_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                  <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>Duration: {fmtHMS(s.duration_secs||0)}</div>
                </div>
                <Btn onClick={()=>onDocumentSession(s)} variant="primary" style={{ padding:"7px 14px" }}>Document</Btn>
              </div>
            ))}
          </div>
        </div>
      )}
      {!sessionActive && (
        <div style={{ background:T.amberLt, border:`1px solid ${T.amberMd}40`, borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:13, color:T.amber, fontWeight:600 }}>
          ⚠ Press "Start session" below to begin recording
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))", gap:14 }}>
        {sorted.map(prog=>
          prog.type==="frequency" ? <FrequencyCard key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord} session={currentSession} userId={user?.id}/> :
          prog.type==="duration"  ? <DurationCard  key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord} session={currentSession} userId={user?.id}/> :
          prog.type==="rate"      ? <RateCard      key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord} session={currentSession} userId={user?.id}/> :
          prog.type==="partial_interval"||prog.type==="whole_interval"||prog.type==="momentary_time_sampling"||prog.type==="interval"
            ? <IntervalCard key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord} session={currentSession} userId={user?.id}/> :
          prog.type==="abc_data"  ? <ABCCard       key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord} session={currentSession} userId={user?.id}/> :
          prog.type==="scatterplot" ? <ScatterplotCard key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord} session={currentSession} userId={user?.id}/> :
          prog.type==="permanent_product" ? <PermanentProductCard key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={onRecord} session={currentSession} userId={user?.id}/> : null
        )}
      </div>
      <Card style={{ marginTop:16 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Session notes</div>
        <textarea rows={3} placeholder="Clinical observations, antecedents, consequences, environmental factors…"
          style={{ width:"100%", border:`1px solid ${T.border2}`, borderRadius:8, padding:"10px 14px", fontSize:13, color:T.ink, background:T.bg, resize:"vertical", outline:"none", lineHeight:1.6 }}/>
      </Card>
    </div>
  );
}

// ─── Programs view ────────────────────────────────────────────────────────────
function ProgramsView({ programs, profile }) {
  const canManage = profile?.is_independent || profile?.role === 'bcba';
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:13, color:T.ink3, fontWeight:500 }}>{programs.length} active programs</div>
        {canManage && <Btn variant="primary" style={{ padding:"8px 16px" }}>+ Add program</Btn>}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {programs.map(prog=>(
          <Card key={prog.id} style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 20px" }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <div style={{ fontSize:15, fontWeight:700 }}>{prog.name}</div>
                <Badge type={prog.type} />
              </div>
              <div style={{ fontSize:12, color:T.ink3 }}>{prog.description}</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ ...S.label, marginBottom:2 }}>Target</div>
              <div style={{ fontSize:13, fontWeight:600 }}>{prog.target}</div>
            </div>
            <span style={{ ...S.badge(T.green,T.greenLt), fontSize:11 }}>Active</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Patients view ────────────────────────────────────────────────────────────
function PatientsView({ patients, programsByPatient, selectedId, onSelect, onSwitch }) {
  const [search, setSearch] = useState("");
  const filtered = patients.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:12 }}>
        <div style={{ fontSize:13, color:T.ink3, fontWeight:500 }}>{patients.length} patients</div>
        <input placeholder="Search patient…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ fontSize:13, padding:"8px 14px", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, outline:"none", width:200 }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
        {filtered.map(p=>{
          const progs=programsByPatient[p.id]||[], selected=p.id===selectedId;
          return (
            <Card key={p.id} onClick={()=>onSelect(p.id)}
              style={{ cursor:"pointer", border:`${selected?"2px":"1px"} solid ${selected?T.green:T.border}`,
                background:selected?T.greenLt:T.white, transition:"all .15s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:p.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:"#fff", flexShrink:0 }}>{p.initials}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700 }}>{p.name}</div>
                  <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>Age {age(p.dob)}</div>
                </div>
              </div>
              <div style={{ fontSize:11, color:T.ink3, marginBottom:8 }}>{p.diagnosis}</div>
              <div style={{ fontSize:11, color:T.ink3, marginBottom:10 }}>BCBA: {p.bcba}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {progs.slice(0,3).map(pr=><span key={pr.id} style={{ ...S.badge(T.ink3,T.bg2), fontSize:10 }}>{pr.name.split(" ")[0]}</span>)}
                {progs.length>3&&<span style={{ ...S.badge(T.ink3,T.bg2), fontSize:10 }}>+{progs.length-3}</span>}
              </div>
              <button onClick={()=>{ console.log("switch clicked", p.id); onSwitch && onSwitch(p.id); }}
                style={{ width:"100%", padding:"7px 0", borderRadius:8, border:`1px solid ${selected?T.green:T.border2}`, background:selected?T.green:"transparent", color:selected?"#fff":T.ink2, fontSize:12, fontWeight:600, cursor:"pointer", marginTop:10 }}>
                {selected ? "✓ Current patient" : "Switch to this patient"}
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({ title, color, data, labels, targetVal, targetLabel, suffix="" }) {
  if(!data||!data.length)return null;
  const max = Math.max(...data,targetVal)*1.15;
  const W=300,H=130,P={t:10,r:10,b:30,l:36};
  const cW=W-P.l-P.r, cH=H-P.t-P.b;
  const xPos=i=>P.l+(i/(data.length-1))*cW;
  const yPos=v=>P.t+cH-(v/max)*cH;
  const pts=data.map((v,i)=>`${xPos(i)},${yPos(v)}`).join(" ");
  const area=`M${xPos(0)},${yPos(data[0])} `+data.map((v,i)=>`L${xPos(i)},${yPos(v)}`).join(" ")+` L${xPos(data.length-1)},${P.t+cH} L${xPos(0)},${P.t+cH} Z`;
  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:700 }}>{title}</div>
        <span style={{ ...S.badge(color,`${color}18`), fontSize:11 }}>{targetLabel}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
        {[0,.5,1].map(f=><line key={f} x1={P.l} x2={P.l+cW} y1={P.t+cH*(1-f)} y2={P.t+cH*(1-f)} stroke={T.border} strokeWidth={1}/>)}
        <line x1={P.l} x2={P.l+cW} y1={yPos(targetVal)} y2={yPos(targetVal)} stroke={color} strokeWidth={1.5} strokeDasharray="5 3" opacity={.6}/>
        <path d={area} fill={`${color}14`}/>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
        {data.map((v,i)=><circle key={i} cx={xPos(i)} cy={yPos(v)} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5}/>)}
        {labels.filter((_,i)=>i%Math.ceil(labels.length/5)===0||i===labels.length-1).map(l=>{
          const idx=labels.indexOf(l);
          return <text key={l} x={xPos(idx)} y={H-4} fontSize={9} textAnchor="middle" fill={T.ink3}>{l}</text>;
        })}
        {[0,.5,1].map(f=>{
          const v=max*f;
          return <text key={f} x={P.l-4} y={P.t+cH*(1-f)+3} fontSize={9} textAnchor="end" fill={T.ink3}>{Math.round(v)}{suffix}</text>;
        })}
      </svg>
    </Card>
  );
}

// ─── Dashboard view ───────────────────────────────────────────────────────────
function DashboardView({ patient }) {
  const [sessions, setSessions] = useState([]);
  const [dataPoints, setDataPoints] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient) return;
    loadDashboard();
  }, [patient]);

  const loadDashboard = async () => {
    setLoading(true);

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('patient_id', patient.id)
      .order('started_at', { ascending: true });

    const { data: progData } = await supabase
      .from('programs')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('status', 'active');

    let dpData = [];
if (sessionData?.length) {
  const ids = sessionData.map(s => s.id);
  const { data: fetchedDp } = await supabase
    .from('data_points')
    .select('*')
    .in('session_id', ids)
    .order('recorded_at', { ascending: true });
  dpData = fetchedDp || [];
}

console.log("Sessions:", sessionData?.length, "Programs:", progData?.length, "DataPoints:", dpData.length);
setSessions(sessionData || []);
setPrograms(progData || []);
setDataPoints(dpData);
setLoading(false);
  };

  if (loading) return <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>Loading analytics…</div>;

  if (!sessions.length) return (
    <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
      <div style={{ fontSize:18, fontWeight:700, color:T.ink2 }}>No sessions yet</div>
      <div style={{ fontSize:13, marginTop:6 }}>Start recording sessions to see analytics here</div>
    </div>
  );

  const fmtHMS = (s) => s ? `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}` : "—";

  // Build per-session aggregates for each program
  const getSeriesForProgram = (prog) => {
    return sessions.map(session => {
      const pts = dataPoints.filter(d => d.session_id === session.id && d.program_id === prog.id);
      if (!pts.length) return { date: new Date(session.started_at).toLocaleDateString('en-US',{month:'numeric',day:'numeric'}), value: null };
      let value;
      if (prog.type === 'frequency') value = pts.length;
      else if (prog.type === 'duration') value = pts.reduce((s,d) => s + (d.value||0), 0);
      else if (prog.type === 'rate') {
        const yes = pts.filter(d=>d.value===1).length;
        value = pts.length > 0 ? Math.round((yes/pts.length)*100) : null;
      }
      else if (prog.type === 'latency') value = Math.round(pts.reduce((s,d)=>s+(d.value||0),0)/pts.length);
      return { date: new Date(session.started_at).toLocaleDateString('en-US',{month:'numeric',day:'numeric'}), value };
    }).filter(d => d.value !== null);
  };

  const totalSessions = sessions.length;
  const documented = sessions.filter(s=>s.documentation_status==='documented').length;
  const avgDuration = sessions.length ? Math.round(sessions.reduce((s,d)=>s+(d.duration_secs||0),0)/sessions.length) : 0;
  const lastSession = sessions[sessions.length-1];

  const metrics = [
    { label:"Total sessions",     value:totalSessions, color:T.navy  },
    { label:"Documented",         value:`${documented}/${totalSessions}`, color:T.green },
    { label:"Avg duration",       value:fmtHMS(avgDuration), color:T.amber },
    { label:"Last session",       value:lastSession ? new Date(lastSession.started_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : "—", color:T.navy },
  ];

  return (
    <div>
      {/* Patient header */}
      <Card style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20, padding:"16px 20px" }}>
        <div style={{ width:52, height:52, borderRadius:"50%", background:patient.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:"#fff" }}>{patient.initials}</div>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>{patient.name}</div>
          <div style={{ fontSize:13, color:T.ink3, marginTop:2 }}>Age {age(patient.dob)} · {patient.diagnosis} · BCBA: {patient.bcba}</div>
        </div>
      </Card>

      {/* Metrics */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {metrics.map((m,i)=>(
          <Card key={i} style={{ padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:m.color, letterSpacing:"-1px" }}>{m.value}</div>
          </Card>
        ))}
      </div>

      {/* Charts per program */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {programs.map(prog => {
          const series = getSeriesForProgram(enrichProg(prog));
          const ep = enrichProg(prog);
          const suffix = prog.type==='rate' ? '%' : prog.type==='duration' ? 's' : '';
          return (
            <ChartCard
              key={prog.id}
              title={prog.name}
              color={ep.color}
              data={series.map(d=>d.value)}
              labels={series.map(d=>d.date)}
              targetVal={prog.target_val || 0}
              targetLabel={prog.target || ""}
              suffix={suffix}
            />
          );
        })}
      </div>

      {/* Session log */}
      <Card style={{ marginTop:14 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Session history</div>
        {sessions.slice().reverse().slice(0,8).map((s,i,arr)=>(
          <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{new Date(s.started_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
              <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>{s.rbt_name} · {new Date(s.started_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, fontWeight:600 }}>{fmtHMS(s.duration_secs)}</div>
              <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99, background:s.documentation_status==="documented"?T.greenLt:T.amberLt, color:s.documentation_status==="documented"?T.green:T.amber }}>
                {s.documentation_status==="documented"?"✓ Documented":"⏳ Pending"}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Reports view ─────────────────────────────────────────────────────────────
function ReportsView({ patient }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      <Card>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Weekly progress report</div>
        <div style={{ fontSize:12, color:T.ink3, marginBottom:16 }}>Auto-generated</div>
        <div style={{ fontSize:13, lineHeight:1.8 }}>
          <div>Patient: <strong>{patient.name}</strong></div>
          <div>BCBA: <strong>{patient.bcba}</strong></div>
        </div>
        <div style={{ background:T.greenLt, borderRadius:8, padding:"12px 14px", marginTop:14, fontSize:12, color:T.green, lineHeight:1.6 }}>
          <strong>Clinical summary:</strong> SIB frequency decreased 75% from baseline. Compliance trending toward 80% target.
        </div>
        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          <Btn variant="primary" style={{ flex:1 }}>⬇ Export PDF</Btn>
          <Btn style={{ flex:1 }}>Share</Btn>
        </div>
      </Card>
      <Card>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Session log</div>
        {[{date:"May 26",time:"9:00 AM",duration:"60 min"},{date:"May 24",time:"2:00 PM",duration:"55 min"},{date:"May 22",time:"9:00 AM",duration:"60 min"},{date:"May 21",time:"2:30 PM",duration:"58 min"},{date:"May 19",time:"9:00 AM",duration:"60 min"}].map((s,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<4?`1px solid ${T.border}`:"none", fontSize:13 }}>
            <div><strong>{s.date}</strong> · {s.time}</div>
            <div style={{ color:T.ink3 }}>{s.duration}</div>
            <span style={{ ...S.badge(T.green,T.greenLt), fontSize:11 }}>✓ Complete</span>
          </div>
        ))}
        <Btn style={{ width:"100%", marginTop:14 }}>⬇ Export CSV</Btn>
      </Card>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App({ user, profile, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [programsByPatient, setProgramsByPatient] = useState({});
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("session");
  const [sessionActive, setSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [toast, setToast] = useState("");
  const [showSessionNote, setShowSessionNote] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);
  const [pendingSessions, setPendingSessions] = useState([]);
  const timerRef = useRef(null);
  const toastRef = useRef(null);

  useEffect(()=>{ loadData(); },[]);
  useEffect(() => {
  window.history.pushState({ view: "session" }, "", window.location.href);
}, []);

useEffect(() => {
  if (view !== "session") {
    window.history.pushState({ view }, "", window.location.href);
  }
}, [view]);

useEffect(() => {
  const handlePopState = (e) => {
    if (e.state?.view) {
      setView(e.state.view);
    } else {
      window.history.pushState({ view }, "", window.location.href);
    }
  };
  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, [view]);
  useEffect(()=>{ loadPendingSessions(); },[selectedPatientId]);

  const loadData = async () => {
    setLoading(true);
    const { data: patientsData } = await supabase.from('patients').select('*').order('name');
    const { data: programsData } = await supabase.from('programs').select('*').eq('status','active');

    let filteredPatients = patientsData || [];
    if (profile?.role === 'rbt' && user) {
      const { data: assignmentData } = await supabase.from('patient_assignments').select('patient_id').eq('rbt_id', user.id);
      const ids = (assignmentData||[]).map(a=>a.patient_id);
      filteredPatients = filteredPatients.filter(p=>ids.includes(p.id));
    }

    setPatients(filteredPatients);
    if (filteredPatients.length>0) setSelectedPatientId(filteredPatients[0].id);

    if (programsData) {
      const grouped={};
      programsData.forEach(p=>{ if(!grouped[p.patient_id])grouped[p.patient_id]=[]; grouped[p.patient_id].push(enrichProg(p)); });
      setProgramsByPatient(grouped);
    }
    setLoading(false);
  };

  const loadPendingSessions = async () => {
    if(!selectedPatientId)return;
    const { data } = await supabase.from('sessions').select('*').eq('patient_id',selectedPatientId).eq('documentation_status','pending').order('started_at',{ascending:false});
    setPendingSessions(data||[]);
  };

  const showToast = useCallback((msg,err)=>{
    setToast(err||msg); clearTimeout(toastRef.current);
    toastRef.current=setTimeout(()=>setToast(""),2500);
  },[]);

const startSession = async () => {
  const { data: session } = await supabase.from("sessions").insert({
    patient_id: selectedPatientId,
    rbt_name: profile?.full_name || "RBT",
    started_at: new Date().toISOString(),
    documentation_status: "pending"
  }).select().single();
  setCurrentSession(session);
  setSessionActive(true);
  setSessionSecs(0);
  timerRef.current = setInterval(()=>setSessionSecs(s=>s+1), 1000);
  showToast("Session started");
};

const endSession = async () => {
  setSessionActive(false); clearInterval(timerRef.current);
  let saved = currentSession;
  if(currentSession) {
    const { data } = await supabase.from("sessions").update({
      ended_at: new Date().toISOString(),
      duration_secs: sessionSecs,
      documentation_status: "pending"
    }).eq("id", currentSession.id).select().single();
    saved = data;
  } else if(selectedPatientId) {
    const { data } = await supabase.from("sessions").insert({
      patient_id: selectedPatientId,
      rbt_name: profile?.full_name||user?.email||"RBT",
      ended_at: new Date().toISOString(),
      duration_secs: sessionSecs,
      documentation_status: "pending"
    }).select().single();
    saved = data;
  }
  setCurrentSession(null);
  setCompletedSession(saved);
  setShowSessionNote(true);
  loadPendingSessions();
};

  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const patient = patients.find(p=>p.id===selectedPatientId);
  const patientPrograms = programsByPatient[selectedPatientId]||[];

  const NAV = [
    {id:"session",label:"Session",icon:"⏺"},
    {id:"programs",label:"Programs",icon:"📋"},
    {id:"patients",label:"Patients",icon:"👥"},
    {id:"dashboard",label:"Dashboard",icon:"📊"},
    {id:"reports",label:"Reports",icon:"📄"},
  ];
  const viewTitles={session:"Session recording",programs:"Treatment programs",patients:"Patients",dashboard:"BCBA dashboard",reports:"Reports & exports"};

  if(loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:16,background:T.bg,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{fontSize:32,fontWeight:800,color:T.navy,letterSpacing:"-1px"}}>ABA Collect</div>
      <div style={{fontSize:13,color:T.ink3}}>Loading…</div>
    </div>
  );

  if(!patient) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:12,background:T.bg,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{fontSize:24,fontWeight:700,color:T.amber}}>No patients found</div>
      <div style={{fontSize:13,color:T.ink3}}>Check your Supabase connection or patient assignments</div>
    </div>
  );

  if(showSessionNote&&completedSession&&patient) return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'Inter',system-ui,sans-serif",background:T.bg}}>
      <style>{CSS}</style>
      <div style={{flex:1,overflowY:"auto",padding:32,maxWidth:"100%",margin:"0 auto",width:"100%"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
          <div style={{fontSize:22,fontWeight:800,color:T.navy,letterSpacing:"-1px"}}>ABA Collect</div>
          <div style={{fontSize:13,color:T.ink3}}>— Session note</div>
        </div>
        <SessionNote session={completedSession} patient={patient} programs={patientPrograms} user={user}
          onComplete={async()=>{
            if(completedSession){ await supabase.from('sessions').update({documentation_status:'documented'}).eq('id',completedSession.id); }
            setShowSessionNote(false); setCompletedSession(null); loadPendingSessions(); showToast("Note saved ✓");
          }}
          onSkip={()=>{ setShowSessionNote(false); setCompletedSession(null); showToast("Session ended · Note skipped"); }}
        />
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'Inter',system-ui,sans-serif",background:T.bg}}>
      <style>{CSS}</style>

      {/* Sidebar */}
      <div style={{width:232,background:T.navy,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"24px 20px 20px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{fontSize:17,fontWeight:800,color:"#fff",letterSpacing:"-0.5px"}}>ABA Collect</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginTop:3,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase"}}>RBT Platform</div>
          {profile && (
            <div style={{marginTop:14,padding:"10px 12px",background:"rgba(255,255,255,.07)",borderRadius:8,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:T.greenMd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>
                {profile.full_name?.[0]?.toUpperCase()||"?"}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{profile.full_name}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.45)",marginTop:1,textTransform:"uppercase",letterSpacing:".05em"}}>{profile.role?.replace("_"," ")}</div>
              </div>
            </div>
          )}
        </div>

<div style={{padding:"8px 12px",flex:1,overflowY:"auto",minHeight:0}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,.35)",letterSpacing:".08em",textTransform:"uppercase",padding:"8px 8px 6px",fontWeight:700}}>Workspace</div>
          {NAV.slice(0,3).map(n=>(
            <div key={n.id} onClick={()=>setView(n.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:view===n.id?700:400,color:view===n.id?"#fff":"rgba(255,255,255,.6)",background:view===n.id?"rgba(255,255,255,.12)":"transparent",marginBottom:2,transition:"all .15s"}}>
              <span style={{fontSize:14,opacity:view===n.id?1:.7}}>{n.icon}</span>{n.label}
            </div>
          ))}
          <div style={{fontSize:10,color:"rgba(255,255,255,.35)",letterSpacing:".08em",textTransform:"uppercase",padding:"14px 8px 6px",fontWeight:700}}>Analysis</div>
          {NAV.slice(3).map(n=>(
            <div key={n.id} onClick={()=>setView(n.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:view===n.id?700:400,color:view===n.id?"#fff":"rgba(255,255,255,.6)",background:view===n.id?"rgba(255,255,255,.12)":"transparent",marginBottom:2,transition:"all .15s"}}>
              <span style={{fontSize:14,opacity:view===n.id?1:.7}}>{n.icon}</span>{n.label}
            </div>
          ))}
        </div>

        {/* Patient pill */}
        <div style={{padding:"12px",borderTop:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:8,fontWeight:700,padding:"0 4px"}}>Current patient</div>
          <div onClick={()=>setView("patients")} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,background:"rgba(255,255,255,.08)",cursor:"pointer",border:"1px solid rgba(255,255,255,.08)",transition:"all .15s"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:patient.color||T.navyMd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{patient.initials}</div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{patient.name}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.45)",marginTop:1}}>{patient.diagnosis}</div>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div style={{padding:"8px 12px 16px"}}>
          <button onClick={onLogout} style={{width:"100%",padding:"8px 0",borderRadius:8,border:"1px solid rgba(255,255,255,.12)",background:"transparent",fontSize:12,fontWeight:500,cursor:"pointer",color:"rgba(255,255,255,.5)"}}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{padding:"16px 28px",borderBottom:`1px solid ${T.border}`,background:T.white,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:T.ink,letterSpacing:"-0.5px"}}>{viewTitles[view]}</div>
            <div style={{fontSize:12,color:T.ink3,marginTop:3}}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {sessionActive ? (
              <span style={{display:"inline-flex",alignItems:"center",gap:6,background:T.greenLt,color:T.green,fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:99,border:`1px solid ${T.greenMd}30`}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:T.greenMd,animation:"pulse 1.2s infinite",display:"inline-block"}}/> Live
              </span>
            ) : (
              <span style={{display:"inline-flex",alignItems:"center",gap:6,background:T.bg2,color:T.ink3,fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:99}}>Ready</span>
            )}
            <Btn onClick={()=>setView("dashboard")} style={{padding:"8px 16px"}}>📊 BCBA view</Btn>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:28}}>
          {view==="session"&&<SessionView programs={patientPrograms} sessionActive={sessionActive} onRecord={showToast} pendingSessions={pendingSessions} onDocumentSession={s=>{setCompletedSession(s);setShowSessionNote(true);}} currentSession={currentSession} userId={user?.id}/>}          {view==="programs"&&<ProgramsView programs={patientPrograms} profile={profile}/>}
          {view==="patients"&&<PatientsView patients={patients} programsByPatient={programsByPatient} selectedId={selectedPatientId} onSelect={id=>{setSelectedPatientId(id);showToast(`Switched to ${patients.find(p=>p.id===id)?.name}`);}} onSwitch={id=>{setSelectedPatientId(id);setView("session");showToast(`Switched to ${patients.find(p=>p.id===id)?.name}`);}}/>}          {view==="dashboard"&&<DashboardView patient={patient}/>}
          {view==="reports"&&<ReportsView patient={patient}/>}
        </div>

        {/* Session bar */}
        {view==="session"&&(
          <div style={{padding:"14px 28px",borderTop:`1px solid ${T.border}`,background:T.white,display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:26,fontWeight:800,fontVariantNumeric:"tabular-nums",letterSpacing:"-1px",color:sessionActive?T.green:T.ink3}}>{fmtHMS(sessionSecs)}</div>
            <div style={{fontSize:12,color:T.ink3,fontWeight:500}}>{sessionActive?"Session in progress":"Session not started"}</div>
            <div style={{flex:1}}/>
            {sessionActive&&<Btn onClick={endSession} variant="danger">⏹ End session</Btn>}
            {!sessionActive&&<Btn onClick={startSession} variant="success">▶ Start session</Btn>}
          </div>
        )}
      </div>

      <Toast msg={toast}/>
    </div>
  );
}

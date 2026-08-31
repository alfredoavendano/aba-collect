import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import SessionNote from "./SessionNote";

const T = {
  navy:"#0F2744",navyLt:"#E8EEF5",navyMd:"#1A3D6B",
  green:"#0D6E4E",greenLt:"#E6F5F0",greenMd:"#18A274",
  red:"#B91C1C",redLt:"#FEF2F2",redMd:"#DC2626",
  amber:"#92400E",amberLt:"#FFFBEB",amberMd:"#D97706",
  purple:"#4C1D95",purpleLt:"#F5F3FF",purpleMd:"#7C3AED",
  ink:"#0F172A",ink2:"#334155",ink3:"#64748B",
  bg:"#F8F9FB",bg2:"#F1F3F7",white:"#FFFFFF",
  border:"rgba(15,23,42,.08)",border2:"rgba(15,23,42,.14)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,sans-serif;background:${T.bg};color:${T.ink};-webkit-font-smoothing:antialiased}
  button{font-family:inherit;cursor:pointer;transition:opacity .12s,transform .12s}
  button:hover{opacity:.85} button:active{transform:scale(.98)}
  input,textarea,select{font-family:inherit}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}
`;

const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const fmtHMS = (s) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const age = (dob) => dob ? Math.floor((Date.now()-new Date(dob))/(365.25*864e5)) : "—";

const typeInfo = {
  frequency:{ label:"Frequency", color:T.red,    bg:T.redLt    },
  duration: { label:"Duration",  color:T.amber,  bg:T.amberLt  },
  interval: { label:"Interval",  color:T.purple, bg:T.purpleLt },
  rate:     { label:"Rate",      color:T.green,  bg:T.greenLt  },
  latency:  { label:"Latency",   color:T.navy,   bg:T.navyLt   },
};

const enrichProg = (p) => ({ ...p, color:typeInfo[p.type]?.color||T.ink3, colorLt:typeInfo[p.type]?.bg||T.bg2 });

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
};

function Btn({ onClick, children, variant="secondary", disabled, style={} }) {
  const v = {
    primary:  { background:T.navy,  color:"#fff", border:"none" },
    success:  { background:T.green, color:"#fff", border:"none" },
    danger:   { background:T.redLt, color:T.red,  border:`1px solid ${T.red}30` },
    secondary:{ background:T.white, color:T.ink2, border:`1px solid ${T.border2}` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...v[variant], padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:600,
        display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        opacity:disabled?.5:1, cursor:disabled?"not-allowed":"pointer", ...style }}>
      {children}
    </button>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 24px", ...style }}>{children}</div>;
}

function Badge({ type }) {
  const t = typeInfo[type]||{ label:type, color:T.ink3, bg:T.bg2 };
  return <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99, background:t.bg, color:t.color }}>{t.label}</span>;
}

function PatientFormModal({ patient, onClose, onSave }) {
  const [name, setName] = useState(patient?.name||"");
  const [initials, setInitials] = useState(patient?.initials||"");
  const [dob, setDob] = useState(patient?.dob?.split("T")[0]||"");
  const [diagnosis, setDiagnosis] = useState(patient?.diagnosis||"");
  const [color, setColor] = useState(patient?.color||"#378ADD");
  const [saving, setSaving] = useState(false);
  const COLORS = ["#378ADD","#1D9E75","#E24B4A","#EF9F27","#7F77DD","#D85A30"];
  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:8, fontSize:13, border:`1px solid ${T.border2}`, background:T.white, outline:"none", color:T.ink, fontFamily:"inherit" };

  const handleSave = async () => {
    if (!name||!initials) return;
    setSaving(true);
    await onSave({ id:patient?.id, name, initials, dob:dob||null, diagnosis, color });
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:T.white, borderRadius:16, padding:32, width:"min(460px, calc(100vw - 32px))", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:18, fontWeight:800, color:T.ink, marginBottom:24 }}>{patient?"Edit patient":"New patient"}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Full name *</div>
            <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} placeholder="John Smith" />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Initials *</div>
            <input value={initials} onChange={e=>setInitials(e.target.value.toUpperCase())} style={inputStyle} placeholder="JS" maxLength={3} />
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Date of birth</div>
            <input type="date" value={dob} onChange={e=>setDob(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Diagnosis</div>
            <input value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} style={inputStyle} placeholder="ASD Level 2" />
          </div>
        </div>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:8 }}>Color</div>
          <div style={{ display:"flex", gap:8 }}>
            {COLORS.map(c=><div key={c} onClick={()=>setColor(c)} style={{ width:32, height:32, borderRadius:"50%", background:c, cursor:"pointer", border:`3px solid ${color===c?"#000":"transparent"}`, transition:"border .15s" }}/>)}
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={!name||!initials||saving}
            style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", background:T.navy, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            {saving?"Saving…":patient?"Save changes":"Create patient"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgramFormModal({ patientId, program, onClose, onSave }) {
  const [name, setName] = useState(program?.name||"");
  const [type, setType] = useState(program?.type||"frequency");
  const [description, setDescription] = useState(program?.description||"");
  const [target, setTarget] = useState(program?.target||"");
  const [targetVal, setTargetVal] = useState(program?.target_val||"");
  const [direction, setDirection] = useState(program?.direction||"decrease");
  const [saving, setSaving] = useState(false);
  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:8, fontSize:13, border:`1px solid ${T.border2}`, background:T.white, outline:"none", color:T.ink, fontFamily:"inherit" };

  const handleSave = async () => {
    if (!name||!type) return;
    setSaving(true);
    await onSave({ id:program?.id, patient_id:patientId, name, type, description, target, target_val:parseFloat(targetVal)||null, direction, status:"active" });
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:T.white, borderRadius:16, padding:32, width:"min(480px, calc(100vw - 32px))", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:18, fontWeight:800, color:T.ink, marginBottom:24 }}>{program?"Edit program":"New program"}</div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Program name *</div>
          <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} placeholder="e.g. Self-injurious behavior" />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Data type *</div>
            <select value={type} onChange={e=>setType(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
              {Object.entries(typeInfo).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Direction</div>
            <select value={direction} onChange={e=>setDirection(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
              <option value="decrease">Decrease</option>
              <option value="increase">Increase</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Description</div>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3}
            placeholder="Brief description of this behavior or skill…"
            style={{ ...inputStyle, resize:"vertical", lineHeight:1.5 }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Target</div>
            <input value={target} onChange={e=>setTarget(e.target.value)} style={inputStyle} placeholder="e.g. < 2 per session" />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Target value</div>
            <input type="number" value={targetVal} onChange={e=>setTargetVal(e.target.value)} style={inputStyle} placeholder="e.g. 2" />
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={!name||saving}
            style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", background:T.navy, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            {saving?"Saving…":program?"Save changes":"Create program"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FrequencyCard({ prog, sessionActive, onRecord }) {
  const [count, setCount] = useState(0);
  const atTarget = prog.direction==="decrease"?count<=prog.target_val:count>=prog.target_val;
  const record = () => { if(!sessionActive){onRecord(null,"Start session first");return;} setCount(c=>c+1); onRecord(`${prog.name} ×${count+1}`); };
  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div><div style={{ fontSize:15, fontWeight:700 }}>{prog.name}</div><div style={{ fontSize:12, color:T.ink3, marginTop:4, lineHeight:1.5 }}>{prog.description}</div></div>
        <Badge type={prog.type} />
      </div>
      <div style={{ fontSize:64, fontWeight:800, color:atTarget?T.green:T.red, lineHeight:1, letterSpacing:"-2px" }}>{count}</div>
      <div style={{ fontSize:12, color:atTarget?T.green:T.amber, marginTop:6, fontWeight:500 }}>{atTarget?`✓ Within target — ${prog.target}`:`Target: ${prog.target}`}</div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        <Btn onClick={record} variant="primary" style={{ flex:1 }}>+ Record</Btn>
        <Btn onClick={()=>count>0&&setCount(c=>c-1)} style={{ flex:1 }}>↩ Undo</Btn>
      </div>
    </Card>
  );
}

function DurationCard({ prog, sessionActive, onRecord }) {
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [total, setTotal] = useState(0);
  const ref = useRef(null);
  const toggle = () => {
    if(!sessionActive){onRecord(null,"Start session first");return;}
    if(!running){setRunning(true);ref.current=setInterval(()=>setSecs(s=>s+1),1000);}
    else{clearInterval(ref.current);setTotal(t=>t+secs);setSecs(0);setRunning(false);onRecord(`${prog.name}: ${fmt(secs)}`);}
  };
  useEffect(()=>()=>clearInterval(ref.current),[]);
  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div><div style={{ fontSize:15, fontWeight:700 }}>{prog.name}</div><div style={{ fontSize:12, color:T.ink3, marginTop:4, lineHeight:1.5 }}>{prog.description}</div></div>
        <Badge type={prog.type} />
      </div>
      <div style={{ fontSize:64, fontWeight:800, lineHeight:1, letterSpacing:"-2px", color:running?T.red:T.amber }}>{fmt(secs)}</div>
      <div style={{ fontSize:12, color:T.ink3, marginTop:6 }}>Total: <strong>{fmt(total)}</strong></div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        <Btn onClick={toggle} variant={running?"danger":"primary"} style={{ flex:1 }}>{running?"⏸ Pause":"▶ Start"}</Btn>
        <Btn onClick={()=>{clearInterval(ref.current);setSecs(0);setRunning(false);}} style={{ flex:1 }}>↺ Reset</Btn>
      </div>
    </Card>
  );
}

function RateCard({ prog, sessionActive, onRecord }) {
  const [yes, setYes] = useState(0);
  const [total, setTotal] = useState(0);
  const pct = total>0?Math.round((yes/total)*100):null;
  const record = (c) => { if(!sessionActive){onRecord(null,"Start session first");return;} if(c)setYes(y=>y+1); setTotal(t=>t+1); onRecord(`${prog.name}: ${c?"✓":"✗"}`); };
  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div><div style={{ fontSize:15, fontWeight:700 }}>{prog.name}</div><div style={{ fontSize:12, color:T.ink3, marginTop:4, lineHeight:1.5 }}>{prog.description}</div></div>
        <Badge type={prog.type} />
      </div>
      <div style={{ fontSize:64, fontWeight:800, lineHeight:1, letterSpacing:"-2px", color:pct!==null?T.green:T.ink3 }}>{pct!==null?`${pct}%`:"—"}</div>
      <div style={{ fontSize:12, color:T.ink3, marginTop:6 }}>{yes} of {total} complied · Target: {prog.target}</div>
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        <Btn onClick={()=>record(true)} variant="success" style={{ flex:1 }}>✓ Complied</Btn>
        <Btn onClick={()=>record(false)} variant="danger" style={{ flex:1 }}>✗ Did not</Btn>
      </div>
    </Card>
  );
}

export default function IndependentRBT({ user, profile, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [programsByPatient, setProgramsByPatient] = useState({});
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("session");
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [toast, setToast] = useState("");
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showSessionNote, setShowSessionNote] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);
  const [pendingSessions, setPendingSessions] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredNav, setHoveredNav] = useState(null);
  const timerRef = useRef(null);
  const toastRef = useRef(null);
  const width = useWindowWidth();
  const isMobile = width < 768;

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadPendingSessions(); }, [selectedPatientId]);

  const loadData = async () => {
    setLoading(true);
    const { data: patsData } = await supabase.from("patients").select("*").eq("rbt_id", user.id).order("name");
    const { data: progsData } = await supabase.from("programs").select("*").eq("status","active");
    setPatients(patsData||[]);
    if(patsData?.length>0 && !selectedPatientId) setSelectedPatientId(patsData[0].id);
    if(progsData) {
      const grouped={};
      progsData.forEach(p=>{ if(!grouped[p.patient_id])grouped[p.patient_id]=[]; grouped[p.patient_id].push(enrichProg(p)); });
      setProgramsByPatient(grouped);
    }
    setLoading(false);
  };

  const loadPendingSessions = async () => {
    if(!selectedPatientId) return;
    const { data } = await supabase.from("sessions").select("*").eq("patient_id",selectedPatientId).eq("documentation_status","pending").order("started_at",{ascending:false});
    setPendingSessions(data||[]);
  };

  const showToast = useCallback((msg,err) => {
    setToast(err||msg); clearTimeout(toastRef.current);
    toastRef.current=setTimeout(()=>setToast(""),2500);
  },[]);

  const savePatient = async (data) => {
    if(data.id) {
      const { id, ...rest } = data;
      await supabase.from("patients").update(rest).eq("id",id);
      showToast("Patient updated ✓");
    } else {
      const { data: newPatient } = await supabase.from("patients").insert({ ...data, rbt_id:user.id }).select().single();
      if(newPatient) {
        const { data: tmpl } = await supabase.from("note_templates").select("id").eq("created_by", user.id).single();
        if(tmpl) await supabase.from("template_patient_assignments").insert({ template_id: tmpl.id, patient_id: newPatient.id });
      }
      showToast("Patient created ✓");
    }
    loadData();
  };

  const saveProgram = async (data) => {
    if(data.id) {
      const { id, ...rest } = data;
      await supabase.from("programs").update(rest).eq("id",id);
      showToast("Program updated ✓");
    } else {
      const { id, ...rest } = data;
      await supabase.from("programs").insert(rest);
      showToast("Program created ✓");
    }
    loadData();
  };

  const deleteProgram = async (id) => {
    if(!window.confirm("Delete this program?")) return;
    await supabase.from("programs").update({ status:"inactive" }).eq("id",id);
    showToast("Program deleted"); loadData();
  };

  const startSession = () => {
    setSessionActive(true); setSessionSecs(0);
    timerRef.current=setInterval(()=>setSessionSecs(s=>s+1),1000);
    showToast("Session started");
  };

  const endSession = async () => {
    setSessionActive(false); clearInterval(timerRef.current);
    let saved=null;
    if(selectedPatientId) {
      const { data } = await supabase.from("sessions").insert({
        patient_id:selectedPatientId, rbt_name:profile?.full_name||"RBT",
        ended_at:new Date().toISOString(), duration_secs:sessionSecs, documentation_status:"pending"
      }).select().single();
      saved=data;
    }
    setCompletedSession(saved); setShowSessionNote(true); loadPendingSessions();
  };

  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const patient = patients.find(p=>p.id===selectedPatientId);
  const patientPrograms = programsByPatient[selectedPatientId]||[];

  const NAV = [
    {id:"session",  label:"Session",  icon:"⏺"},
    {id:"programs", label:"Programs", icon:"📋"},
    {id:"patients", label:"Patients", icon:"👥"},
  ];

  const viewTitles = { session:"Session recording", programs:"Treatment programs", patients:"My patients" };

  if(loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:16, background:T.bg, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ fontSize:32, fontWeight:800, color:T.navy }}>ABA Collect</div>
      <div style={{ fontSize:13, color:T.ink3 }}>Loading…</div>
    </div>
  );

  if(showSessionNote&&completedSession&&patient) return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',system-ui,sans-serif", background:T.bg }}>
      <style>{CSS}</style>
      <div style={{ flex:1, overflowY:"auto", padding:32, maxWidth:"100%", width:"100%" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
          <div style={{ fontSize:22, fontWeight:800, color:T.navy }}>ABA Collect</div>
          <div style={{ fontSize:13, color:T.ink3 }}>— Session note</div>
        </div>
        <SessionNote session={completedSession} patient={patient} programs={patientPrograms} user={user}
          onComplete={async()=>{
            if(completedSession){ await supabase.from("sessions").update({documentation_status:"documented"}).eq("id",completedSession.id); }
            setShowSessionNote(false); setCompletedSession(null); loadPendingSessions(); showToast("Note saved ✓");
          }}
          onSkip={()=>{ setShowSessionNote(false); setCompletedSession(null); showToast("Session ended · Note skipped"); }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',system-ui,sans-serif", background:T.bg }}>
      <style>{CSS}</style>

      {showPatientForm && <PatientFormModal onClose={()=>setShowPatientForm(false)} onSave={async d=>{await savePatient(d);setShowPatientForm(false);}} />}
      {editingPatient && <PatientFormModal patient={editingPatient} onClose={()=>setEditingPatient(null)} onSave={async d=>{await savePatient(d);setEditingPatient(null);}} />}
      {showProgramForm && <ProgramFormModal patientId={selectedPatientId} onClose={()=>setShowProgramForm(false)} onSave={async d=>{await saveProgram(d);setShowProgramForm(false);}} />}
      {editingProgram && <ProgramFormModal patientId={selectedPatientId} program={editingProgram} onClose={()=>setEditingProgram(null)} onSave={async d=>{await saveProgram(d);setEditingProgram(null);}} />}

      {/* Sidebar */}
      <div style={{ width: isMobile ? 0 : sidebarCollapsed ? 56 : 232, background:T.navy, display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden", transition:"width .25s", position:"relative" }}>
        <div style={{ padding: sidebarCollapsed ? "16px 8px" : "24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,.08)", transition:"padding .25s" }}>
          {!sidebarCollapsed && <div style={{ fontSize:17, fontWeight:800, color:"#fff", letterSpacing:"-.5px" }}>ABA Collect</div>}
          {!sidebarCollapsed && <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:3, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase" }}>Independent RBT</div>}
          {!sidebarCollapsed && (
            <div style={{ marginTop:14, padding:"10px 12px", background:"rgba(255,255,255,.07)", borderRadius:8, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:T.greenMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>
                {profile.full_name?.[0]?.toUpperCase()||"?"}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{profile.full_name}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", marginTop:1, textTransform:"uppercase", letterSpacing:".05em" }}>INDEPENDENT RBT</div>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div style={{ width:32, height:32, borderRadius:"50%", background:T.greenMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", margin:"0 auto" }}>
              {profile.full_name?.[0]?.toUpperCase()||"?"}
            </div>
          )}
        </div>

        <div style={{ padding:"8px 8px", flex:1, overflowY:"auto" }}>
          {!sidebarCollapsed && <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", padding:"8px 8px 6px", fontWeight:700 }}>Workspace</div>}
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setView(n.id)}
              onMouseEnter={()=>sidebarCollapsed&&setHoveredNav(n.id)}
              onMouseLeave={()=>setHoveredNav(null)}
              style={{ position:"relative", display:"flex", alignItems:"center", gap:10, padding:"7px 10px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:view===n.id?700:400, color:view===n.id?"#fff":"rgba(255,255,255,.6)", background:view===n.id?"rgba(255,255,255,.12)":"transparent", marginBottom:2, transition:"all .15s", justifyContent:sidebarCollapsed?"center":"flex-start" }}>
              <span style={{ fontSize:16 }}>{n.icon}</span>
              {!sidebarCollapsed && n.label}
              {sidebarCollapsed && hoveredNav===n.id && (
                <div style={{ position:"fixed", left:64, background:"rgba(15,23,42,.95)", color:"#fff", padding:"5px 10px", borderRadius:6, fontSize:12, fontWeight:600, whiteSpace:"nowrap", zIndex:999, pointerEvents:"none" }}>
                  {n.label}
                </div>
              )}
            </div>
          ))}
        </div>

        {!isMobile && (
          <button onClick={()=>setSidebarCollapsed(c=>!c)}
            style={{ position:"fixed", left: sidebarCollapsed ? 44 : 220, top:"50%", transform:"translateY(-50%)", width:20, height:36, borderRadius:"0 6px 6px 0", background:T.navy, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.6)", fontSize:12, zIndex:10, transition:"left .25s" }}>
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        )}

        {patient && (
          <div style={{ padding:"12px", borderTop:"1px solid rgba(255,255,255,.08)" }}>
            {!sidebarCollapsed && <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8, fontWeight:700, padding:"0 4px" }}>Current patient</div>}
            <div onClick={()=>setView("patients")}
              onMouseEnter={()=>sidebarCollapsed&&setHoveredNav("patient")}
              onMouseLeave={()=>setHoveredNav(null)}
              style={{ position:"relative", display:"flex", alignItems:"center", gap:10, padding:sidebarCollapsed?"8px":"10px 12px", borderRadius:8, background:"rgba(255,255,255,.08)", cursor:"pointer", border:"1px solid rgba(255,255,255,.08)", justifyContent:sidebarCollapsed?"center":"flex-start" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:patient.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>{patient.initials}</div>
              {!sidebarCollapsed && (
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{patient.name}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.45)", marginTop:1 }}>{patient.diagnosis}</div>
                </div>
              )}
              {sidebarCollapsed && hoveredNav==="patient" && (
                <div style={{ position:"fixed", left:64, background:"rgba(15,23,42,.95)", color:"#fff", padding:"5px 10px", borderRadius:6, fontSize:12, fontWeight:600, whiteSpace:"nowrap", zIndex:999, pointerEvents:"none" }}>
                  {patient.name}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ padding:"8px 12px 16px" }}>
          <button onClick={onLogout} style={{ width:"100%", padding:"8px 0", borderRadius:8, border:"1px solid rgba(255,255,255,.12)", background:"transparent", fontSize:12, fontWeight:500, cursor:"pointer", color:"rgba(255,255,255,.5)" }}>
            {sidebarCollapsed ? "→" : "Sign out"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 28px", borderBottom:`1px solid ${T.border}`, background:T.white, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:T.ink, letterSpacing:"-.5px" }}>{viewTitles[view]}</div>
            <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {sessionActive ? (
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:T.greenLt, color:T.green, fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:99, border:`1px solid ${T.greenMd}30` }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:T.greenMd, animation:"pulse 1.2s infinite", display:"inline-block" }}/> Live
              </span>
            ) : (
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:T.bg2, color:T.ink3, fontSize:12, fontWeight:600, padding:"6px 14px", borderRadius:99 }}>Ready</span>
            )}
            {view==="patients" && <Btn onClick={()=>setShowPatientForm(true)} variant="primary">+ New patient</Btn>}
            {view==="programs" && patient && <Btn onClick={()=>setShowProgramForm(true)} variant="primary">+ New program</Btn>}
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:28 }}>
          {view==="session" && (
            <div>
              {patients.length===0 ? (
                <Card style={{ textAlign:"center", padding:60 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
                  <div style={{ fontSize:18, fontWeight:700, color:T.ink2, marginBottom:6 }}>No patients yet</div>
                  <div style={{ fontSize:13, color:T.ink3, marginBottom:20 }}>Add your first patient to start recording sessions</div>
                  <Btn onClick={()=>setView("patients")} variant="primary" style={{ margin:"0 auto" }}>Go to patients</Btn>
                </Card>
              ) : (
                <div>
                  {pendingSessions.length>0 && (
                    <div style={{ background:T.amberLt, border:`1px solid ${T.amberMd}40`, borderRadius:12, padding:"16px 20px", marginBottom:20 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:T.amber, marginBottom:10 }}>
                        {pendingSessions.length} session{pendingSessions.length>1?"s":""} pending documentation
                      </div>
                      {pendingSessions.map(s=>(
                        <div key={s.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fff", borderRadius:8, padding:"10px 14px", marginBottom:6 }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600 }}>{new Date(s.started_at).toLocaleDateString()} · {new Date(s.started_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                            <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>Duration: {fmtHMS(s.duration_secs||0)}</div>
                          </div>
                          <Btn onClick={()=>{setCompletedSession(s);setShowSessionNote(true);}} variant="primary" style={{ padding:"7px 14px" }}>Document</Btn>
                        </div>
                      ))}
                    </div>
                  )}
                  {!sessionActive && (
                    <div style={{ background:T.amberLt, border:`1px solid ${T.amberMd}40`, borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:13, color:T.amber, fontWeight:600 }}>
                      ⚠ Press "Start session" below to begin recording
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(360px,100%),1fr))", gap:14 }}>
                    {patientPrograms.map(prog=>
                      prog.type==="frequency" ? <FrequencyCard key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={showToast}/> :
                      prog.type==="duration"  ? <DurationCard  key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={showToast}/> :
                      prog.type==="rate"      ? <RateCard      key={prog.id} prog={prog} sessionActive={sessionActive} onRecord={showToast}/> : null
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {view==="programs" && (
            <div>
              {!patient ? (
                <Card style={{ textAlign:"center", padding:40, color:T.ink3 }}>Select a patient first</Card>
              ) : patientPrograms.length===0 ? (
                <Card style={{ textAlign:"center", padding:60 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                  <div style={{ fontSize:18, fontWeight:700, color:T.ink2, marginBottom:6 }}>No programs yet</div>
                  <div style={{ fontSize:13, color:T.ink3, marginBottom:20 }}>Add treatment programs for {patient.name}</div>
                  <Btn onClick={()=>setShowProgramForm(true)} variant="primary" style={{ margin:"0 auto" }}>+ Add program</Btn>
                </Card>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {patientPrograms.map(prog=>(
                    <Card key={prog.id} style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 20px" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                          <div style={{ fontSize:15, fontWeight:700 }}>{prog.name}</div>
                          <Badge type={prog.type} />
                        </div>
                        <div style={{ fontSize:12, color:T.ink3, lineHeight:1.5 }}>{prog.description}</div>
                        <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>Target: {prog.target} · {prog.direction}</div>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={()=>setEditingProgram(prog)} style={{ fontSize:12, padding:"6px 12px", borderRadius:7, border:`1px solid ${T.border2}`, background:T.white, cursor:"pointer", fontWeight:600 }}>✏️ Edit</button>
                        <button onClick={()=>deleteProgram(prog.id)} style={{ fontSize:12, padding:"6px 12px", borderRadius:7, border:`1px solid ${T.red}30`, background:T.redLt, color:T.red, cursor:"pointer", fontWeight:600 }}>Delete</button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {view==="patients" && (
            <div>
              {patients.length===0 ? (
                <Card style={{ textAlign:"center", padding:60 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
                  <div style={{ fontSize:18, fontWeight:700, color:T.ink2, marginBottom:6 }}>No patients yet</div>
                  <Btn onClick={()=>setShowPatientForm(true)} variant="primary" style={{ margin:"0 auto" }}>+ Add first patient</Btn>
                </Card>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(260px,100%),1fr))", gap:12 }}>
                  {patients.map(p=>{
                    const progs = programsByPatient[p.id]||[];
                    const selected = p.id===selectedPatientId;
                    return (
                      <Card key={p.id} onClick={()=>setSelectedPatientId(p.id)}
                        style={{ cursor:"pointer", border:`${selected?"2px":"1px"} solid ${selected?T.green:T.border}`, background:selected?T.greenLt:T.white, transition:"all .15s" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                          <div style={{ width:44, height:44, borderRadius:"50%", background:p.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:"#fff", flexShrink:0 }}>{p.initials}</div>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700 }}>{p.name}</div>
                            <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>Age {age(p.dob)}</div>
                          </div>
                        </div>
                        <div style={{ fontSize:12, color:T.ink3, marginBottom:10 }}>{p.diagnosis}</div>
                        <div style={{ fontSize:11, color:T.ink3, marginBottom:12 }}>{progs.length} programs</div>
                        <button onClick={e=>{e.stopPropagation();setEditingPatient(p);}}
                          style={{ width:"100%", padding:"7px 0", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, fontSize:12, fontWeight:600, cursor:"pointer", color:T.ink2 }}>
                          ✏️ Edit patient
                        </button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {view==="session" && patients.length>0 && (
          <div style={{ padding:"14px 28px", borderTop:`1px solid ${T.border}`, background:T.white, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:26, fontWeight:800, fontVariantNumeric:"tabular-nums", letterSpacing:"-1px", color:sessionActive?T.green:T.ink3 }}>{fmtHMS(sessionSecs)}</div>
            <div style={{ fontSize:12, color:T.ink3, fontWeight:500 }}>{sessionActive?"Session in progress":"Session not started"}</div>
            <div style={{ flex:1 }}/>
            {sessionActive && <Btn onClick={endSession} variant="danger">⏹ End session</Btn>}
            {!sessionActive && <Btn onClick={startSession} variant="success">▶ Start session</Btn>}
          </div>
        )}

        {isMobile && (
          <div style={{ position:"fixed", bottom:0, left:0, right:0, background:T.navy, display:"flex", justifyContent:"space-around", padding:"8px 0 12px", zIndex:100, borderTop:"1px solid rgba(255,255,255,.1)" }}>
            {NAV.map(n=>(
              <div key={n.id} onClick={()=>setView(n.id)}
                style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", opacity:view===n.id?1:.5, transition:"opacity .15s" }}>
                <span style={{ fontSize:20 }}>{n.icon}</span>
                <span style={{ fontSize:9, color:"#fff", fontWeight:view===n.id?700:400 }}>{n.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position:"fixed", bottom:24, right:24, background:T.ink, color:"#fff", padding:"11px 20px", borderRadius:10, fontSize:13, fontWeight:600, opacity:toast?1:0, transform:toast?"translateY(0)":"translateY(8px)", transition:"all .2s", pointerEvents:"none", zIndex:9999 }}>
        {toast||"\u200b"}
      </div>
    </div>
  );
}

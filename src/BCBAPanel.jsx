import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import TemplateManager from "./TemplateManager";

const T = {
  navy:"#0F2744",navyLt:"#E8EEF5",navyMd:"#1A3D6B",
  green:"#0D6E4E",greenLt:"#E6F5F0",greenMd:"#18A274",
  red:"#B91C1C",redLt:"#FEF2F2",redMd:"#DC2626",
  amber:"#92400E",amberLt:"#FFFBEB",amberMd:"#D97706",
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
  ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}
`;

const age = (dob) => dob ? Math.floor((Date.now()-new Date(dob))/(365.25*864e5)) : "—";

function Btn({ onClick, children, variant="secondary", style={} }) {
  const v = {
    primary:  { background:T.navy,  color:"#fff", border:"none" },
    success:  { background:T.green, color:"#fff", border:"none" },
    danger:   { background:T.redLt, color:T.red,  border:`1px solid ${T.red}30` },
    secondary:{ background:T.white, color:T.ink2, border:`1px solid ${T.border2}` },
  };
  return (
    <button onClick={onClick} style={{ ...v[variant], padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:6, ...style }}>
      {children}
    </button>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 24px", ...style }}>{children}</div>;
}

export default function BCBAPanel({ user, profile, onLogout }) {
  const [tab, setTab] = useState("patients");
  const [patients, setPatients] = useState([]);
  const [rbts, setRbts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [pats, rbtData, assignData] = await Promise.all([
      supabase.from("patients").select("*").eq("bcba_id", user.id).order("name"),
      supabase.from("profiles").select("*").eq("role","rbt").eq("approved",true).eq("is_independent",false).order("full_name"),
      supabase.from("patient_assignments").select("*"),
    ]);
    setPatients(pats.data||[]);
    setRbts(rbtData.data||[]);
    setAssignments(assignData.data||[]);
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),2500); };

  const assignRBT = async (patientId, rbtId) => {
    const { error } = await supabase.from("patient_assignments").insert({ patient_id:patientId, rbt_id:rbtId, assigned_by:user.id });
    if(error){ showToast("Already assigned or error"); return; }
    showToast("RBT assigned ✓"); loadData();
  };

  const unassignRBT = async (patientId, rbtId) => {
    await supabase.from("patient_assignments").delete().eq("patient_id",patientId).eq("rbt_id",rbtId);
    showToast("RBT removed"); loadData();
  };

  const editPatient = async (patientData) => {
    const { id, ...data } = patientData;
    const { error } = await supabase.from("patients").update(data).eq("id", id);
    if (error) { showToast("Error updating patient: " + error.message); return; }
    showToast("Patient updated ✓");
    loadData();
  };

  const getRBTsForPatient = (pid) => assignments.filter(a=>a.patient_id===pid).map(a=>a.rbt_id);
  const getPatientsForRBT = (rid) => assignments.filter(a=>a.rbt_id===rid).map(a=>a.patient_id);

  const NAV = [
    {id:"patients",  label:"My patients",    icon:"👤"},
    {id:"programs",  label:"Programs",       icon:"🔬"},
    {id:"rbts",      label:"My RBTs",        icon:"👥"},
    {id:"templates", label:"Templates",      icon:"📝"},
    {id:"sessions",  label:"Recent sessions",icon:"📋"},
  ];

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',system-ui,sans-serif", background:T.bg }}>
      <style>{CSS}</style>

      <div style={{ width:232, background:T.navy, display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontSize:17, fontWeight:800, color:"#fff", letterSpacing:"-.5px" }}>ABA Collect</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:3, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase" }}>BCBA Panel</div>
          {profile && (
            <div style={{ marginTop:14, padding:"10px 12px", background:"rgba(255,255,255,.07)", borderRadius:8, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:T.greenMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>
                {profile.full_name?.[0]?.toUpperCase()||"?"}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{profile.full_name}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", marginTop:1, textTransform:"uppercase", letterSpacing:".05em" }}>BCBA</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:"8px 12px", flex:1, overflowY:"auto" }}>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setTab(n.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 12px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:tab===n.id?700:400, color:tab===n.id?"#fff":"rgba(255,255,255,.6)", background:tab===n.id?"rgba(255,255,255,.12)":"transparent", marginBottom:3, transition:"all .15s" }}>
              <span>{n.icon}</span>{n.label}
            </div>
          ))}
        </div>

        <div style={{ padding:"12px", borderTop:"1px solid rgba(255,255,255,.08)" }}>
          <button onClick={onLogout} style={{ width:"100%", padding:"8px 0", borderRadius:8, border:"1px solid rgba(255,255,255,.12)", background:"transparent", fontSize:12, fontWeight:500, cursor:"pointer", color:"rgba(255,255,255,.5)" }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 28px", borderBottom:`1px solid ${T.border}`, background:T.white, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:T.ink, letterSpacing:"-.5px" }}>
              {tab==="patients"?"My patients":tab==="programs"?"Programs":tab==="rbts"?"My RBTs":tab==="templates"?"Templates":"Recent sessions"}
            </div>
            <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>
              {tab==="patients"?`${patients.length} patients`:tab==="rbts"?`${rbts.length} RBTs`:""}
            </div>
          </div>
          <Btn onClick={loadData}>↻ Refresh</Btn>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:28 }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>Loading…</div>
          ) : tab==="patients" ? (
            <PatientsTab patients={patients} rbts={rbts} getRBTsForPatient={getRBTsForPatient} onAssign={assignRBT} onUnassign={unassignRBT} onEdit={editPatient} expanded={expanded} setExpanded={setExpanded} />
          ) : tab==="programs" ? (
            <ProgramsTab patients={patients} showToast={showToast} />
          ) : tab==="rbts" ? (
            <RBTsTab rbts={rbts} patients={patients} getPatientsForRBT={getPatientsForRBT} />
          ) : tab==="templates" ? (
            <TemplateManager user={user} patients={patients} showToast={showToast} />
          ) : (
            <SessionsTab userId={user.id} patients={patients} />
          )}
        </div>
      </div>

      <div style={{ position:"fixed", bottom:24, right:24, background:T.ink, color:"#fff", padding:"11px 20px", borderRadius:10, fontSize:13, fontWeight:600, opacity:toast?1:0, transform:toast?"translateY(0)":"translateY(8px)", transition:"all .2s", pointerEvents:"none", zIndex:9999 }}>
        {toast||"\u200b"}
      </div>
    </div>
  );
}

// ─── Patients Tab ─────────────────────────────────────────────────────────────
function PatientsTab({ patients, rbts, getRBTsForPatient, onAssign, onUnassign, onEdit, expanded, setExpanded }) {
  const [editingPatient, setEditingPatient] = useState(null);

  if(patients.length===0) return (
    <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
      <div style={{ fontSize:18, fontWeight:700, color:T.ink2 }}>No patients assigned yet</div>
      <div style={{ fontSize:13, marginTop:6 }}>Ask your Clinical Director to assign patients to your account</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {editingPatient && (
        <EditPatientForm patient={editingPatient} onClose={() => setEditingPatient(null)}
          onSave={async (data) => { await onEdit(data); setEditingPatient(null); }} />
      )}
      {patients.map(patient=>{
        const assignedIds = getRBTsForPatient(patient.id);
        const assignedRBTs = rbts.filter(r=>assignedIds.includes(r.id));
        const availableRBTs = rbts.filter(r=>!assignedIds.includes(r.id));
        const isOpen = expanded===patient.id;
        return (
          <div key={patient.id} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
            <div onClick={()=>setExpanded(isOpen?null:patient.id)}
              style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:patient.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff", flexShrink:0 }}>{patient.initials}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700 }}>{patient.name}</div>
                <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>Age {age(patient.dob)} · {patient.diagnosis}</div>
              </div>
              <div style={{ textAlign:"right", marginRight:12 }}>
                <div style={{ fontSize:11, color:T.ink3, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>RBT assigned</div>
                <div style={{ fontSize:24, fontWeight:800, color:assignedRBTs.length>0?T.green:T.amber }}>{assignedRBTs.length}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <button onClick={e=>{ e.stopPropagation(); setEditingPatient(patient); }}
                  style={{ fontSize:12, padding:"6px 12px", borderRadius:7, border:`1px solid ${T.border2}`, background:T.white, cursor:"pointer", fontWeight:600, color:T.ink2 }}>
                  ✏️ Edit
                </button>
                <span style={{ fontSize:16, color:T.ink3 }}>{isOpen?"▲":"▼"}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ padding:"0 20px 16px", borderTop:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em", margin:"14px 0 8px" }}>Assigned RBT</div>
                {assignedRBTs.length===0 ? (
                  <div style={{ fontSize:13, color:T.ink3, marginBottom:12 }}>No RBT assigned yet</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
                    {assignedRBTs.map(rbt=>(
                      <div key={rbt.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:T.greenLt, borderRadius:8 }}>
                        <div style={{ width:30, height:30, borderRadius:"50%", background:T.greenMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>
                          {rbt.full_name?.[0]?.toUpperCase()||"?"}
                        </div>
                        <div style={{ flex:1, fontSize:13, fontWeight:600, color:T.green }}>{rbt.full_name}</div>
                        <button onClick={()=>onUnassign(patient.id,rbt.id)}
                          style={{ fontSize:12, padding:"5px 12px", borderRadius:6, border:`1px solid ${T.red}30`, background:T.redLt, color:T.red, cursor:"pointer", fontWeight:600 }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {availableRBTs.length>0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Assign RBT</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {availableRBTs.map(rbt=>(
                        <button key={rbt.id} onClick={()=>onAssign(patient.id,rbt.id)}
                          style={{ fontSize:12, padding:"7px 14px", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, cursor:"pointer", fontWeight:500, color:T.ink2 }}>
                          + {rbt.full_name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Programs Tab ─────────────────────────────────────────────────────────────
function ProgramsTab({ patients, showToast }) {
  const [selectedPatient, setSelectedPatient] = useState("all");
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);

  const typeInfo = {
    frequency:{ label:"Frequency", color:T.red,   bg:T.redLt   },
    duration: { label:"Duration",  color:T.amber, bg:T.amberLt },
    rate:     { label:"Rate",      color:T.green, bg:T.greenLt },
    latency:  { label:"Latency",   color:T.navy,  bg:T.navyLt  },
  };

  useEffect(() => { loadPrograms(); }, [selectedPatient]);

  const loadPrograms = async () => {
    setLoading(true);
    const patientIds = patients.map(p=>p.id);
    if(!patientIds.length) { setLoading(false); return; }
    let query = supabase.from("programs").select("*").eq("status","active").order("created_at");
    if(selectedPatient !== "all") query = query.eq("patient_id", selectedPatient);
    else query = query.in("patient_id", patientIds);
    const { data } = await query;
    setPrograms(data||[]);
    setLoading(false);
  };

  const saveProgram = async (data) => {
    if(data.id) {
      const { id, patientIds, ...rest } = data;
      await supabase.from("programs").update(rest).eq("id",id);
      showToast("Program updated ✓");
    } else {
      const { patientIds, ...rest } = data;
      const ids = patientIds?.length ? patientIds : (selectedPatient!=="all" ? [selectedPatient] : []);
      if(!ids.length) { showToast("Select at least one patient"); return; }
      for(const pid of ids) {
        await supabase.from("programs").insert({ ...rest, patient_id:pid, status:"active" });
      }
      showToast(`Program created for ${ids.length} patient(s) ✓`);
    }
    loadPrograms();
  };

  const deleteProgram = async (id) => {
    if(!window.confirm("Archive this program?")) return;
    await supabase.from("programs").update({ status:"inactive" }).eq("id",id);
    showToast("Program archived");
    loadPrograms();
  };

  return (
    <div>
      {showForm && <ProgramFormModal patients={patients} patientId={selectedPatient==="all"?null:selectedPatient} onClose={()=>setShowForm(false)} onSave={async d=>{await saveProgram(d);setShowForm(false);}} />}
      {editingProgram && <ProgramFormModal patients={null} patientId={selectedPatient} program={editingProgram} onClose={()=>setEditingProgram(null)} onSave={async d=>{await saveProgram(d);setEditingProgram(null);}} />}

      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={()=>setSelectedPatient("all")}
          style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${selectedPatient==="all"?T.navy:T.border2}`, background:selectedPatient==="all"?T.navyLt:"transparent", color:selectedPatient==="all"?T.navy:T.ink2, fontSize:13, fontWeight:selectedPatient==="all"?700:400, cursor:"pointer" }}>
          All patients
        </button>
        {patients.map(p=>(
          <button key={p.id} onClick={()=>setSelectedPatient(p.id)}
            style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${selectedPatient===p.id?T.navy:T.border2}`, background:selectedPatient===p.id?T.navyLt:"transparent", color:selectedPatient===p.id?T.navy:T.ink2, fontSize:13, fontWeight:selectedPatient===p.id?700:400, cursor:"pointer" }}>
            {p.initials} · {p.name}
          </button>
        ))}
        <button onClick={()=>setShowForm(true)}
          style={{ padding:"8px 16px", borderRadius:8, border:"none", background:T.navy, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", marginLeft:"auto" }}>
          + New program
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:T.ink3 }}>Loading…</div>
      ) : programs.length===0 ? (
        <Card style={{ textAlign:"center", padding:60 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔬</div>
          <div style={{ fontSize:18, fontWeight:700, color:T.ink2, marginBottom:6 }}>No programs yet</div>
          <div style={{ fontSize:13, color:T.ink3, marginBottom:20 }}>Add treatment programs to start collecting data</div>
          <Btn onClick={()=>setShowForm(true)} variant="primary" style={{ margin:"0 auto" }}>+ New program</Btn>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {programs.map(prog=>{
            const ti = typeInfo[prog.type]||{ label:prog.type, color:T.ink3, bg:T.bg2 };
            return (
              <Card key={prog.id} style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 20px" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <div style={{ fontSize:15, fontWeight:700 }}>{prog.name}</div>
                    <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99, background:ti.bg, color:ti.color }}>{ti.label}</span>
                  </div>
                  <div style={{ fontSize:12, color:T.ink3, lineHeight:1.5 }}>{prog.description}</div>
                  {selectedPatient==="all" && (
                    <div style={{ fontSize:11, color:T.navyMd, marginTop:4, fontWeight:500 }}>
                      👤 {patients.find(p=>p.id===prog.patient_id)?.name||"Unknown"}
                    </div>
                  )}
                  <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>Target: {prog.target} · {prog.direction}</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>setEditingProgram(prog)}
                    style={{ fontSize:12, padding:"6px 12px", borderRadius:7, border:`1px solid ${T.border2}`, background:T.white, cursor:"pointer", fontWeight:600 }}>✏️ Edit</button>
                  <button onClick={()=>deleteProgram(prog.id)}
                    style={{ fontSize:12, padding:"6px 12px", borderRadius:7, border:`1px solid ${T.red}30`, background:T.redLt, color:T.red, cursor:"pointer", fontWeight:600 }}>Archive</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Program Form Modal ───────────────────────────────────────────────────────
function ProgramFormModal({ patients, patientId, program, onClose, onSave }) {
  const [name, setName] = useState(program?.name||"");
  const [type, setType] = useState(program?.type||"frequency");
  const [description, setDescription] = useState(program?.description||"");
  const [target, setTarget] = useState(program?.target||"");
  const [targetVal, setTargetVal] = useState(program?.target_val||"");
  const [direction, setDirection] = useState(program?.direction||"decrease");
  const [selectedPatients, setSelectedPatients] = useState(patientId?[patientId]:[]);
  const [patientSearch, setPatientSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [intervalSecs, setIntervalSecs] = useState(program?.interval_secs||10);
  const [totalIntervals, setTotalIntervals] = useState(program?.total_intervals||20);
  const [scatterStart, setScatterStart] = useState(program?.scatter_start_hour||8);
  const [scatterEnd, setScatterEnd] = useState(program?.scatter_end_hour||17);
  const [scatterBlock, setScatterBlock] = useState(program?.scatter_block_mins||30);

  const togglePatient = (id) => {
    setSelectedPatients(prev => prev.includes(id) ? prev.filter(p=>p!==id) : [...prev, id]);
  };

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:8, fontSize:13, border:`1px solid ${T.border2}`, background:T.white, outline:"none", color:T.ink, fontFamily:"inherit" };

  const handleSave = async () => {
    if(!name||!type) return;
    if(!program && (!selectedPatients.length)) { alert("Select at least one patient"); return; }
    setSaving(true);
    await onSave({ 
      id:program?.id, name, type, description, target, 
      target_val:parseFloat(targetVal)||null, direction, 
      interval_secs:parseInt(intervalSecs)||null,
      total_intervals:parseInt(totalIntervals)||null,
      scatter_start_hour:parseInt(scatterStart)||8,
      scatter_end_hour:parseInt(scatterEnd)||17,
      scatter_block_mins:parseInt(scatterBlock)||30,
      patientIds:selectedPatients 
});
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:T.white, borderRadius:16, padding:32, width:480, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:18, fontWeight:800, color:T.ink, marginBottom:24 }}>{program?"Edit program":"New program"}</div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Program name *</div>
          <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} placeholder="e.g. Self-injurious behavior" />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Data type *</div>
            <select value={type} onChange={e=>setType(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
              <option value="frequency">Frequency</option>
              <option value="duration">Duration</option>
              <option value="rate">Rate</option>
              <option value="latency">Latency</option>
              <option value="partial_interval">Partial Interval Recording</option>
              <option value="whole_interval">Whole Interval Recording</option>
              <option value="momentary_time_sampling">Momentary Time Sampling</option>
              <option value="abc_data">ABC Data</option>
              <option value="scatterplot">Scatterplot</option>
              <option value="permanent_product">Permanent Product</option>
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
        <textarea value={description} onChange={e=>setDescription(e.target.value)}
          rows={3}
          placeholder="Brief description of this behavior or skill…"
          style={{ ...inputStyle, resize:"vertical", lineHeight:1.5 }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Target</div>
            <input value={target} onChange={e=>setTarget(e.target.value)} style={inputStyle} placeholder="e.g. < 2 per session" />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Target value</div>
            <input type="number" value={targetVal} onChange={e=>setTargetVal(e.target.value)} style={inputStyle} placeholder="e.g. 2" />
          </div>
        </div>

        {["partial_interval","whole_interval","momentary_time_sampling"].includes(type) && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Interval duration (seconds)</div>
              <input type="number" value={intervalSecs} onChange={e=>setIntervalSecs(e.target.value)} style={inputStyle} placeholder="e.g. 10" />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Total intervals (benchmark)</div>
              <input type="number" value={totalIntervals} onChange={e=>setTotalIntervals(e.target.value)} style={inputStyle} placeholder="e.g. 20" />
            </div>
          </div>
        )}

        {type==="scatterplot" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Start hour</div>
            <select value={scatterStart} onChange={e=>setScatterStart(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
              {Array.from({length:24},(_,i)=><option key={i} value={i}>{i===0?"12 AM":i<12?`${i} AM`:i===12?"12 PM":`${i-12} PM`}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>End hour</div>
            <select value={scatterEnd} onChange={e=>setScatterEnd(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
              {Array.from({length:24},(_,i)=><option key={i} value={i}>{i===0?"12 AM":i<12?`${i} AM`:i===12?"12 PM":`${i-12} PM`}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Block size (min)</div>
            <select value={scatterBlock} onChange={e=>setScatterBlock(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
        </div>
      )}

        {!program && patients && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:8 }}>Assign to patients *</div>
            {selectedPatients.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                {selectedPatients.map(id => {
                  const p = patients.find(p=>p.id===id);
                  return (
                    <span key={id} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:99, background:T.navyLt, color:T.navy, fontSize:12, fontWeight:600 }}>
                      {p?.name}
                      <button onClick={()=>togglePatient(id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.navy, fontSize:16, lineHeight:1, padding:0 }}>×</button>
                    </span>
                  );
                })}
              </div>
            )}
            <input
              placeholder="Search and add patients…"
              value={patientSearch}
              onChange={e=>setPatientSearch(e.target.value)}
              style={{ ...inputStyle, marginBottom:6 }}
            />
            {patientSearch && (
              <div style={{ border:`1px solid ${T.border2}`, borderRadius:8, overflow:"hidden", maxHeight:160, overflowY:"auto" }}>
                {patients.filter(p=>p.name.toLowerCase().includes(patientSearch.toLowerCase())&&!selectedPatients.includes(p.id)).map(p=>(
                  <div key={p.id} onClick={()=>{ togglePatient(p.id); setPatientSearch(""); }}
                    style={{ padding:"9px 14px", cursor:"pointer", fontSize:13, borderBottom:`1px solid ${T.border}`, background:T.white }}
                    onMouseEnter={e=>e.currentTarget.style.background=T.navyLt}
                    onMouseLeave={e=>e.currentTarget.style.background=T.white}>
                    <span style={{ fontWeight:600 }}>{p.initials}</span> · {p.name}
                  </div>
                ))}
                {patients.filter(p=>p.name.toLowerCase().includes(patientSearch.toLowerCase())&&!selectedPatients.includes(p.id)).length===0 && (
                  <div style={{ padding:"9px 14px", fontSize:13, color:T.ink3 }}>No patients found</div>
                )}
              </div>
            )}
          </div>
        )}

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

// ─── RBTs Tab ─────────────────────────────────────────────────────────────────
function RBTsTab({ rbts, patients, getPatientsForRBT }) {
  if(rbts.length===0) return (
    <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
      <div style={{ fontSize:18, fontWeight:700, color:T.ink2 }}>No RBTs available</div>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {rbts.map(rbt=>{
        const pids = getPatientsForRBT(rbt.id);
        const rbtPatients = patients.filter(p=>pids.includes(p.id));
        return (
          <div key={rbt.id} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:T.navyLt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:T.navy, flexShrink:0 }}>
              {rbt.full_name?.[0]?.toUpperCase()||"?"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>{rbt.full_name}</div>
              <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>RBT · Since {new Date(rbt.created_at).toLocaleDateString()}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
                {rbtPatients.length===0 ? (
                  <span style={{ fontSize:12, color:T.ink3 }}>No patients assigned</span>
                ) : rbtPatients.map(p=>(
                  <span key={p.id} style={{ fontSize:11, padding:"3px 10px", borderRadius:99, background:T.greenLt, color:T.green, fontWeight:600 }}>{p.name}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:24, fontWeight:800, color:rbtPatients.length>0?T.green:T.amber }}>{rbtPatients.length}</div>
              <div style={{ fontSize:11, color:T.ink3 }}>patients</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────
function SessionsTab({ userId, patients }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const fmtHMS = (s) => s ? `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}` : "—";

  useEffect(()=>{
    const ids = patients.map(p=>p.id);
    if(!ids.length){ setLoading(false); return; }
    supabase.from("sessions").select("*").in("patient_id",ids).order("started_at",{ascending:false}).limit(20)
      .then(({data})=>{ setSessions(data||[]); setLoading(false); });
  },[patients]);

  if(loading) return <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>Loading…</div>;
  if(!sessions.length) return (
    <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
      <div style={{ fontSize:18, fontWeight:700, color:T.ink2 }}>No sessions yet</div>
    </div>
  );
  return (
    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
      {sessions.map((s,i)=>{
        const patient = patients.find(p=>p.id===s.patient_id);
        return (
          <div key={s.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 20px", borderBottom:i<sessions.length-1?`1px solid ${T.border}`:"none" }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:patient?.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>
              {patient?.initials||"?"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>{patient?.name||"Unknown"}</div>
              <div style={{ fontSize:12, color:T.ink3, marginTop:2 }}>{new Date(s.started_at).toLocaleDateString()} · {new Date(s.started_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14, fontWeight:700 }}>{fmtHMS(s.duration_secs)}</div>
              <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99, background:s.documentation_status==="documented"?T.greenLt:T.amberLt, color:s.documentation_status==="documented"?T.green:T.amber }}>
                {s.documentation_status==="documented"?"✓ Documented":"⏳ Pending"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Edit Patient Form ────────────────────────────────────────────────────────
function EditPatientForm({ patient, onClose, onSave }) {
  const [name, setName] = useState(patient.name||"");
  const [initials, setInitials] = useState(patient.initials||"");
  const [dob, setDob] = useState(patient.dob?.split("T")[0]||"");
  const [diagnosis, setDiagnosis] = useState(patient.diagnosis||"");
  const [color, setColor] = useState(patient.color||"#378ADD");
  const [saving, setSaving] = useState(false);
  const COLORS = ["#378ADD","#1D9E75","#E24B4A","#EF9F27","#7F77DD","#D85A30"];
  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:8, fontSize:13, border:`1px solid ${T.border2}`, background:T.white, outline:"none", color:T.ink, fontFamily:"inherit" };

  const handleSubmit = async () => {
    if (!name || !initials) return;
    setSaving(true);
    await onSave({ id:patient.id, name, initials, dob:dob||null, diagnosis, color });
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:T.white, borderRadius:16, padding:32, width:460, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:18, fontWeight:800, color:T.ink, marginBottom:24 }}>Edit patient</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Full name *</div>
            <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} placeholder="e.g. John Smith" />
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
            <input value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} style={inputStyle} placeholder="e.g. ASD Level 2" />
          </div>
        </div>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:8 }}>Color</div>
          <div style={{ display:"flex", gap:8 }}>
            {COLORS.map(c=>(
              <div key={c} onClick={()=>setColor(c)}
                style={{ width:32, height:32, borderRadius:"50%", background:c, cursor:"pointer", border:`3px solid ${color===c?"#000":"transparent"}`, transition:"border .15s" }}/>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!name||!initials||saving}
            style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", background:T.navy, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            {saving?"Saving…":"Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

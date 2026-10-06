import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import SessionNoteViewer from "./SessionNoteViewer";

const T = {
  navy:"#0F2744",navyLt:"#E8EEF5",navyMd:"#1A3D6B",
  green:"#0D6E4E",greenLt:"#E6F5F0",greenMd:"#18A274",
  red:"#B91C1C",redLt:"#FEF2F2",redMd:"#DC2626",
  amber:"#92400E",amberLt:"#FFFBEB",amberMd:"#D97706",
  indigo:"#4338CA",indigoLt:"#EEF2FF",indigoMd:"#6366F1",
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
  select{font-family:inherit}
  ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}
`;

const age = (dob) => dob ? Math.floor((Date.now()-new Date(dob))/(365.25*864e5)) : "—";
const ROLES = ["rbt","bcba","clinical_director","admin"];
const roleBadge = {
  admin:            { bg:"#FEF2F2", color:"#B91C1C" },
  clinical_director:{ bg:"#EEF2FF", color:"#4338CA" },
  bcba:             { bg:"#E6F5F0", color:"#0D6E4E" },
  rbt:              { bg:"#F1F3F7", color:"#475569" },
};

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
};

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

export default function SuperBCBAPanel({ user, profile, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [patients, setPatients] = useState([]);
  const [bcbas, setBcbas] = useState([]);
  const [rbts, setRbts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredNav, setHoveredNav] = useState(null);
  const width = useWindowWidth();
  const isMobile = width < 768;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [pats, bcbaData, rbtData, assignData, sessionData] = await Promise.all([
      supabase.from("patients").select("*").order("name"),
      supabase.from("profiles").select("*").eq("role","bcba").eq("approved",true).order("full_name"),
      supabase.from("profiles").select("*").eq("role","rbt").eq("approved",true).eq("is_independent",false).order("full_name"),
      supabase.from("patient_assignments").select("*"),
      supabase.from("sessions").select("*").order("started_at",{ascending:false}).limit(20),
    ]);
    setPatients(pats.data||[]);
    setBcbas(bcbaData.data||[]);
    setRbts(rbtData.data||[]);
    setAssignments(assignData.data||[]);
    setSessions(sessionData.data||[]);
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),2500); };

  const createPatient = async (patientData) => {
    const { error } = await supabase.from("patients").insert({ ...patientData, organization_id: profile.organization_id });
    if (error) { showToast("Error creating patient: " + error.message); return; }
    showToast("Patient created ✓"); loadData();
  };

  const editPatient = async (patientData) => {
    const { id, ...data } = patientData;
    const { error } = await supabase.from("patients").update(data).eq("id", id);
    if (error) { showToast("Error updating patient: " + error.message); return; }
    showToast("Patient updated ✓"); loadData();
  };

  const assignPatientToBCBA = async (patientId, bcbaId) => {
    console.log("Assigning BCBA", bcbaId, "to patient", patientId);
    const { error } = await supabase.from("patients").update({ bcba_id:bcbaId }).eq("id",patientId);
    console.log("Result:", error);
    showToast("Patient assigned to BCBA ✓"); loadData();
  };

  const assignRBTtoPatient = async (patientId, rbtId) => {
  const existing = assignments.find(a=>a.patient_id===patientId&&a.rbt_id===rbtId);
  if(existing) {
    // Toggle off — remove this RBT
    await supabase.from("patient_assignments").delete().eq("patient_id",patientId).eq("rbt_id",rbtId);
    showToast("RBT unassigned");
  } else {
    // Remove any existing RBT for this patient first
    await supabase.from("patient_assignments").delete().eq("patient_id",patientId);
    // Then assign the new one
    await supabase.from("patient_assignments").insert({ patient_id:patientId, rbt_id:rbtId });
    showToast("RBT assigned ✓");
  }
  loadData();
};

  const fmtHMS = (s) => s ? `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}` : "—";

  const NAV = [
    {id:"overview", label:"Overview",        icon:"📊"},
    {id:"patients", label:"All patients",    icon:"👤"},
    {id:"bcbas",    label:"BCBAs",           icon:"🧠"},
    {id:"rbts",     label:"RBTs",            icon:"👥"},
    {id:"programs", label:"Programs",        icon:"🔬"},
    {id:"sessions", label:"All sessions",    icon:"📋"},
    {id:"users",    label:"User management", icon:"🔐"},
  ];

  const allUsers = [...bcbas, ...rbts];
  const pendingUsers = allUsers.filter(u=>!u.approved);

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',system-ui,sans-serif", background:T.bg }}>
      <style>{CSS}</style>

      {/* Sidebar */}
      <div style={{ width: isMobile ? 0 : sidebarCollapsed ? 56 : 232, background:T.navy, display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden", transition:"width .25s", position:"relative" }}>
        <div style={{ padding: sidebarCollapsed ? "16px 8px" : "24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,.08)", transition:"padding .25s" }}>
          {!sidebarCollapsed && <div style={{ fontSize:17, fontWeight:800, color:"#fff", letterSpacing:"-.5px" }}>ABA Collect</div>}
          {!sidebarCollapsed && <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:3, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase" }}>Clinical Director</div>}
          {profile && !sidebarCollapsed && (
            <div style={{ marginTop:14, padding:"10px 12px", background:"rgba(255,255,255,.07)", borderRadius:8, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:T.indigoMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>
                {profile.full_name?.[0]?.toUpperCase()||"?"}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{profile.full_name}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", marginTop:1, textTransform:"uppercase", letterSpacing:".05em" }}>CLINICAL DIRECTOR</div>
              </div>
            </div>
          )}
          {profile && sidebarCollapsed && (
            <div style={{ width:32, height:32, borderRadius:"50%", background:T.indigoMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", margin:"0 auto" }}>
              {profile.full_name?.[0]?.toUpperCase()||"?"}
            </div>
          )}
        </div>

        <div style={{ padding:"8px 8px", flex:1, overflowY:"auto" }}>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setTab(n.id)}
              onMouseEnter={()=>sidebarCollapsed&&setHoveredNav(n.id)}
              onMouseLeave={()=>setHoveredNav(null)}
              style={{ position:"relative", display:"flex", alignItems:"center", justifyContent: sidebarCollapsed ? "center" : "space-between", padding:"9px 10px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:tab===n.id?700:400, color:tab===n.id?"#fff":"rgba(255,255,255,.6)", background:tab===n.id?"rgba(255,255,255,.12)":"transparent", marginBottom:3, transition:"all .15s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:16 }}>{n.icon}</span>
                {!sidebarCollapsed && n.label}
              </div>
              {!sidebarCollapsed && n.id==="users" && pendingUsers.length>0 && (
                <span style={{ fontSize:10, fontWeight:700, background:"rgba(255,255,255,.15)", color:"#fff", padding:"1px 7px", borderRadius:99 }}>{pendingUsers.length}</span>
              )}
              {sidebarCollapsed && hoveredNav===n.id && (
                <div style={{ position:"fixed", left:64, background:"rgba(15,23,42,.95)", color:"#fff", padding:"5px 10px", borderRadius:6, fontSize:12, fontWeight:600, whiteSpace:"nowrap", zIndex:999, pointerEvents:"none" }}>
                  {n.label}{n.id==="users"&&pendingUsers.length>0?` (${pendingUsers.length})`:""}
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

        <div style={{ padding:"12px", borderTop:"1px solid rgba(255,255,255,.08)" }}>
          <button onClick={onLogout} style={{ width:"100%", padding:"8px 0", borderRadius:8, border:"1px solid rgba(255,255,255,.12)", background:"transparent", fontSize:12, fontWeight:500, cursor:"pointer", color:"rgba(255,255,255,.5)" }}>
            {sidebarCollapsed ? "→" : "Sign out"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 28px", borderBottom:`1px solid ${T.border}`, background:T.white, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:T.ink, letterSpacing:"-.5px" }}>{NAV.find(n=>n.id===tab)?.label}</div>
            <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>Organization overview</div>
          </div>
          <Btn onClick={loadData}>↻ Refresh</Btn>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:28 }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>Loading…</div>
          ) : tab==="overview" ? (
            <OverviewTab patients={patients} bcbas={bcbas} rbts={rbts} sessions={sessions} fmtHMS={fmtHMS} />
          ) : tab==="patients" ? (
            <PatientsTab patients={patients} bcbas={bcbas} assignments={assignments} rbts={rbts} onAssign={assignPatientToBCBA} onCreate={createPatient} onEdit={editPatient} onAssignRBT={assignRBTtoPatient} />
          ) : tab==="bcbas" ? (
            <BCBAsTab bcbas={bcbas} patients={patients} />
          ) : tab==="rbts" ? (
            <RBTsTab rbts={rbts} assignments={assignments} patients={patients} />
          ) : tab==="programs" ? (
            <ProgramsTab patients={patients} showToast={showToast} />
          ) : tab==="sessions" ? (
            <SessionsTab sessions={sessions} patients={patients} bcbas={bcbas} rbts={rbts} fmtHMS={fmtHMS} />
          ) : tab==="users" ? (
            <UsersTab showToast={showToast} />
          ) : null}
        </div>
      </div>

      <div style={{ position:"fixed", bottom:24, right:24, background:T.ink, color:"#fff", padding:"11px 20px", borderRadius:10, fontSize:13, fontWeight:600, opacity:toast?1:0, transform:toast?"translateY(0)":"translateY(8px)", transition:"all .2s", pointerEvents:"none", zIndex:9999 }}>
        {toast||"\u200b"}
      </div>
    </div>
  );
}

function OverviewTab({ patients, bcbas, rbts, sessions, fmtHMS }) {
  const [viewingNote, setViewingNote] = useState(null);
  const thisWeek = sessions.filter(s=>(Date.now()-new Date(s.started_at))/(1000*3600*24)<=7);
  const metrics = [
    { label:"Total patients",     value:patients.length, color:T.navy  },
    { label:"Active BCBAs",       value:bcbas.length,    color:T.green  },
    { label:"Active RBTs",        value:rbts.length,     color:T.indigo },
    { label:"Sessions this week", value:thisWeek.length, color:T.amber  },
  ];
  return (
    <div>
      {viewingNote && (
        <SessionNoteViewer
          session={viewingNote.session}
          patient={patients.find(p=>p.id===viewingNote.session.patient_id)}
          mode="view"
          onClose={()=>setViewingNote(null)}
        />
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12, marginBottom:20 }}>
        {metrics.map((m,i)=>(
          <Card key={i} style={{ padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:36, fontWeight:800, color:m.color, letterSpacing:"-1px" }}>{m.value}</div>
          </Card>
        ))}
      </div>
      <Card style={{ marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>BCBAs and their patients</div>
        {bcbas.length===0 ? <div style={{ fontSize:13, color:T.ink3 }}>No BCBAs yet</div> : bcbas.map(bcba=>{
          const bp = patients.filter(p=>p.bcba_id===bcba.id);
          return (
            <div key={bcba.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:T.greenLt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:T.green, flexShrink:0 }}>
                {bcba.full_name?.[0]?.toUpperCase()||"?"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{bcba.full_name}</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:6 }}>
                  {bp.length===0 ? <span style={{ fontSize:12, color:T.ink3 }}>No patients</span> : bp.map(p=>(
                    <span key={p.id} style={{ fontSize:11, padding:"3px 10px", borderRadius:99, background:T.greenLt, color:T.green, fontWeight:600 }}>{p.name}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:24, fontWeight:800, color:T.green }}>{bp.length}</div>
                <div style={{ fontSize:11, color:T.ink3 }}>patients</div>
              </div>
            </div>
          );
        })}
      </Card>
      <Card>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Recent sessions</div>
        {sessions.slice(0,5).map((s,i)=>{
          const patient = patients.find(p=>p.id===s.patient_id);
          return (
            <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<4?`1px solid ${T.border}`:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:patient?.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>
                  {patient?.initials||"?"}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{patient?.name||"Unknown"}</div>
                  <div style={{ fontSize:11, color:T.ink3 }}>{new Date(s.started_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{fmtHMS(s.duration_secs)}</div>
                <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:99, background:s.documentation_status==="documented"?T.greenLt:T.amberLt, color:s.documentation_status==="documented"?T.green:T.amber }}>
                  {s.documentation_status==="documented"?"✓ Documented":"⏳ Pending"}
                </span>
                {s.documentation_status==="documented" && (
                  <button onClick={()=>setViewingNote({ session:s })}
                    style={{ fontSize:11, padding:"3px 10px", borderRadius:6, border:`1px solid ${T.border2}`, background:T.white, cursor:"pointer", fontWeight:600, color:T.ink2 }}>
                    📄 View note
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function PatientsTab({ patients, bcbas, assignments, rbts, onAssign, onCreate, onEdit, onAssignRBT }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const getRBT = (pid) => { const a=assignments.find(a=>a.patient_id===pid); return a?rbts.find(r=>r.id===a.rbt_id):null; };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:13, color:T.ink3, fontWeight:500 }}>{patients.length} patients total</div>
        <button onClick={() => setShowForm(true)}
          style={{ padding:"8px 16px", borderRadius:8, border:"none", background:T.navy, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
          + New patient
        </button>
      </div>
      {showForm && <NewPatientForm onClose={() => setShowForm(false)} onCreate={async (data) => { await onCreate(data); setShowForm(false); }} />}
      {editingPatient && <EditPatientForm patient={editingPatient} onClose={() => setEditingPatient(null)} onSave={async (data) => { await onEdit(data); setEditingPatient(null); }} />}
      {patients.map(patient=>{
        const bcba = bcbas.find(b=>b.id===patient.bcba_id);
        const rbt = getRBT(patient.id);
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
              <div style={{ display:"flex", gap:20, alignItems:"center", marginRight:12 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:11, color:T.ink3, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>BCBA</div>
                  <div style={{ fontSize:13, fontWeight:600, color:bcba?T.green:T.amber }}>{bcba?.full_name||"Unassigned"}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:11, color:T.ink3, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>RBT</div>
                  <div style={{ fontSize:13, fontWeight:600, color:rbt?T.navy:T.amber }}>{rbt?.full_name||"Unassigned"}</div>
                </div>
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
                <div style={{ fontSize:11, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em", margin:"14px 0 8px" }}>Assign BCBA</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {bcbas.map(b=>(
                    <button key={b.id} onClick={()=>onAssign(patient.id,b.id)}
                      style={{ fontSize:12, padding:"7px 14px", borderRadius:8, border:`1px solid ${patient.bcba_id===b.id?T.green:T.border2}`, background:patient.bcba_id===b.id?T.greenLt:"transparent", color:patient.bcba_id===b.id?T.green:T.ink2, cursor:"pointer", fontWeight:patient.bcba_id===b.id?700:400 }}>
                      {patient.bcba_id===b.id?"✓ ":""}{b.full_name}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em", margin:"14px 0 8px" }}>Assign RBT</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {rbts.map(r=>(
                    <button key={r.id} onClick={()=>onAssignRBT(patient.id, r.id)}
                      style={{ fontSize:12, padding:"7px 14px", borderRadius:8, 
                        border:`1px solid ${assignments.find(a=>a.patient_id===patient.id&&a.rbt_id===r.id)?T.green:T.border2}`, 
                        background:assignments.find(a=>a.patient_id===patient.id&&a.rbt_id===r.id)?T.greenLt:"transparent", 
                        color:assignments.find(a=>a.patient_id===patient.id&&a.rbt_id===r.id)?T.green:T.ink2, 
                        cursor:"pointer", 
                        fontWeight:assignments.find(a=>a.patient_id===patient.id&&a.rbt_id===r.id)?700:400 }}>
                      {assignments.find(a=>a.patient_id===patient.id&&a.rbt_id===r.id)?"✓ ":""}{r.full_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BCBAsTab({ bcbas, patients }) {
  if(!bcbas.length) return <div style={{ textAlign:"center", padding:60, color:T.ink3 }}><div style={{ fontSize:40, marginBottom:12 }}>🧠</div><div style={{ fontSize:18, fontWeight:700, color:T.ink2 }}>No BCBAs yet</div></div>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {bcbas.map(bcba=>{
        const bp = patients.filter(p=>p.bcba_id===bcba.id);
        return (
          <div key={bcba.id} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:T.greenLt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:T.green, flexShrink:0 }}>
              {bcba.full_name?.[0]?.toUpperCase()||"?"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>{bcba.full_name}</div>
              <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>BCBA · Since {new Date(bcba.created_at).toLocaleDateString()}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
                {bp.length===0 ? <span style={{ fontSize:12, color:T.ink3 }}>No patients</span> : bp.map(p=>(
                  <span key={p.id} style={{ fontSize:11, padding:"3px 10px", borderRadius:99, background:T.greenLt, color:T.green, fontWeight:600 }}>{p.name}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:28, fontWeight:800, color:T.green }}>{bp.length}</div>
              <div style={{ fontSize:11, color:T.ink3 }}>patients</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RBTsTab({ rbts, assignments, patients }) {
  if(!rbts.length) return <div style={{ textAlign:"center", padding:60, color:T.ink3 }}><div style={{ fontSize:40, marginBottom:12 }}>👥</div><div style={{ fontSize:18, fontWeight:700, color:T.ink2 }}>No RBTs yet</div></div>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {rbts.map(rbt=>{
        const pids = assignments.filter(a=>a.rbt_id===rbt.id).map(a=>a.patient_id);
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
                {rbtPatients.length===0 ? <span style={{ fontSize:12, color:T.ink3 }}>No patients</span> : rbtPatients.map(p=>(
                  <span key={p.id} style={{ fontSize:11, padding:"3px 10px", borderRadius:99, background:T.navyLt, color:T.navy, fontWeight:600 }}>{p.name}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:28, fontWeight:800, color:T.navy }}>{rbtPatients.length}</div>
              <div style={{ fontSize:11, color:T.ink3 }}>patients</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PatientCombobox({ patients, value, onChange }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = value==="all" ? null : patients.find(p=>p.id===value);
  const filtered = patients.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position:"relative", minWidth:180 }}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, cursor:"pointer", fontSize:13 }}>
        {selected ? (
          <><div style={{ width:20, height:20, borderRadius:"50%", background:selected.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff" }}>{selected.initials}</div><span style={{ fontWeight:600 }}>{selected.name}</span></>
        ) : (
          <span style={{ color:T.ink3 }}>All patients</span>
        )}
        <span style={{ marginLeft:"auto", color:T.ink3, fontSize:10 }}>▼</span>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:T.white, border:`1px solid ${T.border2}`, borderRadius:8, boxShadow:"0 8px 24px rgba(0,0,0,.12)", zIndex:100, overflow:"hidden" }}>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${T.border}` }}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search patient…"
              style={{ width:"100%", border:"none", outline:"none", fontSize:13, fontFamily:"inherit", color:T.ink }}
            />
          </div>
          <div style={{ maxHeight:200, overflowY:"auto" }}>
            <div onClick={()=>{ onChange("all"); setSearch(""); setOpen(false); }}
              style={{ padding:"8px 12px", cursor:"pointer", fontSize:13, color:value==="all"?T.green:T.ink2, fontWeight:value==="all"?700:400, background:value==="all"?T.greenLt:"transparent" }}>
              All patients
            </div>
            {filtered.map(p=>(
              <div key={p.id} onClick={()=>{ onChange(p.id); setSearch(""); setOpen(false); }}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", cursor:"pointer", background:value===p.id?T.greenLt:"transparent", borderTop:`1px solid ${T.border}` }}
                onMouseEnter={e=>{ if(value!==p.id) e.currentTarget.style.background=T.bg2; }}
                onMouseLeave={e=>{ if(value!==p.id) e.currentTarget.style.background="transparent"; }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:p.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff", flexShrink:0 }}>{p.initials}</div>
                <span style={{ fontSize:13, fontWeight:value===p.id?700:400, color:value===p.id?T.green:T.ink }}>{p.name}</span>
                {value===p.id && <span style={{ marginLeft:"auto", color:T.green, fontSize:12 }}>✓</span>}
              </div>
            ))}
            {filtered.length===0 && <div style={{ padding:"12px", fontSize:12, color:T.ink3, textAlign:"center" }}>No patients found</div>}
          </div>
        </div>
      )}
    </div>
  );
}
function RbtCombobox({ rbts, value, onChange }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = value==="all" ? null : rbts.find(r=>r.id===value);
  const filtered = rbts.filter(r=>r.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position:"relative", minWidth:160 }}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, cursor:"pointer", fontSize:13 }}>
        {selected ? (
          <span style={{ fontWeight:600 }}>{selected.full_name}</span>
        ) : (
          <span style={{ color:T.ink3 }}>All RBTs</span>
        )}
        <span style={{ marginLeft:"auto", color:T.ink3, fontSize:10 }}>▼</span>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:T.white, border:`1px solid ${T.border2}`, borderRadius:8, boxShadow:"0 8px 24px rgba(0,0,0,.12)", zIndex:100, overflow:"hidden" }}>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${T.border}` }}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search RBT…"
              style={{ width:"100%", border:"none", outline:"none", fontSize:13, fontFamily:"inherit", color:T.ink }}
            />
          </div>
          <div style={{ maxHeight:200, overflowY:"auto" }}>
            <div onClick={()=>{ onChange("all"); setSearch(""); setOpen(false); }}
              style={{ padding:"8px 12px", cursor:"pointer", fontSize:13, color:value==="all"?T.green:T.ink2, fontWeight:value==="all"?700:400, background:value==="all"?T.greenLt:"transparent" }}>
              All RBTs
            </div>
            {filtered.map(r=>(
              <div key={r.id} onClick={()=>{ onChange(r.id); setSearch(""); setOpen(false); }}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", cursor:"pointer", background:value===r.id?T.greenLt:"transparent", borderTop:`1px solid ${T.border}` }}
                onMouseEnter={e=>{ if(value!==r.id) e.currentTarget.style.background=T.bg2; }}
                onMouseLeave={e=>{ if(value!==r.id) e.currentTarget.style.background="transparent"; }}>
                <span style={{ fontSize:13, fontWeight:value===r.id?700:400, color:value===r.id?T.green:T.ink }}>{r.full_name}</span>
                {value===r.id && <span style={{ marginLeft:"auto", color:T.green, fontSize:12 }}>✓</span>}
              </div>
            ))}
            {filtered.length===0 && <div style={{ padding:"12px", fontSize:12, color:T.ink3, textAlign:"center" }}>No RBTs found</div>}
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Sessions Tab ─────────────────────────────────────────────────────────────
function BcbaCombobox({ bcbas, value, onChange }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

const selected = value==="all" ? null : bcbas.find(b=>b.id===value);
const filtered = bcbas.filter(b=>b.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position:"relative", minWidth:160 }}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, cursor:"pointer", fontSize:13 }}>
        {selected ? (
          <span style={{ fontWeight:600 }}>{selected.full_name}</span>
        ) : (
          <span style={{ color:T.ink3 }}>All BCBAs</span>
        )}
        <span style={{ marginLeft:"auto", color:T.ink3, fontSize:10 }}>▼</span>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:T.white, border:`1px solid ${T.border2}`, borderRadius:8, boxShadow:"0 8px 24px rgba(0,0,0,.12)", zIndex:100, overflow:"hidden" }}>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${T.border}` }}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search BCBA…"
              style={{ width:"100%", border:"none", outline:"none", fontSize:13, fontFamily:"inherit", color:T.ink }}
            />
          </div>
          <div style={{ maxHeight:200, overflowY:"auto" }}>
            <div onClick={()=>{ onChange("all"); setSearch(""); setOpen(false); }}
              style={{ padding:"8px 12px", cursor:"pointer", fontSize:13, color:value==="all"?T.green:T.ink2, fontWeight:value==="all"?700:400, background:value==="all"?T.greenLt:"transparent" }}>
              All BCBAs
            </div>
            {filtered.map(b=>(
            <div key={b.id} onClick={()=>{ onChange(b.id); setSearch(""); setOpen(false); }}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", cursor:"pointer", background:value===b.id?T.greenLt:"transparent", borderTop:`1px solid ${T.border}` }}
              onMouseEnter={e=>{ if(value!==b.id) e.currentTarget.style.background=T.bg2; }}
              onMouseLeave={e=>{ if(value!==b.id) e.currentTarget.style.background="transparent"; }}>
              <span style={{ fontSize:13, fontWeight:value===b.id?700:400, color:value===b.id?T.green:T.ink }}>{b.full_name}</span>
              {value===b.id && <span style={{ marginLeft:"auto", color:T.green, fontSize:12 }}>✓</span>}
              </div>
            ))}
            {filtered.length===0 && <div style={{ padding:"12px", fontSize:12, color:T.ink3, textAlign:"center" }}>No BCBAs found</div>}
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Sessions Tab ─────────────────────────────────────────────────────────────
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
            const ti = typeInfo[prog.type]||{ label:prog.type.replace(/_/g," "), color:T.ink3, bg:T.bg2 };
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
      <div style={{ background:T.white, borderRadius:16, padding:32, width:"min(480px, calc(100vw - 32px))", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
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
          <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3}
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
            <input placeholder="Search and add patients…" value={patientSearch} onChange={e=>setPatientSearch(e.target.value)} style={{ ...inputStyle, marginBottom:6 }} />
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
function SessionsTab({ sessions, patients, bcbas=[], rbts=[], fmtHMS }) {
  const [viewingNote, setViewingNote] = useState(null);
  const [filterPatient, setFilterPatient] = useState("all");
  const [filterBcba, setFilterBcba] = useState("all");
  const [filterRbt, setFilterRbt] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("all");

  const filtered = sessions.filter(s => {
    const matchPatient = filterPatient==="all" || s.patient_id===filterPatient;
    const patient = patients.find(p=>p.id===s.patient_id);
    const matchBcba = filterBcba==="all" || patient?.bcba_id===filterBcba;
    const matchRbt = filterRbt==="all" || s.rbt_name===rbts.find(r=>r.id===filterRbt)?.full_name;
    const days = rangeFilter==="week"?7:rangeFilter==="month"?30:rangeFilter==="3months"?90:null;
    const matchRange = !days || (Date.now()-new Date(s.started_at))/(1000*3600*24) <= days;
    return matchPatient && matchBcba && matchRbt && matchRange;
  });

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <PatientCombobox patients={patients} value={filterPatient} onChange={setFilterPatient} />
        <BcbaCombobox bcbas={bcbas} value={filterBcba} onChange={setFilterBcba} />
        <RbtCombobox rbts={rbts} value={filterRbt} onChange={setFilterRbt} />
        <div style={{ display:"flex", gap:6 }}>
          {["all","week","month","3months"].map(r=>(
            <button key={r} onClick={()=>setRangeFilter(r)}
              style={{ fontSize:11, padding:"5px 10px", borderRadius:6, border:`1px solid ${rangeFilter===r?T.navy:T.border2}`, background:rangeFilter===r?T.navy:T.white, color:rangeFilter===r?"#fff":T.ink3, cursor:"pointer", fontWeight:rangeFilter===r?700:400 }}>
              {r==="all"?"All":r==="week"?"7 days":r==="month"?"30 days":"3 months"}
            </button>
          ))}
        </div>
        <div style={{ fontSize:12, color:T.ink3, marginLeft:"auto" }}>{filtered.length} sessions</div>
      </div>

      <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
        {filtered.length===0 ? <div style={{ textAlign:"center", padding:40, color:T.ink3 }}>No sessions found</div> :
        filtered.map((s,i)=>{
          const patient=patients.find(p=>p.id===s.patient_id);
          const bcba=bcbas.find(b=>b.id===patient?.bcba_id);
          return (
            <div key={s.id}
              style={{ display:"grid", gridTemplateColumns:"36px 1fr 150px 130px 120px 120px", alignItems:"center", gap:12, padding:"11px 16px", borderBottom:i<filtered.length-1?`1px solid ${T.border}`:"none", transition:"background .12s" }}
              onMouseEnter={e=>e.currentTarget.style.background=T.bg2}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:patient?.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff" }}>
                {patient?.initials||"?"}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{patient?.name||"Unknown"}</div>
                <div style={{ fontSize:11, color:T.ink3, marginTop:1 }}>{new Date(s.started_at).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} · {new Date(s.started_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} · {fmtHMS(s.duration_secs)}</div>
              </div>
              <div>
                {bcba && <span style={{ fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:99, background:T.greenLt, color:T.green }}>{bcba.full_name}</span>}
              </div>
              <div>
                {s.rbt_name && <span style={{ fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:99, background:T.navyLt, color:T.navy }}>{s.rbt_name}</span>}
              </div>
              <div>
                <span style={{ fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:99, background:s.documentation_status==="documented"?T.greenLt:T.amberLt, color:s.documentation_status==="documented"?T.green:T.amber }}>
                  {s.documentation_status==="documented"?"✓ Documented":"⏳ Pending"}
                </span>
              </div>
              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                {s.documentation_status==="documented" && (
                  <button onClick={()=>setViewingNote({ session: s })}
                    style={{ fontSize:11, padding:"4px 10px", borderRadius:6, border:`1px solid ${T.border2}`, background:T.white, cursor:"pointer", fontWeight:600, color:T.ink2 }}>
                    📄 View note
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {viewingNote && (
        <SessionNoteViewer
          session={viewingNote.session}
          patient={patients.find(p=>p.id===viewingNote.session.patient_id)}
          mode="view"
          onClose={()=>setViewingNote(null)}
        />
      )}
    </div>
  );
}

function UsersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  useEffect(()=>{ loadUsers(); },[]);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at",{ascending:false});
    setUsers(data||[]); setLoading(false);
  };

  const approve = async (id) => { await supabase.from("profiles").update({approved:true}).eq("id",id); showToast("User approved ✓"); loadUsers(); };
  const reject  = async (id) => { await supabase.from("profiles").update({approved:false}).eq("id",id); showToast("User rejected"); loadUsers(); };
  const changeRole = async (id, role) => {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", id).single();
    if (profile?.role === "rbt" && role !== "rbt") {
      const { data: assignments } = await supabase.from("patient_assignments").select("id").eq("rbt_id", id);
      if (assignments?.length > 0) {
        showToast(`⚠ Cannot change role — this RBT has ${assignments.length} patient(s) assigned`);
        return;
      }
    }
    await supabase.from("profiles").update({ role }).eq("id", id);
    showToast("Role updated ✓"); loadUsers();
  };

  const pending  = users.filter(u=>!u.approved);
  const approved = users.filter(u=>u.approved);
  const displayed = tab==="pending" ? pending : approved;

  return (
    <div>
      <div style={{ display:"flex", marginBottom:20, borderBottom:`1px solid ${T.border}` }}>
        {[{id:"pending",label:`Pending (${pending.length})`},{id:"all",label:`Approved (${approved.length})`}].map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:tab===t.id?700:400, color:tab===t.id?T.navy:T.ink3, borderBottom:tab===t.id?`2px solid ${T.navy}`:"2px solid transparent", marginBottom:-1 }}>
            {t.label}
          </div>
        ))}
      </div>
      {loading ? <div style={{ textAlign:"center", padding:40, color:T.ink3 }}>Loading…</div> :
      displayed.length===0 ? (
        <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>{tab==="pending"?"✅":"👥"}</div>
          <div style={{ fontSize:18, fontWeight:700, color:T.ink2 }}>{tab==="pending"?"No pending users":"No approved users"}</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {displayed.map(u=>{
            const rb = roleBadge[u.role]||{bg:T.bg2,color:T.ink3};
            return (
              <div key={u.id} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:rb.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:rb.color, flexShrink:0 }}>
                  {u.full_name?.[0]?.toUpperCase()||"?"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700 }}>{u.full_name||"No name"}</div>
                  <div style={{ fontSize:11, color:T.ink3, marginTop:3 }}>Joined {new Date(u.created_at).toLocaleDateString()}</div>
                </div>
                <select key={u.role} value={u.role} onChange={e=>changeRole(u.id,e.target.value)}
                  style={{ fontSize:12, fontWeight:600, padding:"6px 10px", borderRadius:8, border:`1px solid ${T.border2}`, background:rb.bg, color:rb.color, cursor:"pointer", outline:"none" }}>
                  {ROLES.map(r=><option key={r} value={r}>{r.replace(/_/g," ").toUpperCase()}</option>)}
                </select>
                {tab==="pending" ? (
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>approve(u.id)} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:T.green, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>✓ Approve</button>
                    <button onClick={()=>reject(u.id)} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${T.red}30`, background:T.redLt, color:T.red, fontSize:13, fontWeight:600, cursor:"pointer" }}>✗ Reject</button>
                  </div>
                ) : (
                  <button onClick={()=>reject(u.id)} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${T.red}30`, background:T.redLt, color:T.red, fontSize:13, fontWeight:500, cursor:"pointer" }}>Revoke</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewPatientForm({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [dob, setDob] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [color, setColor] = useState("#378ADD");
  const [saving, setSaving] = useState(false);
  const COLORS = ["#378ADD","#1D9E75","#E24B4A","#EF9F27","#7F77DD","#D85A30"];
  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:8, fontSize:13, border:`1px solid ${T.border2}`, background:T.white, outline:"none", color:T.ink, fontFamily:"inherit" };

  const handleSubmit = async () => {
    if (!name || !initials) return;
    setSaving(true);
    await onCreate({ name, initials, dob: dob||null, diagnosis, color });
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:T.white, borderRadius:16, padding:32, width:"min(480px, calc(100vw - 32px))", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:18, fontWeight:800, color:T.ink, marginBottom:24 }}>New patient</div>
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
            {saving?"Creating…":"Create patient"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <div style={{ background:T.white, borderRadius:16, padding:32, width:"min(460px, calc(100vw - 32px))", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
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

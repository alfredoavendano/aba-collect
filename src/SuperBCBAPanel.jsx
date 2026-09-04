import { useState, useEffect } from "react";
import { supabase } from "./supabase";

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
          ) : tab==="sessions" ? (
            <SessionsTab sessions={sessions} patients={patients} fmtHMS={fmtHMS} />
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
  const thisWeek = sessions.filter(s=>(Date.now()-new Date(s.started_at))/(1000*3600*24)<=7);
  const metrics = [
    { label:"Total patients",     value:patients.length, color:T.navy  },
    { label:"Active BCBAs",       value:bcbas.length,    color:T.green  },
    { label:"Active RBTs",        value:rbts.length,     color:T.indigo },
    { label:"Sessions this week", value:thisWeek.length, color:T.amber  },
  ];
  return (
    <div>
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
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{fmtHMS(s.duration_secs)}</div>
                <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:99, background:s.documentation_status==="documented"?T.greenLt:T.amberLt, color:s.documentation_status==="documented"?T.green:T.amber }}>
                  {s.documentation_status==="documented"?"✓ Documented":"⏳ Pending"}
                </span>
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

function SessionsTab({ sessions, patients, fmtHMS }) {
  const [viewingNote, setViewingNote] = useState(null);

  const loadNote = async (session) => {
  const { data } = await supabase.from("session_notes")
    .select("*, note_responses(*, note_sections(title))")
    .eq("session_id", session.id).single();
  setViewingNote({ session, note: data });
};

  return (
    <div>
      <div style={{ fontSize:13, color:T.ink3, marginBottom:14, fontWeight:500 }}>{sessions.length} recent sessions</div>
      <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
        {sessions.length===0 ? <div style={{ textAlign:"center", padding:40, color:T.ink3 }}>No sessions yet</div> :
        sessions.map((s,i)=>{
          const patient=patients.find(p=>p.id===s.patient_id);
          return (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 20px", borderBottom:i<sessions.length-1?`1px solid ${T.border}`:"none" }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:patient?.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>
                {patient?.initials||"?"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{patient?.name||"Unknown"}</div>
                <div style={{ fontSize:12, color:T.ink3, marginTop:2 }}>{new Date(s.started_at).toLocaleDateString()} · {s.rbt_name&&`RBT: ${s.rbt_name}`}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{fmtHMS(s.duration_secs)}</div>
                <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99, background:s.documentation_status==="documented"?T.greenLt:T.amberLt, color:s.documentation_status==="documented"?T.green:T.amber }}>
                  {s.documentation_status==="documented"?"✓ Documented":"⏳ Pending"}
                </span>
                {s.documentation_status==="documented" && (
                  <button onClick={()=>loadNote(s)}
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
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:T.white, borderRadius:16, padding:32, width:"min(560px, calc(100vw - 32px))", maxHeight:"80vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:T.ink }}>Session note</div>
                <div style={{ fontSize:12, color:T.ink3, marginTop:2 }}>
                  {patients.find(p=>p.id===viewingNote.session.patient_id)?.name} · {new Date(viewingNote.session.started_at).toLocaleDateString()}
                </div>
              </div>
              <button onClick={()=>setViewingNote(null)} style={{ fontSize:20, background:"none", border:"none", cursor:"pointer", color:T.ink3 }}>✕</button>
            </div>
            {!viewingNote.note ? (
              <div style={{ textAlign:"center", padding:40, color:T.ink3 }}>No documentation found</div>
            ) : (
              <div>
                {viewingNote.note.note_responses?.map((r,i)=>(
                  <div key={i} style={{ marginBottom:16 }}>
<div style={{ fontSize:12, fontWeight:700, color:T.navy, marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>{{r.note_sections?.title||r.section_id}}</div>
                    <div style={{ fontSize:13, color:T.ink2, lineHeight:1.6, background:T.bg2, padding:"10px 14px", borderRadius:8 }}>{r.response||"—"}</div>
                  </div>
                ))}
                {viewingNote.note.free_text && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.navy, marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Additional notes</div>
                    <div style={{ fontSize:13, color:T.ink2, lineHeight:1.6, background:T.bg2, padding:"10px 14px", borderRadius:8 }}>{viewingNote.note.free_text}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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

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
      supabase.from("profiles").select("*").eq("role","rbt").eq("approved",true).order("full_name"),
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

  const getRBTsForPatient = (pid) => assignments.filter(a=>a.patient_id===pid).map(a=>a.rbt_id);
  const getPatientsForRBT = (rid) => assignments.filter(a=>a.rbt_id===rid).map(a=>a.patient_id);

const NAV = [
  {id:"patients",  label:"My patients",   icon:"👤"},
  {id:"rbts",      label:"My RBTs",       icon:"👥"},
  {id:"templates", label:"Templates",     icon:"📝"},
  {id:"sessions",  label:"Recent sessions",icon:"📋"},
];

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',system-ui,sans-serif", background:T.bg }}>
      <style>{CSS}</style>

      {/* Sidebar */}
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

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 28px", borderBottom:`1px solid ${T.border}`, background:T.white, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:T.ink, letterSpacing:"-.5px" }}>
              {tab==="patients"?"My patients":tab==="rbts"?"My RBTs":"Recent sessions"}
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
            <PatientsTab patients={patients} rbts={rbts} getRBTsForPatient={getRBTsForPatient} onAssign={assignRBT} onUnassign={unassignRBT} expanded={expanded} setExpanded={setExpanded} />
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

function PatientsTab({ patients, rbts, getRBTsForPatient, onAssign, onUnassign, expanded, setExpanded }) {
  if(patients.length===0) return (
    <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
      <div style={{ fontSize:18, fontWeight:700, color:T.ink2 }}>No patients assigned yet</div>
      <div style={{ fontSize:13, marginTop:6 }}>Ask your Clinical Director to assign patients to your account</div>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
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
              <span style={{ fontSize:16, color:T.ink3 }}>{isOpen?"▲":"▼"}</span>
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

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

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
  button:hover{opacity:.85}
  button:active{transform:scale(.98)}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}
`;

const ROLES = ["rbt","bcba","clinical_director","admin"];

const roleBadge = {
  admin:            { bg:"#FEF2F2", color:"#B91C1C" },
  clinical_director:{ bg:"#EEF2FF", color:"#4338CA" },
  bcba:             { bg:"#E6F5F0", color:"#0D6E4E" },
  rbt:              { bg:"#F1F3F7", color:"#475569" },
};

function Btn({ onClick, children, variant="secondary", style={} }) {
  const v = {
    primary:  { background:T.navy,   color:"#fff", border:"none" },
    success:  { background:T.green,  color:"#fff", border:"none" },
    danger:   { background:T.redLt,  color:T.red,  border:`1px solid ${T.red}30` },
    secondary:{ background:T.white,  color:T.ink2, border:`1px solid ${T.border2}` },
  };
  return (
    <button onClick={onClick}
      style={{ ...v[variant], padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600,
        display:"flex", alignItems:"center", justifyContent:"center", gap:6, ...style }}>
      {children}
    </button>
  );
}

export default function AdminPanel({ profile, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [toast, setToast] = useState("");

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  const approve = async (id) => { await supabase.from("profiles").update({ approved: true }).eq("id", id); showToast("User approved ✓"); loadUsers(); };
  const reject  = async (id) => { await supabase.from("profiles").update({ approved: false }).eq("id", id); showToast("User rejected"); loadUsers(); };
  const changeRole = async (id, role) => {
  // Check if changing away from RBT with patients assigned
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", id).single();
  if (profile?.role === "rbt" && role !== "rbt") {
    const { data: assignments } = await supabase
      .from("patient_assignments")
      .select("id")
      .eq("rbt_id", id);
    if (assignments?.length > 0) {
      showToast(`⚠ Cannot change role — this RBT has ${assignments.length} patient(s) assigned. Remove assignments first.`);
      return;
    }
  }
  await supabase.from("profiles").update({ role }).eq("id", id);
  showToast("Role updated ✓");
  loadUsers();
};
  const pending  = users.filter(u => !u.approved);
  const approved = users.filter(u => u.approved);
  const displayed = tab === "pending" ? pending : approved;

  const NAV = [
    { id:"pending", label:"Pending approval", count:pending.length },
    { id:"all",     label:"All users",        count:approved.length },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',system-ui,sans-serif", background:T.bg }}>
      <style>{CSS}</style>

      {/* Sidebar */}
      <div style={{ width:232, background:T.navy, display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontSize:17, fontWeight:800, color:"#fff", letterSpacing:"-.5px" }}>ABA Collect</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:3, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase" }}>Admin Panel</div>
          {profile && (
            <div style={{ marginTop:14, padding:"10px 12px", background:"rgba(255,255,255,.07)", borderRadius:8, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:T.redMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>
                {profile.full_name?.[0]?.toUpperCase()||"?"}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{profile.full_name}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", marginTop:1, textTransform:"uppercase", letterSpacing:".05em" }}>ADMIN</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:"16px 12px", flex:1, overflowY:"auto" }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", letterSpacing:".08em", textTransform:"uppercase", padding:"0 8px 8px", fontWeight:700 }}>Management</div>
          {NAV.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:tab===n.id?700:400, color:tab===n.id?"#fff":"rgba(255,255,255,.6)", background:tab===n.id?"rgba(255,255,255,.12)":"transparent", marginBottom:3, transition:"all .15s" }}>
              <span>{n.label}</span>
              {n.count > 0 && (
                <span style={{ fontSize:10, fontWeight:700, background:tab===n.id?"rgba(255,255,255,.2)":"rgba(255,255,255,.12)", color:"#fff", padding:"1px 7px", borderRadius:99 }}>{n.count}</span>
              )}
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
            <div style={{ fontSize:20, fontWeight:800, color:T.ink, letterSpacing:"-.5px" }}>{tab==="pending"?"Pending approval":"All users"}</div>
            <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>{displayed.length} users</div>
          </div>
          <Btn onClick={loadUsers}>↻ Refresh</Btn>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:28 }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:60, color:T.ink3, fontSize:14 }}>Loading…</div>
          ) : displayed.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>{tab==="pending"?"✅":"👥"}</div>
              <div style={{ fontSize:18, fontWeight:700, color:T.ink2 }}>{tab==="pending"?"No pending users":"No approved users yet"}</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {displayed.map(user => {
                const rb = roleBadge[user.role] || { bg:T.bg2, color:T.ink3 };
                return (
                  <div key={user.id} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{ width:44, height:44, borderRadius:"50%", background:rb.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:rb.color, flexShrink:0 }}>
                      {user.full_name?.[0]?.toUpperCase()||"?"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:T.ink }}>{user.full_name||"No name"}</div>
                      <div style={{ fontSize:11, color:T.ink3, marginTop:3 }}>Joined {new Date(user.created_at).toLocaleDateString()}</div>
                    </div>
                    <select key={user.role} value={user.role} onChange={e => changeRole(user.id, e.target.value)}
                      style={{ fontSize:12, fontWeight:600, padding:"6px 10px", borderRadius:8, border:`1px solid ${T.border2}`, background:rb.bg, color:rb.color, cursor:"pointer", outline:"none" }}>
                      {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g," ").toUpperCase()}</option>)}
                    </select>
                    {tab === "pending" ? (
                      <div style={{ display:"flex", gap:8 }}>
                        <Btn onClick={() => approve(user.id)} variant="success">✓ Approve</Btn>
                        <Btn onClick={() => reject(user.id)} variant="danger">✗ Reject</Btn>
                      </div>
                    ) : (
                      <Btn onClick={() => reject(user.id)} variant="danger" style={{ padding:"8px 14px" }}>Revoke</Btn>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ position:"fixed", bottom:24, right:24, background:T.ink, color:"#fff", padding:"11px 20px", borderRadius:10, fontSize:13, fontWeight:600, opacity:toast?1:0, transform:toast?"translateY(0)":"translateY(8px)", transition:"all .2s", pointerEvents:"none", zIndex:9999 }}>
        {toast||"\u200b"}
      </div>
    </div>
  );
}

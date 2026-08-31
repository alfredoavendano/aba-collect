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
  input,select{font-family:inherit}
  ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}
`;

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
    primary:  { background:T.navy,   color:"#fff", border:"none" },
    success:  { background:T.green,  color:"#fff", border:"none" },
    danger:   { background:T.redLt,  color:T.red,  border:`1px solid ${T.red}30` },
    secondary:{ background:T.white,  color:T.ink2, border:`1px solid ${T.border2}` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...v[variant], padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600,
        display:"flex", alignItems:"center", gap:6, cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?.5:1, ...style }}>
      {children}
    </button>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 24px", ...style }}>{children}</div>;
}

const NAV = [
  { id:"orgs",    label:"Organizations", icon:"🏢" },
  { id:"users",   label:"All users",     icon:"👥" },
  { id:"metrics", label:"Platform metrics", icon:"📊" },
];

export default function AdminPanel({ profile, onLogout }) {
  const [tab, setTab] = useState("orgs");
  const [orgs, setOrgs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredNav, setHoveredNav] = useState(null);
  const width = useWindowWidth();
  const isMobile = width < 640;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [orgsData, usersData] = await Promise.all([
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    setOrgs(orgsData.data || []);
    setUsers(usersData.data || []);
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const createOrg = async (name, slug) => {
    const { error } = await supabase.from("organizations").insert({ name, slug, created_by: profile?.id });
    if (error) { showToast("Error: " + error.message); return; }
    showToast("Organization created ✓");
    setShowNewOrg(false);
    loadData();
  };

  const deleteOrg = async (id) => {
    if (!window.confirm("Delete this organization? This cannot be undone.")) return;
    await supabase.from("organizations").delete().eq("id", id);
    showToast("Organization deleted");
    loadData();
  };

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',system-ui,sans-serif", background:T.bg }}>
      <style>{CSS}</style>

      {/* Sidebar */}
      <div style={{ width: isMobile ? 0 : sidebarCollapsed ? 56 : 232, background:T.navy, display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden", transition:"width .25s", position:"relative" }}>
        <div style={{ padding: sidebarCollapsed ? "16px 8px" : "24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,.08)", transition:"padding .25s" }}>
          {!sidebarCollapsed && <div style={{ fontSize:17, fontWeight:800, color:"#fff", letterSpacing:"-.5px" }}>ABA Collect</div>}
          {!sidebarCollapsed && <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:3, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase" }}>Platform Admin</div>}
          {profile && !sidebarCollapsed && (
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
          {profile && sidebarCollapsed && (
            <div style={{ width:32, height:32, borderRadius:"50%", background:T.redMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", margin:"0 auto" }}>
              {profile.full_name?.[0]?.toUpperCase()||"?"}
            </div>
          )}
        </div>

        <div style={{ padding:"16px 8px", flex:1, overflowY:"auto" }}>
          {NAV.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)}
              onMouseEnter={()=>sidebarCollapsed&&setHoveredNav(n.id)}
              onMouseLeave={()=>setHoveredNav(null)}
              style={{ position:"relative", display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:tab===n.id?700:400, color:tab===n.id?"#fff":"rgba(255,255,255,.6)", background:tab===n.id?"rgba(255,255,255,.12)":"transparent", marginBottom:3, transition:"all .15s", justifyContent:sidebarCollapsed?"center":"flex-start" }}>
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
            <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>ABA Collect platform management</div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {tab === "orgs" && <Btn onClick={() => setShowNewOrg(true)} variant="primary">+ New organization</Btn>}
            <Btn onClick={loadData}>↻ Refresh</Btn>
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:28 }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>Loading…</div>
          ) : tab === "orgs" ? (
            <OrgsTab orgs={orgs} users={users} onDelete={deleteOrg} showNewOrg={showNewOrg} setShowNewOrg={setShowNewOrg} onCreate={createOrg} showToast={showToast} reload={loadData} />
          ) : tab === "users" ? (
            <AllUsersTab users={users} orgs={orgs} showToast={showToast} reload={loadData} />
          ) : (
            <MetricsTab orgs={orgs} users={users} />
          )}
        </div>
      </div>

      <div style={{ position:"fixed", bottom:24, right:24, background:T.ink, color:"#fff", padding:"11px 20px", borderRadius:10, fontSize:13, fontWeight:600, opacity:toast?1:0, transform:toast?"translateY(0)":"translateY(8px)", transition:"all .2s", pointerEvents:"none", zIndex:9999 }}>
        {toast||"\u200b"}
      </div>
    </div>
  );
}

function NewOrgModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const handleName = (v) => {
    setName(v);
    setSlug(v.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""));
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:T.white, borderRadius:16, padding:32, width:"min(440px, calc(100vw - 32px))", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:18, fontWeight:800, color:T.ink, marginBottom:6 }}>New organization</div>
        <div style={{ fontSize:13, color:T.ink3, marginBottom:24 }}>Create a new tenant on the ABA Collect platform</div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Organization name</div>
          <input value={name} onChange={e=>handleName(e.target.value)} placeholder="e.g. Sunshine ABA Therapy"
            style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:`1px solid ${T.border2}`, fontSize:13, outline:"none", fontFamily:"inherit" }} />
        </div>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Slug <span style={{ fontWeight:400 }}>(auto-generated)</span></div>
          <input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="sunshine-aba-therapy"
            style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:`1px solid ${T.border2}`, fontSize:13, outline:"none", fontFamily:"inherit", color:T.ink3 }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={onClose} style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={() => onCreate(name, slug)} variant="primary" disabled={!name||!slug} style={{ flex:1 }}>Create organization</Btn>
        </div>
      </div>
    </div>
  );
}

function OrgsTab({ orgs, users, onDelete, showNewOrg, setShowNewOrg, onCreate, showToast, reload }) {
  return (
    <div>
      {showNewOrg && <NewOrgModal onClose={() => setShowNewOrg(false)} onCreate={onCreate} />}
      <div style={{ fontSize:13, color:T.ink3, fontWeight:500, marginBottom:16 }}>{orgs.length} organizations</div>
      {orgs.length === 0 ? (
        <Card style={{ textAlign:"center", padding:60 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏢</div>
          <div style={{ fontSize:18, fontWeight:700, color:T.ink2, marginBottom:6 }}>No organizations yet</div>
          <div style={{ fontSize:13, color:T.ink3, marginBottom:20 }}>Create your first tenant organization</div>
          <Btn onClick={() => setShowNewOrg(true)} variant="primary" style={{ margin:"0 auto" }}>+ New organization</Btn>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {orgs.map(org => {
            const orgUsers = users.filter(u => u.organization_id === org.id);
            const clinicalDirectors = orgUsers.filter(u => u.role === "clinical_director");
            const bcbas = orgUsers.filter(u => u.role === "bcba");
            const rbts = orgUsers.filter(u => u.role === "rbt");
            return (
              <Card key={org.id}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                  <div style={{ width:48, height:48, borderRadius:12, background:T.navyLt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🏢</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:T.ink }}>{org.name}</div>
                    <div style={{ fontSize:12, color:T.ink3, marginTop:2 }}>
                      slug: <code style={{ background:T.bg2, padding:"1px 6px", borderRadius:4, fontSize:11 }}>{org.slug}</code>
                      {" · "}Created {new Date(org.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ display:"flex", gap:12, marginTop:12 }}>
                      {[
                        { label:"Clinical Directors", value:clinicalDirectors.length, color:T.indigo },
                        { label:"BCBAs", value:bcbas.length, color:T.green },
                        { label:"RBTs", value:rbts.length, color:T.navy },
                        { label:"Total users", value:orgUsers.length, color:T.ink2 },
                      ].map((m,i)=>(
                        <div key={i} style={{ textAlign:"center", padding:"8px 14px", background:T.bg2, borderRadius:8 }}>
                          <div style={{ fontSize:20, fontWeight:800, color:m.color }}>{m.value}</div>
                          <div style={{ fontSize:10, color:T.ink3, fontWeight:600, textTransform:"uppercase", letterSpacing:".04em", marginTop:2 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Btn onClick={() => onDelete(org.id)} variant="danger" style={{ padding:"7px 14px", fontSize:12 }}>Delete</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AllUsersTab({ users, orgs, showToast, reload }) {
  const [search, setSearch] = useState("");
  const [filterOrg, setFilterOrg] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  const ROLES = ["rbt","bcba","clinical_director","admin"];
  const roleBadge = {
    admin:            { bg:"#FEF2F2", color:"#B91C1C" },
    clinical_director:{ bg:"#EEF2FF", color:"#4338CA" },
    bcba:             { bg:"#E6F5F0", color:"#0D6E4E" },
    rbt:              { bg:"#F1F3F7", color:"#475569" },
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchOrg = filterOrg === "all" || u.organization_id === filterOrg;
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchOrg && matchRole;
  });

  const changeRole = async (id, role) => {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", id).single();
    if (profile?.role === "rbt" && role !== "rbt") {
      const { data: assignments } = await supabase.from("patient_assignments").select("id").eq("rbt_id", id);
      if (assignments?.length > 0) {
        showToast(`⚠ Cannot change role — RBT has ${assignments.length} patient(s) assigned`);
        return;
      }
    }
    await supabase.from("profiles").update({ role }).eq("id", id);
    showToast("Role updated ✓");
    reload();
  };

  const moveToOrg = async (userId, orgId) => {
    await supabase.from("profiles").update({ organization_id: orgId||null }).eq("id", userId);
    showToast("User moved ✓");
    reload();
  };

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input placeholder="Search user…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${T.border2}`, fontSize:13, outline:"none", flex:1, minWidth:180 }}/>
        <select value={filterOrg} onChange={e=>setFilterOrg(e.target.value)}
          style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${T.border2}`, fontSize:13, outline:"none", background:T.white }}>
          <option value="all">All organizations</option>
          {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
          style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${T.border2}`, fontSize:13, outline:"none", background:T.white }}>
          <option value="all">All roles</option>
          {ROLES.map(r=><option key={r} value={r}>{r.replace(/_/g," ").toUpperCase()}</option>)}
        </select>
        <div style={{ fontSize:13, color:T.ink3, display:"flex", alignItems:"center", fontWeight:500 }}>{filtered.length} users</div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map(u => {
          const rb = roleBadge[u.role]||{bg:T.bg2,color:T.ink3};
          const org = orgs.find(o=>o.id===u.organization_id);
          return (
            <Card key={u.id} style={{ padding:"14px 20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:rb.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:rb.color, flexShrink:0 }}>
                  {u.full_name?.[0]?.toUpperCase()||"?"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>{u.full_name||"No name"}</div>
                  <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>
                    {org ? org.name : <span style={{ color:T.amber }}>⚠ No organization</span>}
                    {" · "}Joined {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </div>
                <select key={u.role} value={u.role} onChange={e=>changeRole(u.id,e.target.value)}
                  style={{ fontSize:12, fontWeight:600, padding:"6px 10px", borderRadius:8, border:`1px solid ${T.border2}`, background:rb.bg, color:rb.color, cursor:"pointer", outline:"none" }}>
                  {ROLES.map(r=><option key={r} value={r}>{r.replace(/_/g," ").toUpperCase()}</option>)}
                </select>
                <select value={u.organization_id||""} onChange={e=>moveToOrg(u.id,e.target.value)}
                  style={{ fontSize:12, padding:"6px 10px", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, cursor:"pointer", outline:"none", maxWidth:160 }}>
                  <option value="">No organization</option>
                  {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99, background:u.approved?T.greenLt:T.amberLt, color:u.approved?T.green:T.amber }}>
                  {u.approved?"✓ Active":"⏳ Pending"}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricsTab({ orgs, users }) {
  const metrics = [
    { label:"Total organizations", value:orgs.length, color:T.navy },
    { label:"Total users", value:users.length, color:T.green },
    { label:"Clinical Directors", value:users.filter(u=>u.role==="clinical_director").length, color:T.indigo },
    { label:"BCBAs", value:users.filter(u=>u.role==="bcba").length, color:T.green },
    { label:"RBTs", value:users.filter(u=>u.role==="rbt").length, color:T.amber },
    { label:"Pending approval", value:users.filter(u=>!u.approved).length, color:T.red },
  ];

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12, marginBottom:24 }}>
        {metrics.map((m,i)=>(
          <Card key={i} style={{ padding:"16px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:36, fontWeight:800, color:m.color, letterSpacing:"-1px" }}>{m.value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Organizations breakdown</div>
        {orgs.map(org=>{
          const orgUsers = users.filter(u=>u.organization_id===org.id);
          const pct = users.length > 0 ? Math.round((orgUsers.length/users.length)*100) : 0;
          return (
            <div key={org.id} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:600, marginBottom:6 }}>
                <span>{org.name}</span>
                <span style={{ color:T.ink3 }}>{orgUsers.length} users ({pct}%)</span>
              </div>
              <div style={{ height:8, background:T.bg2, borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", background:T.navy, borderRadius:4, width:`${pct}%`, transition:"width .3s" }}/>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

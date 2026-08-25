import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const C = {
  teal: "#0F6E56", tealLt: "#E1F5EE", tealMd: "#1D9E75", tealDk: "#085041",
  blue: "#185FA5", blueLt: "#E6F1FB", blueMd: "#378ADD",
  amber: "#BA7517", amberLt: "#FAEEDA", amberMd: "#EF9F27",
  red: "#A32D2D", redLt: "#FCEBEB", redMd: "#E24B4A",
  purple: "#534AB7", purpleLt: "#EEEDFE", purpleMd: "#7F77DD",
  gray: "#5F5E5A", grayLt: "#F1EFE8", grayMd: "#888780",
};

const age = (dob) => dob ? Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : "—";

const ROLE_COLORS = {
  admin:      { bg: "#FCEBEB", color: "#A32D2D" },
  super_bcba: { bg: "#E6F1FB", color: "#185FA5" },
  bcba:       { bg: "#E1F5EE", color: "#0F6E56" },
  rbt:        { bg: "#F1EFE8", color: "#5F5E5A" },
};

export default function SuperBCBAPanel({ user, profile, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [patients, setPatients] = useState([]);
  const [bcbas, setBcbas] = useState([]);
  const [rbts, setRbts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [pats, bcbaData, rbtData, assignData, sessionData] = await Promise.all([
      supabase.from("patients").select("*").order("name"),
      supabase.from("profiles").select("*").eq("role", "bcba").eq("approved", true).order("full_name"),
      supabase.from("profiles").select("*").eq("role", "rbt").eq("approved", true).order("full_name"),
      supabase.from("patient_assignments").select("*"),
      supabase.from("sessions").select("*").order("started_at", { ascending: false }).limit(20),
    ]);
    setPatients(pats.data || []);
    setBcbas(bcbaData.data || []);
    setRbts(rbtData.data || []);
    setAssignments(assignData.data || []);
    setSessions(sessionData.data || []);
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const assignPatientToBCBA = async (patientId, bcbaId) => {
    await supabase.from("patients").update({ bcba_id: bcbaId }).eq("id", patientId);
    showToast("Patient assigned to BCBA ✓");
    loadData();
  };

  const fmtHMS = (secs) => {
    if (!secs) return "—";
    return `${String(Math.floor(secs/3600)).padStart(2,"0")}:${String(Math.floor((secs%3600)/60)).padStart(2,"0")}:${String(secs%60).padStart(2,"0")}`;
  };

const NAV = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "patients", label: "All patients", icon: "👤" },
  { id: "bcbas", label: "BCBAs", icon: "🧠" },
  { id: "rbts", label: "RBTs", icon: "👥" },
  { id: "sessions", label: "All sessions", icon: "📋" },
  { id: "users", label: "User management", icon: "🔐" },
];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f5f4f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        button:hover { opacity: .85; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 4px; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 220, background: "#fff", borderRight: "0.5px solid rgba(0,0,0,.1)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 18px 14px", borderBottom: "0.5px solid rgba(0,0,0,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: C.blue }}>
            <span style={{ fontSize: 20 }}>🧠</span> ABA Collect
          </div>
          <div style={{ fontSize: 10, color: C.grayMd, marginTop: 3 }}>Clinical Director Panel</div>
          <div style={{ fontSize: 11, color: C.gray, marginTop: 8, fontWeight: 500 }}>{profile?.full_name}</div>
          <div style={{ fontSize: 10, color: C.blueMd, fontWeight: 600 }}>CLINICAL DIRECTOR</div>
        </div>

        <div style={{ padding: "10px 8px", flex: 1 }}>
          {NAV.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: tab === n.id ? 600 : 400, color: tab === n.id ? C.blue : C.gray, background: tab === n.id ? C.blueLt : "transparent", marginBottom: 2, transition: "all .12s" }}>
              <span>{n.icon}</span>{n.label}
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 8px", borderTop: "0.5px solid rgba(0,0,0,.08)" }}>
          <button onClick={onLogout}
            style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: "0.5px solid rgba(0,0,0,.15)", background: "transparent", fontSize: 12, fontWeight: 500, cursor: "pointer", color: C.gray }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "13px 22px", borderBottom: "0.5px solid rgba(0,0,0,.08)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{NAV.find(n => n.id === tab)?.label}</div>
            <div style={{ fontSize: 11, color: C.grayMd, marginTop: 1 }}>Organization overview</div>
          </div>
          <button onClick={loadData}
            style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,.15)", background: "transparent", cursor: "pointer", fontWeight: 500 }}>
            Refresh
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>Loading…</div>
          ) : tab === "overview" ? (
            <OverviewTab patients={patients} bcbas={bcbas} rbts={rbts} sessions={sessions} fmtHMS={fmtHMS} />
          ) : tab === "patients" ? (
            <PatientsTab patients={patients} bcbas={bcbas} assignments={assignments} rbts={rbts} onAssign={assignPatientToBCBA} showToast={showToast} reload={loadData} />
          ) : tab === "bcbas" ? (
            <BCBAsTab bcbas={bcbas} patients={patients} />
          ) : tab === "rbts" ? (
            <RBTsTab rbts={rbts} assignments={assignments} patients={patients} />
          ) : tab === "sessions" ? (
            <SessionsTab sessions={sessions} patients={patients} fmtHMS={fmtHMS} />
          ) : tab === "users" ? (
             <UsersTab showToast={showToast} reload={loadData} />
          ) : null}
        </div>
      </div>

      {/* Toast */}
      <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1a1a18", color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, opacity: toast ? 1 : 0, transform: toast ? "translateY(0)" : "translateY(10px)", transition: "all .25s", pointerEvents: "none", zIndex: 9999 }}>
        {toast || "\u200b"}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ patients, bcbas, rbts, sessions, fmtHMS }) {
  const thisWeek = sessions.filter(s => {
    const d = new Date(s.started_at);
    const now = new Date();
    const diff = (now - d) / (1000 * 3600 * 24);
    return diff <= 7;
  });

  const metrics = [
    { label: "Total patients", value: patients.length, color: C.teal, icon: "👤" },
    { label: "Active BCBAs", value: bcbas.length, color: C.blue, icon: "🧠" },
    { label: "Active RBTs", value: rbts.length, color: C.purple, icon: "👥" },
    { label: "Sessions this week", value: thisWeek.length, color: C.amber, icon: "📋" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 12, color: C.grayMd, marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* BCBAs and their patients */}
      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 14, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>BCBAs and their patients</div>
        {bcbas.length === 0 ? (
          <div style={{ fontSize: 12, color: C.grayMd }}>No BCBAs yet</div>
        ) : bcbas.map(bcba => {
          const bcbaPatients = patients.filter(p => p.bcba_id === bcba.id);
          return (
            <div key={bcba.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "0.5px solid rgba(0,0,0,.06)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.tealLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.teal, flexShrink: 0 }}>
                {bcba.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{bcba.full_name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {bcbaPatients.length === 0 ? (
                    <span style={{ fontSize: 11, color: C.grayMd }}>No patients assigned</span>
                  ) : bcbaPatients.map(p => (
                    <span key={p.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: C.tealLt, color: C.teal, fontWeight: 500 }}>{p.name}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.teal }}>{bcbaPatients.length}</div>
                <div style={{ fontSize: 11, color: C.grayMd }}>patients</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent sessions */}
      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 14, padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Recent sessions</div>
        {sessions.slice(0, 5).map((s, i) => {
          const patient = patients.find(p => p.id === s.patient_id);
          return (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 4 ? "0.5px solid rgba(0,0,0,.06)" : "none", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: patient?.color || C.blueMd, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                  {patient?.initials || "?"}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{patient?.name || "Unknown"}</div>
                  <div style={{ color: C.grayMd }}>{new Date(s.started_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600 }}>{fmtHMS(s.duration_secs)}</div>
                <div style={{ color: s.documentation_status === "documented" ? C.teal : C.amber, fontSize: 10, fontWeight: 500 }}>
                  {s.documentation_status === "documented" ? "✓ Documented" : "⏳ Pending docs"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Patients Tab ─────────────────────────────────────────────────────────────
function PatientsTab({ patients, bcbas, assignments, rbts, onAssign, showToast, reload }) {
  const [expanded, setExpanded] = useState(null);

  const getRBTForPatient = (patientId) => {
    const a = assignments.find(a => a.patient_id === patientId);
    return a ? rbts.find(r => r.id === a.rbt_id) : null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, color: C.grayMd, marginBottom: 4 }}>{patients.length} patients total</div>
      {patients.map(patient => {
        const bcba = bcbas.find(b => b.id === patient.bcba_id);
        const rbt = getRBTForPatient(patient.id);
        const isExpanded = expanded === patient.id;

        return (
          <div key={patient.id} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 14, overflow: "hidden" }}>
            <div onClick={() => setExpanded(isExpanded ? null : patient.id)}
              style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: patient.color || C.blueMd, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {patient.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{patient.name}</div>
                <div style={{ fontSize: 11, color: C.grayMd, marginTop: 2 }}>Age {age(patient.dob)} · {patient.diagnosis}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.grayMd }}>BCBA</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: bcba ? C.teal : C.amber }}>{bcba?.full_name || "Unassigned"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.grayMd }}>RBT</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: rbt ? C.blue : C.amber }}>{rbt?.full_name || "Unassigned"}</div>
                </div>
              </div>
              <span style={{ fontSize: 14, color: C.grayMd }}>{isExpanded ? "▲" : "▼"}</span>
            </div>

            {isExpanded && (
              <div style={{ padding: "0 18px 16px", borderTop: "0.5px solid rgba(0,0,0,.06)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.grayMd, textTransform: "uppercase", letterSpacing: ".06em", margin: "12px 0 8px" }}>
                  Assign BCBA
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {bcbas.map(b => (
                    <button key={b.id} onClick={() => onAssign(patient.id, b.id)}
                      style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, border: `0.5px solid ${patient.bcba_id === b.id ? C.teal : "rgba(0,0,0,.15)"}`, background: patient.bcba_id === b.id ? C.tealLt : "transparent", color: patient.bcba_id === b.id ? C.teal : C.gray, cursor: "pointer", fontWeight: patient.bcba_id === b.id ? 600 : 400 }}>
                      {patient.bcba_id === b.id ? "✓ " : ""}{b.full_name}
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

// ─── BCBAs Tab ────────────────────────────────────────────────────────────────
function BCBAsTab({ bcbas, patients }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, color: C.grayMd, marginBottom: 4 }}>{bcbas.length} BCBAs</div>
      {bcbas.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No BCBAs yet</div>
        </div>
      ) : bcbas.map(bcba => {
        const bcbaPatients = patients.filter(p => p.bcba_id === bcba.id);
        return (
          <div key={bcba.id} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.tealLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: C.teal, flexShrink: 0 }}>
              {bcba.full_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{bcba.full_name}</div>
              <div style={{ fontSize: 11, color: C.grayMd, marginTop: 2 }}>BCBA · Since {new Date(bcba.created_at).toLocaleDateString()}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {bcbaPatients.length === 0 ? (
                  <span style={{ fontSize: 11, color: C.grayMd }}>No patients assigned</span>
                ) : bcbaPatients.map(p => (
                  <span key={p.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: C.tealLt, color: C.teal, fontWeight: 500 }}>{p.name}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.teal }}>{bcbaPatients.length}</div>
              <div style={{ fontSize: 11, color: C.grayMd }}>patients</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── RBTs Tab ─────────────────────────────────────────────────────────────────
function RBTsTab({ rbts, assignments, patients }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, color: C.grayMd, marginBottom: 4 }}>{rbts.length} RBTs</div>
      {rbts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No RBTs yet</div>
        </div>
      ) : rbts.map(rbt => {
        const rbtAssignments = assignments.filter(a => a.rbt_id === rbt.id);
        const rbtPatients = patients.filter(p => rbtAssignments.some(a => a.patient_id === p.id));
        return (
          <div key={rbt.id} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.blueLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: C.blue, flexShrink: 0 }}>
              {rbt.full_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{rbt.full_name}</div>
              <div style={{ fontSize: 11, color: C.grayMd, marginTop: 2 }}>RBT · Since {new Date(rbt.created_at).toLocaleDateString()}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {rbtPatients.length === 0 ? (
                  <span style={{ fontSize: 11, color: C.grayMd }}>No patients assigned</span>
                ) : rbtPatients.map(p => (
                  <span key={p.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: C.blueLt, color: C.blue, fontWeight: 500 }}>{p.name}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.blue }}>{rbtPatients.length}</div>
              <div style={{ fontSize: 11, color: C.grayMd }}>patients</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────
function SessionsTab({ sessions, patients, fmtHMS }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: C.grayMd, marginBottom: 14 }}>{sessions.length} recent sessions</div>
      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 14, overflow: "hidden" }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>No sessions recorded yet</div>
        ) : sessions.map((s, i) => {
          const patient = patients.find(p => p.id === s.patient_id);
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderBottom: i < sessions.length - 1 ? "0.5px solid rgba(0,0,0,.06)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: patient?.color || C.blueMd, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {patient?.initials || "?"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{patient?.name || "Unknown patient"}</div>
                <div style={{ fontSize: 11, color: C.grayMd }}>
                  {new Date(s.started_at).toLocaleDateString()} · {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {s.rbt_name && ` · RBT: ${s.rbt_name}`}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtHMS(s.duration_secs)}</div>
                <div style={{ fontSize: 10, fontWeight: 500, color: s.documentation_status === "documented" ? C.teal : C.amber }}>
                  {s.documentation_status === "documented" ? "✓ Documented" : "⏳ Pending"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  function UsersTab({ showToast, reload }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  const ROLES = ["rbt", "bcba", "clinical_director", "admin"];

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const approve = async (id) => {
    await supabase.from("profiles").update({ approved: true }).eq("id", id);
    showToast("User approved ✓");
    loadUsers();
  };

  const reject = async (id) => {
    await supabase.from("profiles").update({ approved: false }).eq("id", id);
    showToast("User rejected");
    loadUsers();
  };

  const changeRole = async (id, role) => {
    await supabase.from("profiles").update({ role }).eq("id", id);
    showToast("Role updated ✓");
    loadUsers();
  };

  const pending = users.filter(u => !u.approved);
  const approved = users.filter(u => u.approved);
  const displayed = tab === "pending" ? pending : approved;

  return (
    <div>
      <div style={{ display: "flex", marginBottom: 16, borderBottom: "0.5px solid rgba(0,0,0,.1)" }}>
        {[{ id: "pending", label: `Pending (${pending.length})` }, { id: "all", label: `Approved (${approved.length})` }].map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? C.blue : C.gray, borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent", marginBottom: -1 }}>
            {t.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{tab === "pending" ? "✅" : "👥"}</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{tab === "pending" ? "No pending users" : "No approved users"}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {displayed.map(user => (
            <div key={user.id} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.blueLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: C.blue, flexShrink: 0 }}>
                {user.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user.full_name || "No name"}</div>
                <div style={{ fontSize: 11, color: C.grayMd }}>{new Date(user.created_at).toLocaleDateString()}</div>
              </div>
              <select value={user.role} onChange={e => changeRole(user.id, e.target.value)}
                style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,.15)", background: "#fafaf9", cursor: "pointer" }}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ").toUpperCase()}</option>)}
              </select>
              {tab === "pending" ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => approve(user.id)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.teal, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Approve
                  </button>
                  <button onClick={() => reject(user.id)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: `0.5px solid rgba(163,45,45,.3)`, background: C.redLt, color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Reject
                  </button>
                </div>
              ) : (
                <button onClick={() => reject(user.id)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,.15)", background: "transparent", color: C.red, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
}

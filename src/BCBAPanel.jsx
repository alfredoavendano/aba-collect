import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const C = {
  teal: "#0F6E56", tealLt: "#E1F5EE", tealMd: "#1D9E75", tealDk: "#085041",
  blue: "#185FA5", blueLt: "#E6F1FB", blueMd: "#378ADD",
  amber: "#BA7517", amberLt: "#FAEEDA", amberMd: "#EF9F27",
  red: "#A32D2D", redLt: "#FCEBEB", redMd: "#E24B4A",
  gray: "#5F5E5A", grayLt: "#F1EFE8", grayMd: "#888780",
};

const age = (dob) => dob ? Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : "—";

export default function BCBAPanel({ user, profile, onLogout }) {
  const [tab, setTab] = useState("patients");
  const [patients, setPatients] = useState([]);
  const [rbts, setRbts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);

    // Load patients assigned to this BCBA
    const { data: pats } = await supabase
      .from("patients")
      .select("*")
      .eq("bcba_id", user.id)
      .order("name");

    // Load all approved RBTs
    const { data: rbtData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "rbt")
      .eq("approved", true)
      .order("full_name");

    // Load assignments
    const { data: assignData } = await supabase
      .from("patient_assignments")
      .select("*");

    setPatients(pats || []);
    setRbts(rbtData || []);
    setAssignments(assignData || []);
    setLoading(false);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const assignRBT = async (patientId, rbtId) => {
    const { error } = await supabase.from("patient_assignments").insert({
      patient_id: patientId,
      rbt_id: rbtId,
      assigned_by: user.id,
    });
    if (error) { showToast("Already assigned or error"); return; }
    showToast("RBT assigned ✓");
    loadData();
  };

  const unassignRBT = async (patientId, rbtId) => {
    await supabase.from("patient_assignments")
      .delete()
      .eq("patient_id", patientId)
      .eq("rbt_id", rbtId);
    showToast("RBT removed");
    loadData();
  };

  const getRBTsForPatient = (patientId) =>
    assignments.filter(a => a.patient_id === patientId).map(a => a.rbt_id);

  const getPatientsForRBT = (rbtId) =>
    assignments.filter(a => a.rbt_id === rbtId).map(a => a.patient_id);

  const NAV = [
    { id: "patients", label: "My patients", icon: "👤" },
    { id: "rbts", label: "My RBTs", icon: "👥" },
    { id: "sessions", label: "Recent sessions", icon: "📋" },
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: C.teal }}>
            <span style={{ fontSize: 20 }}>🧠</span> ABA Collect
          </div>
          <div style={{ fontSize: 10, color: C.grayMd, marginTop: 3 }}>BCBA Panel</div>
          <div style={{ fontSize: 11, color: C.gray, marginTop: 8, fontWeight: 500 }}>{profile?.full_name}</div>
          <div style={{ fontSize: 10, color: C.grayMd }}>BCBA</div>
        </div>

        <div style={{ padding: "10px 8px", flex: 1 }}>
          <div style={{ fontSize: 10, color: C.grayMd, letterSpacing: ".07em", textTransform: "uppercase", padding: "8px 10px 4px" }}>Workspace</div>
          {NAV.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: tab === n.id ? 600 : 400, color: tab === n.id ? C.teal : C.gray, background: tab === n.id ? C.tealLt : "transparent", marginBottom: 2, transition: "all .12s" }}>
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
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {tab === "patients" ? "My patients" : tab === "rbts" ? "My RBTs" : "Recent sessions"}
            </div>
            <div style={{ fontSize: 11, color: C.grayMd, marginTop: 1 }}>
              {tab === "patients" ? `${patients.length} patients` : tab === "rbts" ? `${rbts.length} RBTs` : ""}
            </div>
          </div>
          <button onClick={loadData}
            style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,.15)", background: "transparent", cursor: "pointer", fontWeight: 500 }}>
            Refresh
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>Loading…</div>
          ) : tab === "patients" ? (
            <PatientsTab
              patients={patients}
              rbts={rbts}
              getRBTsForPatient={getRBTsForPatient}
              onAssign={assignRBT}
              onUnassign={unassignRBT}
            />
          ) : tab === "rbts" ? (
            <RBTsTab
              rbts={rbts}
              patients={patients}
              getPatientsForRBT={getPatientsForRBT}
            />
          ) : (
            <SessionsTab userId={user.id} patients={patients} />
          )}
        </div>
      </div>

      {/* Toast */}
      <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1a1a18", color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, opacity: toast ? 1 : 0, transform: toast ? "translateY(0)" : "translateY(10px)", transition: "all .25s", pointerEvents: "none", zIndex: 9999 }}>
        {toast || "\u200b"}
      </div>
    </div>
  );
}

// ─── Patients Tab ─────────────────────────────────────────────────────────────
function PatientsTab({ patients, rbts, getRBTsForPatient, onAssign, onUnassign }) {
  const [expanded, setExpanded] = useState(null);

  if (patients.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No patients assigned to you yet</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Ask your Super BCBA to assign patients to your account</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {patients.map(patient => {
        const assignedRBTIds = getRBTsForPatient(patient.id);
        const assignedRBTs = rbts.filter(r => assignedRBTIds.includes(r.id));
        const availableRBTs = rbts.filter(r => !assignedRBTIds.includes(r.id));
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
                <div style={{ fontSize: 11, color: C.grayMd, marginTop: 2 }}>
                  Age {age(patient.dob)} · {patient.diagnosis}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: C.grayMd }}>RBTs assigned</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: assignedRBTs.length > 0 ? C.teal : C.grayMd }}>
                  {assignedRBTs.length}
                </div>
              </div>
              <span style={{ fontSize: 14, color: C.grayMd }}>{isExpanded ? "▲" : "▼"}</span>
            </div>

            {isExpanded && (
              <div style={{ padding: "0 18px 16px", borderTop: "0.5px solid rgba(0,0,0,.06)" }}>
                {/* Assigned RBTs */}
                <div style={{ fontSize: 11, fontWeight: 600, color: C.grayMd, textTransform: "uppercase", letterSpacing: ".06em", margin: "12px 0 8px" }}>
                  Assigned RBTs
                </div>
                {assignedRBTs.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.grayMd, marginBottom: 12 }}>No RBTs assigned yet</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                    {assignedRBTs.map(rbt => (
                      <div key={rbt.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.tealLt, borderRadius: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.tealMd, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                          {rbt.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.teal }}>{rbt.full_name}</div>
                        <button onClick={() => onUnassign(patient.id, rbt.id)}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "0.5px solid rgba(163,45,45,.3)", background: C.redLt, color: C.red, cursor: "pointer", fontWeight: 500 }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Assign new RBT */}
                {availableRBTs.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.grayMd, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
                      Assign RBT
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {availableRBTs.map(rbt => (
                        <button key={rbt.id} onClick={() => onAssign(patient.id, rbt.id)}
                          style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,.15)", background: "rgba(0,0,0,.03)", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>+</span>{rbt.full_name}
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

// ─── RBTs Tab ─────────────────────────────────────────────────────────────────
function RBTsTab({ rbts, patients, getPatientsForRBT }) {
  if (rbts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No RBTs available</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>RBTs need to register and be approved first</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rbts.map(rbt => {
        const patientIds = getPatientsForRBT(rbt.id);
        const assignedPatients = patients.filter(p => patientIds.includes(p.id));
        return (
          <div key={rbt.id} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.blueMd, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {rbt.full_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{rbt.full_name}</div>
              <div style={{ fontSize: 11, color: C.grayMd, marginTop: 2 }}>RBT · Since {new Date(rbt.created_at).toLocaleDateString()}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {assignedPatients.length === 0 ? (
                  <span style={{ fontSize: 10, color: C.grayMd }}>No patients assigned</span>
                ) : assignedPatients.map(p => (
                  <span key={p.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: C.tealLt, color: C.teal, fontWeight: 500 }}>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.grayMd }}>Patients</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: assignedPatients.length > 0 ? C.teal : C.grayMd }}>
                {assignedPatients.length}
              </div>
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

  useEffect(() => {
    const patientIds = patients.map(p => p.id);
    if (patientIds.length === 0) { setLoading(false); return; }
    supabase
      .from("sessions")
      .select("*")
      .in("patient_id", patientIds)
      .order("started_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { setSessions(data || []); setLoading(false); });
  }, [patients]);

  const fmtHMS = (secs) => {
    if (!secs) return "—";
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>Loading…</div>;

  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No sessions recorded yet</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 14, overflow: "hidden" }}>
      {sessions.map((s, i) => {
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
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{fmtHMS(s.duration_secs)}</div>
              <div style={{ fontSize: 10, color: C.teal, fontWeight: 500 }}>✓ Complete</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

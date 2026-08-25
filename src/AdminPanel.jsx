import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const C = {
  teal: "#0F6E56", tealLt: "#E1F5EE", tealMd: "#1D9E75",
  blue: "#185FA5", blueLt: "#E6F1FB", blueMd: "#378ADD",
  amber: "#BA7517", amberLt: "#FAEEDA", amberMd: "#EF9F27",
  red: "#A32D2D", redLt: "#FCEBEB", redMd: "#E24B4A",
  gray: "#5F5E5A", grayLt: "#F1EFE8", grayMd: "#888780",
};

const ROLES = ["rbt", "bcba", "clinical_director", "admin"];
const ROLE_COLORS = {
  admin:      { bg: "#FCEBEB", color: "#A32D2D" },
  super_bcba: { bg: "#E6F1FB", color: "#185FA5" },
  bcba:       { bg: "#E1F5EE", color: "#0F6E56" },
  rbt:        { bg: "#F1EFE8", color: "#5F5E5A" },
};

function UserRow({ user, tab, onApprove, onReject, onChangeRole }) {
  const roleStyle = ROLE_COLORS[user.role] || { bg: C.grayLt, color: C.gray };
  return (
    <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: roleStyle.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: roleStyle.color, flexShrink: 0 }}>
        {user.full_name ? user.full_name[0].toUpperCase() : "?"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{user.full_name || "No name"}</div>
        <div style={{ fontSize: 11, color: C.grayMd, marginTop: 2 }}>{user.id}</div>
        <div style={{ fontSize: 11, color: C.grayMd }}>{new Date(user.created_at).toLocaleDateString()}</div>
      </div>
      <select
        value={user.role}
        onChange={e => onChangeRole(user.id, e.target.value)}
        style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,.15)", background: roleStyle.bg, color: roleStyle.color, cursor: "pointer" }}>
        {ROLES.map(r => (
          <option key={r} value={r}>{r.replace("_", " ").toUpperCase()}</option>
        ))}
      </select>
      {tab === "pending" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onApprove(user.id)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.teal, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Approve
          </button>
          <button onClick={() => onReject(user.id)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(163,45,45,.3)", background: C.redLt, color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Reject
          </button>
        </div>
      ) : (
        <button onClick={() => onReject(user.id)}
          style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,.15)", background: "transparent", color: C.red, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
          Revoke
        </button>
      )}
    </div>
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

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const approve = async (id) => {
    await supabase.from("profiles").update({ approved: true }).eq("id", id);
    showToast("User approved");
    loadUsers();
  };

  const reject = async (id) => {
    await supabase.from("profiles").update({ approved: false }).eq("id", id);
    showToast("User rejected");
    loadUsers();
  };

  const changeRole = async (id, role) => {
    await supabase.from("profiles").update({ role }).eq("id", id);
    showToast("Role updated");
    loadUsers();
  };

  const pending = users.filter(u => !u.approved);
  const approved = users.filter(u => u.approved);
  const displayed = tab === "pending" ? pending : approved;

  const NAV = [
    { id: "pending", label: "Pending approval", icon: "⏳", count: pending.length },
    { id: "all", label: "All users", icon: "👥", count: approved.length },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f5f4f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        button:hover { opacity: .85; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 220, background: "#fff", borderRight: "0.5px solid rgba(0,0,0,.1)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 18px 14px", borderBottom: "0.5px solid rgba(0,0,0,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: C.teal }}>
            <span style={{ fontSize: 20 }}>🧠</span> ABA Collect
          </div>
          <div style={{ fontSize: 10, color: C.grayMd, marginTop: 3 }}>Admin Panel</div>
          <div style={{ fontSize: 11, color: C.gray, marginTop: 8, fontWeight: 500 }}>{profile?.full_name}</div>
          <div style={{ fontSize: 10, color: C.grayMd }}>ADMIN</div>
        </div>

        <div style={{ padding: "10px 8px", flex: 1 }}>
          <div style={{ fontSize: 10, color: C.grayMd, letterSpacing: ".07em", textTransform: "uppercase", padding: "8px 10px 4px" }}>Management</div>
          {NAV.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: tab === n.id ? 600 : 400, color: tab === n.id ? C.teal : C.gray, background: tab === n.id ? C.tealLt : "transparent", marginBottom: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{n.icon}</span>{n.label}
              </div>
              {n.count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: tab === n.id ? C.teal : C.grayMd, color: "#fff", padding: "1px 6px", borderRadius: 10 }}>
                  {n.count}
                </span>
              )}
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
            <div style={{ fontSize: 15, fontWeight: 700 }}>{tab === "pending" ? "Pending approval" : "All users"}</div>
            <div style={{ fontSize: 11, color: C.grayMd, marginTop: 1 }}>{displayed.length} users</div>
          </div>
          <button onClick={loadUsers}
            style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,.15)", background: "transparent", cursor: "pointer", fontWeight: 500 }}>
            Refresh
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.grayMd, fontSize: 13 }}>Loading…</div>
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.grayMd }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{tab === "pending" ? "✅" : "👥"}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {tab === "pending" ? "No pending users" : "No approved users yet"}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {displayed.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  tab={tab}
                  onApprove={approve}
                  onReject={reject}
                  onChangeRole={changeRole}
                />
              ))}
            </div>
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

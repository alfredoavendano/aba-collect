import { useState } from "react";
import { supabase } from "./supabase";

const C = {
  teal: "#0F6E56", tealLt: "#E1F5EE", tealMd: "#1D9E75",
  red: "#A32D2D", redLt: "#FCEBEB", redMd: "#E24B4A",
  gray: "#5F5E5A", grayMd: "#888780",
};

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async () => {
    setLoading(true); setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      setError("Error loading profile: " + profileError.message);
      setLoading(false); return;
    }

    if (!profile) {
      setError("Profile not found.");
      setLoading(false); return;
    }

    if (!profile.approved) {
      await supabase.auth.signOut();
      setError("Your account is pending approval. Please wait for your BCBA to approve you.");
      setLoading(false); return;
    }

    onLogin(data.user, profile);
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess("Account created! Your BCBA will approve your access shortly.");
    setLoading(false);
  };

  const input = (placeholder, value, onChange, type = "text") => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 13,
        border: "0.5px solid rgba(0,0,0,.2)", background: "#fafaf9",
        outline: "none", fontFamily: "inherit", color: "#1a1a18", marginBottom: 10,
      }}
    />
  );

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#f5f4f0", fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap')`}</style>
      <div style={{
        background: "#fff", borderRadius: 16, padding: 32, width: 360,
        border: "0.5px solid rgba(0,0,0,.12)", boxShadow: "0 4px 24px rgba(0,0,0,.06)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🧠</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.teal }}>ABA Collect</div>
          <div style={{ fontSize: 12, color: C.grayMd, marginTop: 2 }}>RBT Data Platform</div>
        </div>

        <div style={{ display: "flex", marginBottom: 20, borderBottom: "0.5px solid rgba(0,0,0,.1)" }}>
          {["login", "register"].map(m => (
            <div key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
              style={{
                flex: 1, textAlign: "center", padding: "8px 0", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                color: mode === m ? C.teal : C.grayMd,
                borderBottom: mode === m ? `2px solid ${C.teal}` : "2px solid transparent",
                marginBottom: -1, transition: "all .15s",
              }}>
              {m === "login" ? "Sign in" : "Register"}
            </div>
          ))}
        </div>

        {mode === "register" && input("Full name", fullName, setFullName)}
        {input("Email", email, setEmail, "email")}
        {input("Password", password, setPassword, "password")}

        {error && (
          <div style={{ background: C.redLt, color: C.red, padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: C.tealLt, color: C.teal, padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            {success}
          </div>
        )}

        <button
          onClick={mode === "login" ? handleLogin : handleRegister}
          disabled={loading}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
            background: loading ? "rgba(0,0,0,.1)" : C.teal, color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          }}>
          {loading ? "Loading…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </div>
    </div>
  );
}

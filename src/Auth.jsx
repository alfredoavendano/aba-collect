import { useState } from "react";
import { supabase } from "./supabase";

const T = {
  navy:"#0F2744",navyLt:"#E8EEF5",navyMd:"#1A3D6B",
  green:"#0D6E4E",greenLt:"#E6F5F0",greenMd:"#18A274",
  red:"#B91C1C",redLt:"#FEF2F2",
  ink:"#0F172A",ink2:"#334155",ink3:"#64748B",
  bg:"#F8F9FB",white:"#FFFFFF",
  border:"rgba(15,23,42,.08)",border2:"rgba(15,23,42,.14)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,sans-serif;background:${T.bg};-webkit-font-smoothing:antialiased}
  button{font-family:inherit;cursor:pointer;transition:opacity .12s,transform .12s}
  button:hover{opacity:.88} button:active{transform:scale(.98)}
  input{font-family:inherit}
`;

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
      .from("profiles").select("*").eq("id", data.user.id).single();

    if (profileError) { setError("Error loading profile: " + profileError.message); setLoading(false); return; }
    if (!profile)     { setError("Profile not found."); setLoading(false); return; }
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
    const body = { email, password, data: { full_name: fullName } };
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess("Account created! Your BCBA will approve your access shortly.");
    setLoading(false);
  };

  const inputStyle = {
    width:"100%", padding:"11px 14px", borderRadius:8, fontSize:14,
    border:`1px solid ${T.border2}`, background:T.white, outline:"none",
    color:T.ink, marginBottom:12, transition:"border-color .15s",
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{CSS}</style>

      {/* Left panel */}
      <div style={{ width:420, background:T.navy, display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px 48px", flexShrink:0 }}>
        <div style={{ fontSize:32, fontWeight:800, color:"#fff", letterSpacing:"-1px", lineHeight:1.2, marginBottom:16 }}>
          ABA Collect
        </div>
        <div style={{ fontSize:15, color:"rgba(255,255,255,.6)", lineHeight:1.7, marginBottom:48 }}>
          The modern platform for ABA data collection. Designed for RBTs, BCBAs, and Clinical Directors.
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {[
            { icon:"⏺", text:"Real-time behavior data collection" },
            { icon:"📊", text:"BCBA analytics dashboard" },
            { icon:"⌚", text:"Apple Watch integration" },
            { icon:"📝", text:"Structured session documentation" },
          ].map((f,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:8, background:"rgba(255,255,255,.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{f.icon}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.75)", fontWeight:500 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}>
        <div style={{ width:"100%", maxWidth:380 }}>
          <div style={{ fontSize:24, fontWeight:800, color:T.ink, letterSpacing:"-.5px", marginBottom:6 }}>
            {mode==="login" ? "Welcome back" : "Create account"}
          </div>
          <div style={{ fontSize:13, color:T.ink3, marginBottom:32 }}>
            {mode==="login" ? "Sign in to your ABA Collect account" : "Register to start collecting ABA data"}
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", background:T.bg, borderRadius:10, padding:4, marginBottom:28, border:`1px solid ${T.border}` }}>
            {["login","register"].map(m=>(
              <div key={m} onClick={()=>{ setMode(m); setError(""); setSuccess(""); }}
                style={{ flex:1, textAlign:"center", padding:"8px 0", borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:mode===m?700:400, color:mode===m?T.ink:T.ink3, background:mode===m?T.white:"transparent", transition:"all .15s", boxShadow:mode===m?"0 1px 3px rgba(0,0,0,.08)":"none" }}>
                {m==="login" ? "Sign in" : "Register"}
              </div>
            ))}
          </div>

          {mode==="register" && (
            <input type="text" placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)}
              style={inputStyle} autoCapitalize="words" />
          )}
          <input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}
            style={inputStyle} autoCapitalize="none" />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom:20 }} />

          {error && (
            <div style={{ background:T.redLt, color:T.red, padding:"10px 14px", borderRadius:8, fontSize:13, marginBottom:16, fontWeight:500 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background:T.greenLt, color:T.green, padding:"10px 14px", borderRadius:8, fontSize:13, marginBottom:16, fontWeight:500 }}>
              {success}
            </div>
          )}

          <button onClick={mode==="login" ? handleLogin : handleRegister} disabled={loading}
            style={{ width:"100%", padding:"13px 0", borderRadius:8, border:"none", background:loading?"rgba(0,0,0,.1)":T.navy, color:"#fff", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", letterSpacing:"-.2px" }}>
            {loading ? "Loading…" : mode==="login" ? "Sign in" : "Create account"}
          </button>

          <div style={{ textAlign:"center", marginTop:24, fontSize:12, color:T.ink3 }}>
            ABA Collect · RBT Data Platform
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabase";
import Auth from "./Auth";
import ABACollect from "./ABACollect";
import AdminPanel from "./AdminPanel";
import BCBAPanel from "./BCBAPanel";
import SuperBCBAPanel from "./SuperBCBAPanel";
import IndependentRBT from "./IndependentRBT";

function ProtectedApp({ user, profile, onLogout }) {
  if (profile?.role === "admin") {
    return <AdminPanel profile={profile} onLogout={onLogout} />;
  }
  if (profile?.role === "clinical_director") {
    return <SuperBCBAPanel user={user} profile={profile} onLogout={onLogout} />;
  }
  if (profile?.role === "bcba") {
    return <BCBAPanel user={user} profile={profile} onLogout={onLogout} />;
  }
  if (profile?.is_independent) {
  return <IndependentRBT user={user} profile={profile} onLogout={onLogout} />;
}
return <ABACollect user={user} profile={profile} onLogout={onLogout} />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (prof?.approved) {
          setUser(session.user);
          setProfile(prof);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (user, profile) => {
    setUser(user);
    setProfile(profile);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:12, background:"#F8F9FB", fontFamily:"system-ui" }}>
      <div style={{ fontSize:24, fontWeight:800, color:"#0F2744" }}>ABA Collect</div>
      <div style={{ fontSize:13, color:"#64748B" }}>Loading…</div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <Auth onLogin={handleLogin} />
        }/>
        <Route path="/*" element={
          user ? <ProtectedApp user={user} profile={profile} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }/>
      </Routes>
    </BrowserRouter>
  );
}
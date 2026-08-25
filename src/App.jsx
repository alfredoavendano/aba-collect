import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Auth from "./Auth";
import ABACollect from "./ABACollect";
import AdminPanel from "./AdminPanel";
import BCBAPanel from "./BCBAPanel";
import SuperBCBAPanel from "./SuperBCBAPanel";

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session
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

    // Listen for auth changes
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12, background: "#f5f4f0", fontFamily: "system-ui" }}>
      <div style={{ fontSize: 36 }}>🧠</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0F6E56" }}>Loading…</div>
    </div>
  );

  if (!user) return <Auth onLogin={handleLogin} />;

if (profile?.role === "admin") {
  return <AdminPanel profile={profile} onLogout={handleLogout} />;
}
if (profile?.role === "clinical_director") {
  return <SuperBCBAPanel user={user} profile={profile} onLogout={handleLogout} />;
}

if (profile?.role === "bcba") {
  return <BCBAPanel user={user} profile={profile} onLogout={handleLogout} />;
}
return <ABACollect user={user} profile={profile} onLogout={handleLogout} />;

}
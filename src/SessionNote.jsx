import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const [dataPoints, setDataPoints] = useState([]);

useEffect(() => {
  if (!session?.id) return;
  supabase.from("data_points")
    .select("*")
    .eq("session_id", session.id)
    .order("recorded_at")
    .then(({ data }) => setDataPoints(data||[]));
}, [session?.id]);

const T = {
  navy:"#0F2744",navyLt:"#E8EEF5",navyMd:"#1A3D6B",
  green:"#0D6E4E",greenLt:"#E6F5F0",greenMd:"#18A274",
  red:"#B91C1C",redLt:"#FEF2F2",redMd:"#DC2626",
  amber:"#92400E",amberLt:"#FFFBEB",amberMd:"#D97706",
  ink:"#0F172A",ink2:"#334155",ink3:"#64748B",
  bg:"#F8F9FB",bg2:"#F1F3F7",white:"#FFFFFF",
  border:"rgba(15,23,42,.08)",border2:"rgba(15,23,42,.14)",
};

const fmtHMS = (s) => s ? `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}` : "—";

function Card({ children, style={} }) {
  return <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 24px", ...style }}>{children}</div>;
}

function Btn({ onClick, children, variant="secondary", disabled, style={} }) {
  const v = {
    primary:  { background:T.navy,  color:"#fff", border:"none" },
    success:  { background:T.green, color:"#fff", border:"none" },
    danger:   { background:T.redLt, color:T.red,  border:`1px solid ${T.red}30` },
    secondary:{ background:T.white, color:T.ink2, border:`1px solid ${T.border2}` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...v[variant], padding:"10px 20px", borderRadius:8, fontSize:13, fontWeight:600,
        display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1, ...style }}>
      {children}
    </button>
  );
}

export default function SessionNote({ session, patient, programs, user, onComplete, onSkip }) {
  const [template, setTemplate] = useState(null);
  const [sections, setSections] = useState([]);
  const [responses, setResponses] = useState({});
  const [freeText, setFreeText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadTemplate(); }, [patient]);

  const loadTemplate = async () => {
    setLoading(true);
    const { data: assignment } = await supabase
      .from("template_patient_assignments")
      .select("template_id")
      .eq("patient_id", patient.id)
      .limit(1)
      .single();

    if (assignment) {
      const { data: tmpl } = await supabase
        .from("note_templates")
        .select("*")
        .eq("id", assignment.template_id)
        .single();

      if (tmpl) {
        setTemplate(tmpl);
        const { data: secs } = await supabase
          .from("note_sections")
          .select("*")
          .eq("template_id", tmpl.id)
          .order("order_index");
        setSections(secs || []);
        const initial = {};
        (secs || []).forEach(s => { initial[s.id] = ""; });
        setResponses(initial);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
  const handlePopState = () => {
    const hasContent = Object.values(responses).some(r=>r?.trim()) || freeText?.trim();
    if (hasContent) {
      const confirmed = window.confirm("You have unsaved notes. Are you sure you want to leave?");
      if (confirmed) {
        onSkip();
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    } else {
      onSkip();
    }
  };
  
  window.history.pushState(null, "", window.location.href);
  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, [responses, freeText]);

  const handleSubmit = async () => {
    const missing = sections.filter(s => s.required && !responses[s.id]?.trim());
    if (missing.length > 0) {
      setError(`Please fill in required sections: ${missing.map(s => s.title).join(", ")}`);
      return;
    }
    setSaving(true); setError("");

    const { data: note, error: noteError } = await supabase
      .from("session_notes")
      .insert({
        session_id: session.id,
        template_id: template?.id || null,
        created_by: user.id,
        free_text: freeText,
      })
      .select().single();

    if (noteError) { setError("Error saving note"); setSaving(false); return; }

    const responseRows = sections
      .filter(s => responses[s.id]?.trim())
      .map(s => ({ session_note_id: note.id, section_id: s.id, response: responses[s.id] }));

    if (responseRows.length > 0) {
      await supabase.from("note_responses").insert(responseRows);
    }

    setSaving(false);
    onComplete();
  };

  const filled = Object.values(responses).filter(r => r?.trim()).length;
  const progress = sections.length > 0 ? Math.round((filled / sections.length) * 100) : 0;

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60, color:T.ink3 }}>
      Loading template…
    </div>
  );

  return (
    <div style={{ maxWidth:"100%", margin:"0 auto" }}>

      {/* Session summary header */}
      <Card style={{ marginBottom:20, padding:"16px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:patient.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:700, color:"#fff", flexShrink:0 }}>
            {patient.initials}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:T.ink }}>{patient.name}</div>
            <div style={{ fontSize:12, color:T.ink3, marginTop:2 }}>
              {new Date(session.started_at).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · Duration: {fmtHMS(session.duration_secs)}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Completion</div>
            <div style={{ fontSize:22, fontWeight:800, color:progress===100?T.green:T.navy }}>{progress}%</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop:14, height:6, background:T.bg2, borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:3, background:progress===100?T.green:T.navy, width:`${progress}%`, transition:"width .3s ease" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:T.ink3 }}>
          <span>{filled} of {sections.length} sections filled</span>
          {sections.filter(s=>s.required).length > 0 && (
            <span>* {sections.filter(s=>s.required).length} required</span>
          )}
        </div>
      </Card>

      {/* Behavior data summary */}
      {programs.length > 0 && (
        <Card style={{ marginBottom:20, padding:"16px 20px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:12 }}>Session data summary</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
            {programs.map(prog => {
              const typeColors = {
                frequency:{ color:T.red,   bg:T.redLt   },
                duration: { color:T.amber, bg:T.amberLt },
                interval: { color:T.navyMd,bg:T.navyLt  },
                rate:     { color:T.green, bg:T.greenLt  },
                latency:  { color:T.navy,  bg:T.navyLt   },
              };
              const tc = typeColors[prog.type] || { color:T.ink3, bg:T.bg2 };
              return (
                <div key={prog.id} style={{ background:tc.bg, borderRadius:8, padding:"10px 12px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:tc.color, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{prog.type}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink, lineHeight:1.3 }}>{prog.name}</div>
                  {prog.target && <div style={{ fontSize:11, color:T.ink3, marginTop:3 }}>Target: {prog.target}</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* No template warning */}
      {!template && (
        <Card style={{ marginBottom:20, background:T.amberLt, border:`1px solid ${T.amberMd}30` }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.amber }}>
            ⚠ No note template configured for this patient. Your BCBA will set one up.
          </div>
          <div style={{ fontSize:12, color:T.amber, marginTop:4 }}>You can still add free-text notes below.</div>
        </Card>
      )}

      {/* Template sections */}
      {sections.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
          {sections.map((section, i) => {
            const isFilled = !!responses[section.id]?.trim();
            return (
              <Card key={section.id} style={{ border:`1px solid ${isFilled?T.greenMd+"40":T.border}`, transition:"border-color .2s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:isFilled?T.green:T.navyLt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:isFilled?"#fff":T.navy, flexShrink:0, transition:"all .2s" }}>
                    {isFilled ? "✓" : i+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:T.ink }}>{section.title}</div>
                  </div>
                  {section.required && (
                    <span style={{ fontSize:10, fontWeight:700, background:T.redLt, color:T.red, padding:"2px 8px", borderRadius:99, textTransform:"uppercase", letterSpacing:".04em" }}>Required</span>
                  )}
                  {isFilled && (
                    <span style={{ fontSize:10, fontWeight:700, background:T.greenLt, color:T.green, padding:"2px 8px", borderRadius:99 }}>✓ Filled</span>
                  )}
                </div>
                <textarea
                  placeholder={section.placeholder || `Enter ${section.title.toLowerCase()}…`}
                  value={responses[section.id] || ""}
                  onChange={e => setResponses(r => ({ ...r, [section.id]: e.target.value }))}
                  rows={4}
                  style={{
                    width:"100%", border:`1px solid ${isFilled?T.greenMd+"40":T.border2}`,
                    borderRadius:8, padding:"10px 14px", fontSize:13, fontFamily:"inherit",
                    color:T.ink, background:T.bg, resize:"vertical", outline:"none", lineHeight:1.6,
                    transition:"border-color .2s",
                  }}
                />
                <div style={{ fontSize:11, color:T.ink3, marginTop:6, textAlign:"right" }}>
                  {responses[section.id]?.length || 0} characters
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Free text notes */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:4 }}>
          Additional notes
          <span style={{ fontSize:12, fontWeight:400, color:T.ink3, marginLeft:8 }}>optional</span>
        </div>
        <div style={{ fontSize:12, color:T.ink3, marginBottom:12 }}>Any additional observations not covered in the sections above</div>
        <textarea
          placeholder="Free-form observations, context, follow-up items…"
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          rows={3}
          style={{ width:"100%", border:`1px solid ${T.border2}`, borderRadius:8, padding:"10px 14px", fontSize:13, fontFamily:"inherit", color:T.ink, background:T.bg, resize:"vertical", outline:"none", lineHeight:1.6 }}
        />
      </Card>

      {/* Error */}
      {error && (
        <div style={{ background:T.redLt, border:`1px solid ${T.red}30`, borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:T.red, fontWeight:500 }}>
          ⚠ {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:"flex", gap:10, paddingBottom:32 }}>
        <Btn onClick={onSkip} variant="secondary" style={{ padding:"10px 20px" }}>Skip for now</Btn>
        <Btn onClick={handleSubmit} variant="primary" disabled={saving} style={{ flex:1 }}>
          {saving ? "Saving…" : "✓ Submit session note"}
        </Btn>
      </div>
    </div>
  );
}

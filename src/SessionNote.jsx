import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const C = {
  teal: "#0F6E56", tealLt: "#E1F5EE", tealMd: "#1D9E75", tealDk: "#085041",
  blue: "#185FA5", blueLt: "#E6F1FB", blueMd: "#378ADD",
  amber: "#BA7517", amberLt: "#FAEEDA", amberMd: "#EF9F27",
  red: "#A32D2D", redLt: "#FCEBEB", redMd: "#E24B4A",
  gray: "#5F5E5A", grayLt: "#F1EFE8", grayMd: "#888780",
};

const fmt = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const fmtHMS = (secs) => {
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

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
    const { data: tmpl } = await supabase
      .from("note_templates")
      .select("*")
      .eq("patient_id", patient.id)
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
    setLoading(false);
  };

  const handleSubmit = async () => {
    // Validate required sections
    const missing = sections.filter(s => s.required && !responses[s.id]?.trim());
    if (missing.length > 0) {
      setError(`Please fill in required sections: ${missing.map(s => s.title).join(", ")}`);
      return;
    }

    setSaving(true);
    setError("");

    // Create session note
    const { data: note, error: noteError } = await supabase
      .from("session_notes")
      .insert({
        session_id: session.id,
        template_id: template?.id || null,
        created_by: user.id,
        free_text: freeText,
      })
      .select()
      .single();

    if (noteError) { setError("Error saving note"); setSaving(false); return; }

    // Save responses
    const responseRows = sections
      .filter(s => responses[s.id]?.trim())
      .map(s => ({
        session_note_id: note.id,
        section_id: s.id,
        response: responses[s.id],
      }));

    if (responseRows.length > 0) {
      await supabase.from("note_responses").insert(responseRows);
    }

    setSaving(false);
    onComplete();
  };

  // Session data summary
  const getSessionSummary = () => {
    if (!session.data_points) return null;
    return programs.map(prog => {
      const points = (session.data_points || []).filter(d => d.program_id === prog.id);
      return { prog, points };
    });
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.grayMd }}>
      Loading template…
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: C.tealLt, border: `0.5px solid ${C.tealMd}40`, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: patient.color || C.blueMd, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
          {patient.initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.teal }}>Session Note — {patient.name}</div>
          <div style={{ fontSize: 11, color: C.tealMd, marginTop: 2 }}>
            {new Date(session.started_at).toLocaleDateString()} · Duration: {fmtHMS(session.duration_secs || 0)}
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.teal, background: "#fff", padding: "4px 10px", borderRadius: 8, fontWeight: 600 }}>
          {sections.filter(s => s.required).length} required fields
        </div>
      </div>

      {/* Data summary */}
      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>
          Session data summary
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {programs.map(prog => {
            const typeIcon = { frequency: "🔢", duration: "⏱", interval: "⬜", rate: "%" }[prog.type] || "📊";
            return (
              <div key={prog.id} style={{ background: prog.colorLt || C.grayLt, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: prog.color || C.gray, textTransform: "uppercase", marginBottom: 4 }}>
                  {typeIcon} {prog.type}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a18", lineHeight: 1.3 }}>{prog.name}</div>
                <div style={{ fontSize: 10, color: C.grayMd, marginTop: 2 }}>Target: {prog.target}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Template sections */}
      {sections.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          {sections.map((section, i) => (
            <div key={section.id} style={{ background: "#fff", border: `0.5px solid ${responses[section.id]?.trim() ? C.tealMd + "60" : "rgba(0,0,0,.12)"}`, borderRadius: 12, padding: "14px 18px", transition: "border-color .2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: responses[section.id]?.trim() ? C.teal : "rgba(0,0,0,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: responses[section.id]?.trim() ? "#fff" : C.grayMd, flexShrink: 0, transition: "all .2s" }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a18" }}>{section.title}</div>
                {section.required && (
                  <span style={{ fontSize: 9, fontWeight: 700, background: C.redLt, color: C.red, padding: "2px 6px", borderRadius: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>Required</span>
                )}
                {responses[section.id]?.trim() && (
                  <span style={{ fontSize: 9, fontWeight: 700, background: C.tealLt, color: C.teal, padding: "2px 6px", borderRadius: 6, marginLeft: "auto" }}>✓ Filled</span>
                )}
              </div>
              <textarea
                placeholder={section.placeholder || `Enter ${section.title.toLowerCase()}…`}
                value={responses[section.id] || ""}
                onChange={e => setResponses(r => ({ ...r, [section.id]: e.target.value }))}
                rows={4}
                style={{
                  width: "100%", border: "0.5px solid rgba(0,0,0,.15)", borderRadius: 8,
                  padding: "10px 12px", fontSize: 13, fontFamily: "inherit",
                  color: "#1a1a18", background: "#fafaf9", resize: "vertical",
                  outline: "none", lineHeight: 1.6,
                  borderColor: responses[section.id]?.trim() ? `${C.tealMd}60` : "rgba(0,0,0,.15)",
                }}
              />
              <div style={{ fontSize: 10, color: C.grayMd, marginTop: 4, textAlign: "right" }}>
                {responses[section.id]?.length || 0} characters
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: C.amberLt, border: `0.5px solid ${C.amberMd}40`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: C.amber }}>
          ⚠ No template configured for this patient. Your BCBA will set one up.
        </div>
      )}

      {/* Free text */}
      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a18", marginBottom: 10 }}>
          Additional notes <span style={{ fontSize: 11, color: C.grayMd, fontWeight: 400 }}>(optional)</span>
        </div>
        <textarea
          placeholder="Any additional observations, notes, or comments not covered above…"
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          rows={3}
          style={{ width: "100%", border: "0.5px solid rgba(0,0,0,.15)", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: "#1a1a18", background: "#fafaf9", resize: "vertical", outline: "none", lineHeight: 1.6 }}
        />
      </div>

      {/* Progress indicator */}
      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "12px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.gray }}>Completion</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>
            {Object.values(responses).filter(r => r?.trim()).length} / {sections.length} sections filled
          </div>
        </div>
        <div style={{ height: 6, background: "rgba(0,0,0,.08)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3, background: C.teal, transition: "width .3s",
            width: sections.length > 0 ? `${(Object.values(responses).filter(r => r?.trim()).length / sections.length) * 100}%` : "0%"
          }} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: C.redLt, border: `0.5px solid ${C.redMd}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.red }}>
          ⚠ {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, paddingBottom: 20 }}>
        <button onClick={onSkip}
          style={{ padding: "10px 20px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,.15)", background: "transparent", fontSize: 13, fontWeight: 500, cursor: "pointer", color: C.gray }}>
          Skip for now
        </button>
        <button onClick={handleSubmit} disabled={saving}
          style={{ flex: 1, padding: "10px 20px", borderRadius: 8, border: "none", background: saving ? "rgba(0,0,0,.1)" : C.teal, color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Saving…" : "Submit session note"}
        </button>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const T = {
  navy:"#0F2744",navyLt:"#E8EEF5",navyMd:"#1A3D6B",
  green:"#0D6E4E",greenLt:"#E6F5F0",greenMd:"#18A274",
  red:"#B91C1C",redLt:"#FEF2F2",
  amber:"#92400E",amberLt:"#FFFBEB",amberMd:"#D97706",
  ink:"#0F172A",ink2:"#334155",ink3:"#64748B",
  bg:"#F8F9FB",bg2:"#F1F3F7",white:"#FFFFFF",
  border:"rgba(15,23,42,.08)",border2:"rgba(15,23,42,.14)",
};

const fmtHMS = (s) => s ? `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}` : "—";

function Card({ children, style={} }) {
  return <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 24px", ...style }}>{children}</div>;
}

// mode: "view" (read-only) | "edit" (rbt edits) | "comment" (bcba adds comments)
export default function SessionNoteViewer({ session, patient, onClose, mode="view", userId }) {
  const [note, setNote] = useState(null);
  const [sections, setSections] = useState([]);
  const [responses, setResponses] = useState({});
  const [dataPoints, setDataPoints] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [bcbaComment, setBcbaComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, [session?.id]);

  const loadAll = async () => {
    setLoading(true);

    // Load programs
    const { data: progsData } = await supabase.from("programs").select("*").eq("patient_id", patient.id).eq("status","active");
    setPrograms(progsData||[]);

    // Load data points
    const { data: dpData } = await supabase.from("data_points").select("*").eq("session_id", session.id).order("recorded_at");
    setDataPoints(dpData||[]);

    // Load note with sections
    const { data: noteData } = await supabase.from("session_notes")
      .select("*, note_responses(*, note_sections(title, order_index))")
      .eq("session_id", session.id).single();

    if(noteData) {
      setNote(noteData);
      const resp = {};
      (noteData.note_responses||[]).forEach(r => { resp[r.note_sections?.title||r.section_id] = r.response; });
      setResponses(resp);
      setBcbaComment(noteData.bcba_comment||"");

      // Sort sections by order_index
      const sorted = (noteData.note_responses||[]).sort((a,b) => (a.note_sections?.order_index||0) - (b.note_sections?.order_index||0));
      setSections(sorted.map(r => ({ id: r.section_id, title: r.note_sections?.title||r.section_id, response: r.response })));
    }
    setLoading(false);
  };

  const saveBcbaComment = async () => {
    if(!note) return;
    setSaving(true);
    await supabase.from("session_notes").update({ bcba_comment: bcbaComment }).eq("id", note.id);
    setSaving(false);
    onClose();
  };

  const getSummary = (prog, pts) => {
    if(!pts.length) return { text:"No data", color:T.ink3 };
    const typeColors = {
      frequency:{ color:T.red, bg:T.redLt },
      duration:{ color:T.amber, bg:T.amberLt },
      rate:{ color:T.green, bg:T.greenLt },
      partial_interval:{ color:"#4C1D95", bg:"#F5F3FF" },
      whole_interval:{ color:"#4C1D95", bg:"#F5F3FF" },
      momentary_time_sampling:{ color:T.navy, bg:T.navyLt },
      abc_data:{ color:T.green, bg:T.greenLt },
      scatterplot:{ color:T.amber, bg:T.amberLt },
      permanent_product:{ color:T.ink2, bg:T.bg2 },
    };
    const tc = typeColors[prog.type]||{ color:T.ink3, bg:T.bg2 };
    let text = "";
    switch(prog.type) {
      case "frequency": text = `${pts.length} occurrences`; break;
      case "duration": { const t=pts.reduce((a,b)=>a+(parseFloat(b.value)||0),0); text=`${Math.floor(t/60)}m ${Math.round(t%60)}s`; break; }
      case "rate": { const y=pts.filter(d=>d.value==1).length; text=`${Math.round((y/pts.length)*100)}% (${y}/${pts.length})`; break; }
      case "partial_interval": case "whole_interval": case "momentary_time_sampling": { const o=pts.filter(d=>d.occurred).length; text=`${Math.round((o/pts.length)*100)}% (${o}/${pts.length} intervals)`; break; }
      case "abc_data": text=`${pts.length} episode${pts.length!==1?"s":""}`; break;
      default: text=`${pts.length} data points`;
    }
    return { text, color:tc.color, bg:tc.bg };
  };

  if(loading) return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:T.white, borderRadius:16, padding:48, fontSize:14, color:T.ink3 }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:T.bg, borderRadius:16, width:"min(680px, calc(100vw - 32px))", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        
        {/* Header */}
        <div style={{ padding:"20px 28px", borderBottom:`1px solid ${T.border}`, background:T.white, borderRadius:"16px 16px 0 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:T.ink }}>Session note</div>
            <div style={{ fontSize:12, color:T.ink3, marginTop:2 }}>
              {patient.name} · {new Date(session.started_at).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
              {session.rbt_name && ` · RBT: ${session.rbt_name}`}
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize:22, background:"none", border:"none", cursor:"pointer", color:T.ink3, lineHeight:1 }}>✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:"auto", padding:24 }}>

          {/* Session header card */}
          <Card style={{ marginBottom:16, padding:"14px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:patient.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff", flexShrink:0 }}>{patient.initials}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700 }}>{patient.name}</div>
                <div style={{ fontSize:12, color:T.ink3, marginTop:2 }}>{new Date(session.started_at).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} · Duration: {fmtHMS(session.duration_secs)}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em", marginBottom:3 }}>Status</div>
                <span style={{ fontSize:12, fontWeight:700, padding:"4px 12px", borderRadius:99, background:T.greenLt, color:T.green }}>✓ Documented</span>
              </div>
            </div>
          </Card>

          {/* Data summary */}
          {programs.length > 0 && (
            <Card style={{ marginBottom:16, padding:"14px 18px" }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Session data summary</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
                {programs.map(prog => {
                  const pts = dataPoints.filter(d=>d.program_id===prog.id);
                  const s = getSummary(prog, pts);
                  return (
                    <div key={prog.id} style={{ background:s.bg||T.bg2, borderRadius:8, padding:"10px 12px" }}>
                      <div style={{ fontSize:10, fontWeight:700, color:s.color, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{prog.type.replace(/_/g," ")}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:T.ink, marginBottom:4 }}>{prog.name}</div>
                      <div style={{ fontSize:16, fontWeight:800, color:s.color }}>{s.text}</div>
                      {prog.target && <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>Target: {prog.target}</div>}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Note sections — read only */}
          {sections.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
              {sections.map((s,i)=>(
                <Card key={s.id} style={{ padding:"14px 18px", border:`1px solid ${T.greenMd}40` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", background:T.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>✓</div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.ink }}>{s.title}</div>
                  </div>
                  <div style={{ fontSize:13, color:T.ink2, lineHeight:1.7, background:T.bg2, padding:"12px 14px", borderRadius:8, whiteSpace:"pre-wrap", minHeight:60 }}>
                    {s.response||"—"}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Free text */}
          {note?.free_text && (
            <Card style={{ marginBottom:16, padding:"14px 18px" }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:10 }}>Additional notes</div>
              <div style={{ fontSize:13, color:T.ink2, lineHeight:1.7, background:T.bg2, padding:"12px 14px", borderRadius:8, whiteSpace:"pre-wrap" }}>
                {note.free_text}
              </div>
            </Card>
          )}

          {/* BCBA comment section */}
          {(mode==="comment" || note?.bcba_comment) && (
            <Card style={{ padding:"14px 18px", border:`1px solid ${T.navy}30` }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.navy, marginBottom:10 }}>
                🧠 BCBA observations
                {mode!=="comment" && <span style={{ fontSize:12, fontWeight:400, color:T.ink3, marginLeft:8 }}>read only</span>}
              </div>
              {mode==="comment" ? (
                <textarea
                  value={bcbaComment}
                  onChange={e=>setBcbaComment(e.target.value)}
                  rows={4}
                  placeholder="Add clinical observations, notes for supervision, or follow-up items…"
                  style={{ width:"100%", border:`1px solid ${T.border2}`, borderRadius:8, padding:"10px 14px", fontSize:13, fontFamily:"inherit", color:T.ink, background:T.bg, resize:"vertical", outline:"none", lineHeight:1.6 }}
                />
              ) : (
                <div style={{ fontSize:13, color:T.ink2, lineHeight:1.7, background:T.navyLt, padding:"12px 14px", borderRadius:8, whiteSpace:"pre-wrap" }}>
                  {note?.bcba_comment||"—"}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${T.border}`, background:T.white, borderRadius:"0 0 16px 16px", display:"flex", gap:10, flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, fontSize:13, fontWeight:600, cursor:"pointer", color:T.ink2 }}>
            Close
          </button>
          {mode==="comment" && (
            <button onClick={saveBcbaComment} disabled={saving}
              style={{ flex:2, padding:"10px 0", borderRadius:8, border:"none", background:T.navy, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              {saving?"Saving…":"💾 Save observations"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

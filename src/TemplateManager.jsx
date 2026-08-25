import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const T = {
  navy:"#0F2744",navyLt:"#E8EEF5",navyMd:"#1A3D6B",
  green:"#0D6E4E",greenLt:"#E6F5F0",greenMd:"#18A274",
  red:"#B91C1C",redLt:"#FEF2F2",redMd:"#DC2626",
  amber:"#92400E",amberLt:"#FFFBEB",amberMd:"#D97706",
  ink:"#0F172A",ink2:"#334155",ink3:"#64748B",
  bg:"#F8F9FB",bg2:"#F1F3F7",white:"#FFFFFF",
  border:"rgba(15,23,42,.08)",border2:"rgba(15,23,42,.14)",
};

function Btn({ onClick, children, variant="secondary", disabled, style={} }) {
  const v = {
    primary:  { background:T.navy,  color:"#fff", border:"none" },
    success:  { background:T.green, color:"#fff", border:"none" },
    danger:   { background:T.redLt, color:T.red,  border:`1px solid ${T.red}30` },
    secondary:{ background:T.white, color:T.ink2, border:`1px solid ${T.border2}` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...v[variant], padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600,
        display:"flex", alignItems:"center", gap:6, cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?.5:1, ...style }}>
      {children}
    </button>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 24px", ...style }}>{children}</div>;
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function TemplateManager({ user, patients, showToast }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("note_templates")
      .select("*, note_sections(*)")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  const createTemplate = async (basedOn = null) => {
    const name = basedOn ? `Copy of ${basedOn.name}` : "New template";
    const { data: tmpl } = await supabase.from("note_templates").insert({
      name, description: "", created_by: user.id,
      based_on: basedOn?.id || null,
    }).select().single();

    if (tmpl && basedOn?.note_sections?.length) {
      const sections = basedOn.note_sections.map(s => ({
        template_id: tmpl.id, title: s.title,
        placeholder: s.placeholder, required: s.required, order_index: s.order_index,
      }));
      await supabase.from("note_sections").insert(sections);
    } else if (tmpl) {
      await supabase.from("note_sections").insert([
        { template_id:tmpl.id, title:"Antecedents", placeholder:"Describe what happened before the behaviors occurred…", required:true, order_index:1 },
        { template_id:tmpl.id, title:"Behavior Description", placeholder:"Describe the behaviors observed in detail…", required:true, order_index:2 },
        { template_id:tmpl.id, title:"Consequences", placeholder:"Describe what happened immediately after each behavior…", required:true, order_index:3 },
      ]);
    }

    await loadTemplates();
    showToast(basedOn ? "Template duplicated ✓" : "Template created ✓");
    const { data: fresh } = await supabase.from("note_templates").select("*, note_sections(*)").eq("id", tmpl.id).single();
    setEditingTemplate(fresh);
    setView("editor");
  };

  const deleteTemplate = async (id) => {
    await supabase.from("note_templates").delete().eq("id", id);
    showToast("Template deleted");
    loadTemplates();
  };

  if (view === "editor" && editingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate}
        patients={patients}
        user={user}
        showToast={showToast}
        onBack={() => { setView("list"); loadTemplates(); setEditingTemplate(null); }}
      />
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:T.ink, letterSpacing:"-.5px" }}>Note templates</div>
          <div style={{ fontSize:13, color:T.ink3, marginTop:3 }}>{templates.length} templates</div>
        </div>
        <Btn onClick={() => createTemplate()} variant="primary">+ New template</Btn>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:T.ink3 }}>Loading…</div>
      ) : templates.length === 0 ? (
        <Card style={{ textAlign:"center", padding:60 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📝</div>
          <div style={{ fontSize:18, fontWeight:700, color:T.ink2, marginBottom:6 }}>No templates yet</div>
          <div style={{ fontSize:13, color:T.ink3, marginBottom:20 }}>Create your first session note template</div>
          <Btn onClick={() => createTemplate()} variant="primary" style={{ margin:"0 auto" }}>+ Create template</Btn>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {templates.map(tmpl => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              patients={patients}
              onEdit={() => { setEditingTemplate(tmpl); setView("editor"); }}
              onDuplicate={() => createTemplate(tmpl)}
              onDelete={() => deleteTemplate(tmpl.id)}
              showToast={showToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({ template, patients, onEdit, onDuplicate, onDelete, showToast }) {
  const [showAssign, setShowAssign] = useState(false);
  const [assignedIds, setAssignedIds] = useState([]);

  useEffect(() => { loadAssigned(); }, [template.id]);

  const loadAssigned = async () => {
    const { data } = await supabase
      .from("template_patient_assignments")
      .select("patient_id")
      .eq("template_id", template.id);
    setAssignedIds((data||[]).map(a => a.patient_id));
  };

  const assign = async (patientId) => {
    await supabase.from("template_patient_assignments").insert({
      template_id: template.id, patient_id: patientId
    });
    showToast("Patient assigned ✓");
    loadAssigned();
  };

  const unassign = async (patientId) => {
    await supabase.from("template_patient_assignments")
      .delete()
      .eq("template_id", template.id)
      .eq("patient_id", patientId);
    showToast("Patient removed");
    loadAssigned();
  };

  const sections = template.note_sections || [];
  const assignedPatients = patients.filter(p => assignedIds.includes(p.id));
  const unassignedPatients = patients.filter(p => !assignedIds.includes(p.id));

  return (
    <Card>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:14 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:700, color:T.ink }}>{template.name}</div>
          {template.description && <div style={{ fontSize:12, color:T.ink3, marginTop:3 }}>{template.description}</div>}
          {template.based_on && <div style={{ fontSize:11, color:T.amber, marginTop:3, fontWeight:500 }}>📋 Based on another template</div>}
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em" }}>Sections</div>
          <div style={{ fontSize:24, fontWeight:800, color:T.navy }}>{sections.length}</div>
        </div>
      </div>

      {/* Sections preview */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
        {sections.sort((a,b)=>a.order_index-b.order_index).map(s=>(
          <span key={s.id} style={{ fontSize:11, padding:"3px 10px", borderRadius:99,
            background:s.required?T.navyLt:T.bg2, color:s.required?T.navy:T.ink3, fontWeight:s.required?600:400 }}>
            {s.required&&<span style={{ marginRight:2 }}>*</span>}{s.title}
          </span>
        ))}
      </div>

      {/* Patient assignments */}
      <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.ink3, textTransform:"uppercase", letterSpacing:".06em" }}>
            Assigned patients ({assignedPatients.length})
          </div>
          <button onClick={() => setShowAssign(!showAssign)}
            style={{ fontSize:12, color:T.navy, fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>
            {showAssign ? "▲ Close" : "▼ Manage"}
          </button>
        </div>

        {/* Currently assigned */}
        {assignedPatients.length === 0 ? (
          <div style={{ fontSize:12, color:T.ink3, fontStyle:"italic", marginBottom: showAssign?10:0 }}>Not assigned to any patient yet</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom: showAssign?10:0 }}>
            {assignedPatients.map(p=>(
              <div key={p.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:T.greenLt, borderRadius:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:26, height:26, borderRadius:"50%", background:p.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff" }}>{p.initials}</div>
                  <span style={{ fontSize:13, fontWeight:600, color:T.green }}>{p.name}</span>
                  <span style={{ fontSize:11, color:T.greenMd }}>✓ Using this template</span>
                </div>
                {showAssign && (
                  <button onClick={() => unassign(p.id)}
                    style={{ fontSize:11, padding:"4px 10px", borderRadius:6, border:`1px solid ${T.red}30`, background:T.redLt, color:T.red, cursor:"pointer", fontWeight:600 }}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Assign to more patients */}
        {showAssign && (
          <div>
            {unassignedPatients.length > 0 ? (
              <>
                <div style={{ fontSize:11, fontWeight:600, color:T.ink3, marginBottom:8, marginTop:4 }}>Add patients:</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {unassignedPatients.map(p=>(
                    <div key={p.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:T.bg2, borderRadius:8, border:`1px solid ${T.border}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:26, height:26, borderRadius:"50%", background:p.color||T.navyMd, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff" }}>{p.initials}</div>
                        <span style={{ fontSize:13, fontWeight:500, color:T.ink2 }}>{p.name}</span>
                      </div>
                      <button onClick={() => assign(p.id)}
                        style={{ fontSize:12, padding:"5px 12px", borderRadius:6, border:"none", background:T.navy, color:"#fff", cursor:"pointer", fontWeight:600 }}>
                        + Assign
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontSize:12, color:T.green, fontWeight:500 }}>✓ All patients are assigned to this template</div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        <Btn onClick={onEdit} variant="primary" style={{ flex:1 }}>✏️ Edit</Btn>
        <Btn onClick={onDuplicate} style={{ flex:1 }}>📋 Duplicate</Btn>
        <Btn onClick={onDelete} variant="danger" style={{ padding:"8px 14px" }}>🗑</Btn>
      </div>
    </Card>
  );
}

// ─── Template Editor ──────────────────────────────────────────────────────────
function TemplateEditor({ template, patients, user, showToast, onBack }) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description||"");
  const [sections, setSections] = useState(
    (template.note_sections||[]).sort((a,b)=>a.order_index-b.order_index)
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from("note_templates").update({ name, description }).eq("id", template.id);
    for (const s of sections) {
      if (s.id && !s.id.startsWith("new-")) {
        await supabase.from("note_sections").update({
          title:s.title, placeholder:s.placeholder,
          required:s.required, order_index:s.order_index
        }).eq("id", s.id);
      } else {
        await supabase.from("note_sections").insert({
          template_id:template.id, title:s.title,
          placeholder:s.placeholder, required:s.required, order_index:s.order_index
        });
      }
    }
    showToast("Template saved ✓");
    setSaving(false);
    onBack();
  };

  const addSection = () => {
    setSections(s => [...s, {
      id:`new-${Date.now()}`, title:"New section",
      placeholder:"Enter details…", required:false, order_index:s.length+1
    }]);
  };

  const updateSection = (id, field, value) => {
    setSections(s => s.map(sec => sec.id===id ? {...sec,[field]:value} : sec));
  };

  const removeSection = async (id) => {
    if (!id.startsWith("new-")) await supabase.from("note_sections").delete().eq("id", id);
    setSections(s => s.filter(sec=>sec.id!==id));
  };

  const moveSection = (id, dir) => {
    setSections(s => {
      const idx = s.findIndex(sec=>sec.id===id);
      if (dir==="up"&&idx===0) return s;
      if (dir==="down"&&idx===s.length-1) return s;
      const n = [...s];
      const swap = dir==="up" ? idx-1 : idx+1;
      [n[idx],n[swap]] = [n[swap],n[idx]];
      return n.map((sec,i)=>({...sec,order_index:i+1}));
    });
  };

  const inputStyle = {
    width:"100%", padding:"10px 14px", borderRadius:8, fontSize:13,
    border:`1px solid ${T.border2}`, background:T.white, outline:"none",
    color:T.ink, fontFamily:"inherit",
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
        <button onClick={onBack} style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${T.border2}`, background:T.white, fontSize:13, fontWeight:600, cursor:"pointer", color:T.ink2 }}>
          ← Back
        </button>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:T.ink, letterSpacing:"-.5px" }}>Edit template</div>
          <div style={{ fontSize:13, color:T.ink3, marginTop:2 }}>{sections.length} sections</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <Btn onClick={onBack}>Cancel</Btn>
          <Btn onClick={save} variant="success" disabled={saving}>{saving?"Saving…":"✓ Save template"}</Btn>
        </div>
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Template info</div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Template name</div>
          <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} placeholder="e.g. Standard ABA Session Note" />
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:T.ink3, marginBottom:6 }}>Description <span style={{ fontWeight:400 }}>(optional)</span></div>
          <input value={description} onChange={e=>setDescription(e.target.value)} style={inputStyle} placeholder="Brief description of when to use this template" />
        </div>
      </Card>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:700 }}>Sections</div>
        <Btn onClick={addSection} variant="primary" style={{ padding:"7px 14px" }}>+ Add section</Btn>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {sections.map((section, idx) => (
          <Card key={section.id} style={{ padding:"16px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:T.navyLt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:T.navy, flexShrink:0 }}>{idx+1}</div>
              <input value={section.title} onChange={e=>updateSection(section.id,"title",e.target.value)}
                style={{ ...inputStyle, fontWeight:600, fontSize:14, flex:1 }} placeholder="Section title" />
              <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                <button onClick={()=>moveSection(section.id,"up")} disabled={idx===0}
                  style={{ padding:"6px 8px", borderRadius:6, border:`1px solid ${T.border2}`, background:T.white, cursor:idx===0?"not-allowed":"pointer", opacity:idx===0?.4:1, fontSize:12 }}>↑</button>
                <button onClick={()=>moveSection(section.id,"down")} disabled={idx===sections.length-1}
                  style={{ padding:"6px 8px", borderRadius:6, border:`1px solid ${T.border2}`, background:T.white, cursor:idx===sections.length-1?"not-allowed":"pointer", opacity:idx===sections.length-1?.4:1, fontSize:12 }}>↓</button>
                <button onClick={()=>removeSection(section.id)}
                  style={{ padding:"6px 8px", borderRadius:6, border:`1px solid ${T.red}30`, background:T.redLt, cursor:"pointer", fontSize:12, color:T.red }}>✕</button>
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:600, color:T.ink3, marginBottom:6 }}>Placeholder text</div>
              <textarea value={section.placeholder||""} onChange={e=>updateSection(section.id,"placeholder",e.target.value)} rows={2}
                style={{ ...inputStyle, resize:"vertical", lineHeight:1.5 }} placeholder="Instructions for the RBT filling this section…" />
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
              <input type="checkbox" checked={section.required} onChange={e=>updateSection(section.id,"required",e.target.checked)}
                style={{ width:16, height:16, accentColor:T.navy }} />
              <span style={{ fontWeight:500, color:T.ink2 }}>Required field</span>
              <span style={{ fontSize:11, color:T.ink3 }}>— RBT must fill this before submitting</span>
            </label>
          </Card>
        ))}
      </div>

      {sections.length === 0 && (
        <Card style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
          <div style={{ fontSize:15, fontWeight:600, color:T.ink2, marginBottom:4 }}>No sections yet</div>
          <div style={{ fontSize:13, color:T.ink3, marginBottom:16 }}>Add sections to define the structure of this note</div>
          <Btn onClick={addSection} variant="primary" style={{ margin:"0 auto" }}>+ Add first section</Btn>
        </Card>
      )}

      {sections.length > 0 && (
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
          <Btn onClick={onBack}>Cancel</Btn>
          <Btn onClick={save} variant="success" disabled={saving}>{saving?"Saving…":"✓ Save template"}</Btn>
        </div>
      )}
    </div>
  );
}

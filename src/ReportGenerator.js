import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const NAVY = [15, 39, 68];
const GREEN = [13, 110, 78];
const GRAY = [100, 116, 139];
const LIGHT = [248, 249, 251];
const WHITE = [255, 255, 255];

const fmtHMS = (s) => {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" }) : "—";

const summarizeProgram = (prog, dataPoints) => {
  const pts = dataPoints.filter(d => d.program_id === prog.id);
  if (!pts.length) return "No data recorded";

  switch (prog.type) {
    case "frequency":
      return `${pts.length} occurrence${pts.length !== 1 ? "s" : ""} recorded`;
    case "duration": {
      const total = pts.reduce((a, b) => a + (parseFloat(b.value) || 0), 0);
      const m = Math.floor(total / 60);
      const s = Math.round(total % 60);
      return `${m}m ${s}s total duration`;
    }
    case "rate": {
      const yes = pts.filter(d => d.value == 1).length;
      const pct = Math.round((yes / pts.length) * 100);
      return `${pct}% compliance (${yes}/${pts.length})`;
    }
    case "partial_interval":
    case "whole_interval":
    case "momentary_time_sampling": {
      const occurred = pts.filter(d => d.occurred).length;
      const pct = Math.round((occurred / pts.length) * 100);
      return `${pct}% (${occurred}/${pts.length} intervals)`;
    }
    case "abc_data":
      return `${pts.length} episode${pts.length !== 1 ? "s" : ""} recorded`;
    case "scatterplot":
      return `${pts.length} occurrence${pts.length !== 1 ? "s" : ""} recorded`;
    case "permanent_product":
      return `${pts.length} product${pts.length !== 1 ? "s" : ""} recorded`;
    default:
      return `${pts.length} data points`;
  }
};

export const generateSessionReport = ({ session, patient, programs, dataPoints, sessionNote, responses }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 0;

  // ─── Header ───────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 32, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ABA Collect", 14, 13);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 220);
  doc.text("Session Report", 14, 20);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}`, 14, 26);

  // ─── Patient info ──────────────────────────────────────────────────────────
  y = 42;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(14, y - 6, pageW - 28, 34, 3, 3, "F");

  doc.setTextColor(...NAVY);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(patient?.name || "Unknown Patient", 20, y + 4);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  const info = [
    patient?.diagnosis ? `Diagnosis: ${patient.diagnosis}` : null,
    `Date: ${fmtDate(session?.started_at)}`,
    `Time: ${fmtTime(session?.started_at)} — ${fmtTime(session?.ended_at)}`,
    `Duration: ${fmtHMS(session?.duration_secs)}`,
    session?.rbt_name ? `RBT: ${session.rbt_name}` : null,
  ].filter(Boolean);

  info.forEach((line, i) => {
    doc.text(line, 20, y + 13 + i * 5);
  });

  // ─── Data summary ──────────────────────────────────────────────────────────
  y += 42;
  doc.setTextColor(...NAVY);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Program Data Summary", 14, y);

  y += 6;

  if (!programs || programs.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text("No programs recorded in this session.", 14, y + 6);
    y += 14;
  } else {
    const tableData = programs.map(prog => {
      const typeLabel = prog.type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || prog.type;
      const summary = summarizeProgram(prog, dataPoints || []);
      const target = prog.target || "—";
      const pts = (dataPoints || []).filter(d => d.program_id === prog.id);
      const status = pts.length > 0 ? "✓ Data recorded" : "No data";
      return [prog.name, typeLabel, summary, target, status];
    });

    autoTable(doc, {
      startY: y,
      head: [["Program", "Type", "Result", "Target", "Status"]],
      body: tableData,
      margin: { left: 14, right: 14 },
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontSize: 9,
        fontStyle: "bold",
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 40, 60],
        cellPadding: 3.5,
      },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 32 },
        2: { cellWidth: 55 },
        3: { cellWidth: 28 },
        4: { cellWidth: 28 },
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ─── ABC Episodes ──────────────────────────────────────────────────────────
  const abcProgs = (programs || []).filter(p => p.type === "abc_data");
  if (abcProgs.length > 0 && dataPoints?.length > 0) {
    abcProgs.forEach(prog => {
      const episodes = dataPoints.filter(d => d.program_id === prog.id && d.type === "abc_data");
      if (!episodes.length) return;

      if (y > pageH - 60) { doc.addPage(); y = 20; }

      doc.setTextColor(...NAVY);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`ABC Data — ${prog.name}`, 14, y);
      y += 6;

      const abcData = episodes.map((ep, i) => [
        `#${i + 1}`,
        ep.antecedent || "—",
        ep.behavior || "—",
        ep.consequence || "—",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["#", "Antecedent (A)", "Behavior (B)", "Consequence (C)"]],
        body: abcData,
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: [13, 110, 78], textColor: WHITE, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, textColor: [30, 40, 60], cellPadding: 3 },
        alternateRowStyles: { fillColor: [230, 245, 240] },
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 52 }, 2: { cellWidth: 52 }, 3: { cellWidth: 52 } },
      });
      y = doc.lastAutoTable.finalY + 10;
    });
  }

  // ─── Session Note ──────────────────────────────────────────────────────────
  if (sessionNote || responses) {
    if (y > pageH - 60) { doc.addPage(); y = 20; }

    doc.setTextColor(...NAVY);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Session Documentation", 14, y);
    y += 8;

    // Structured responses
    if (responses && Object.keys(responses).length > 0) {
      Object.entries(responses).forEach(([sectionTitle, text]) => {
        if (!text?.trim()) return;
        if (y > pageH - 40) { doc.addPage(); y = 20; }

        doc.setFillColor(...LIGHT);
        doc.roundedRect(14, y - 4, pageW - 28, 6, 1, 1, "F");
        doc.setTextColor(...NAVY);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(sectionTitle, 18, y + 0.5);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 60, 80);
        doc.setFontSize(8.5);
        const lines = doc.splitTextToSize(text, pageW - 32);
        lines.forEach(line => {
          if (y > pageH - 20) { doc.addPage(); y = 20; }
          doc.text(line, 18, y);
          y += 5;
        });
        y += 4;
      });
    }

    // Free text note
    if (sessionNote?.trim()) {
      if (y > pageH - 40) { doc.addPage(); y = 20; }
      doc.setTextColor(...NAVY);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Additional notes", 14, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 60, 80);
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(sessionNote, pageW - 32);
      lines.forEach(line => {
        if (y > pageH - 20) { doc.addPage(); y = 20; }
        doc.text(line, 18, y);
        y += 5;
      });
    }
  }

  // ─── Footer ────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...LIGHT);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text("ABA Collect — Confidential Clinical Document", 14, pageH - 4.5);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 4.5, { align: "right" });
  }

  const filename = `session_${patient?.name?.replace(/\s+/g, "_") || "patient"}_${new Date(session?.started_at).toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
};
// ─── ABA Collect Design System ────────────────────────────────────────────────

export const T = {
  // Colors
  navy:     "#1E3A5F",
  navyLt:   "#EEF3F9",
  navyMd:   "#2E5491",
  navyDk:   "#142840",
  sage:     "#2D8C5E",
  sageLt:   "#E8F5EE",
  sageMd:   "#4CAF82",
  coral:    "#C94F35",
  coralLt:  "#FDEEE9",
  coralMd:  "#E8644A",
  amber:    "#B45309",
  amberLt:  "#FEF3C7",
  amberMd:  "#F59E0B",
  indigo:   "#4338CA",
  indigoLt: "#EEF2FF",
  indigoMd: "#6366F1",
  slate:    "#475569",
  slateLt:  "#F8FAFC",
  slateMd:  "#94A3B8",
  bg:       "#FAFAF8",
  bg2:      "#F4F3EF",
  white:    "#FFFFFF",
  ink:      "#1A2332",
  ink2:     "#3D4F63",
  ink3:     "#6B7A8D",
};

// Typography scale
export const font = {
  xs:   "11px",
  sm:   "12px",
  base: "13px",
  md:   "14px",
  lg:   "15px",
  xl:   "17px",
  xxl:  "22px",
  hero: "32px",
};

// Shadows
export const shadow = {
  xs:  "0 1px 2px rgba(0,0,0,.05)",
  sm:  "0 1px 4px rgba(0,0,0,.08)",
  md:  "0 2px 8px rgba(0,0,0,.10)",
  lg:  "0 4px 16px rgba(0,0,0,.12)",
};

// Border radius
export const radius = {
  sm:  "6px",
  md:  "10px",
  lg:  "14px",
  xl:  "20px",
  full: "999px",
};

// Sidebar styles
export const sidebar = {
  width: 240,
  bg: `linear-gradient(160deg, #1E3A5F 0%, #142840 100%)`,
  text: "rgba(255,255,255,.75)",
  textActive: "#FFFFFF",
  itemBg: "rgba(255,255,255,.10)",
  itemBgHover: "rgba(255,255,255,.07)",
  border: "rgba(255,255,255,.08)",
};

// Role badge styles
export const roleBadge = {
  admin:            { bg: "#FDEEE9", color: "#C94F35" },
  clinical_director:{ bg: "#EEF2FF", color: "#4338CA" },
  bcba:             { bg: "#E8F5EE", color: "#2D8C5E" },
  rbt:              { bg: "#F4F3EF", color: "#475569" },
};

// Type badge colors
export const typeBadge = {
  frequency: { bg: "#FDEEE9", color: "#C94F35" },
  duration:  { bg: "#FEF3C7", color: "#B45309" },
  interval:  { bg: "#EEF2FF", color: "#4338CA" },
  rate:      { bg: "#E8F5EE", color: "#2D8C5E" },
  latency:   { bg: "#EEF3F9", color: "#2E5491" },
};

// Global CSS string
export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: ${T.bg};
    color: ${T.ink};
    font-size: 13px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  button {
    font-family: 'Inter', system-ui, sans-serif;
    transition: all .15s ease;
  }
  button:hover { opacity: .88; transform: translateY(-1px); }
  button:active { transform: translateY(0); }

  textarea, input, select {
    font-family: 'Inter', system-ui, sans-serif;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(76,175,130,.4); }
    50% { opacity: .7; box-shadow: 0 0 0 4px rgba(76,175,130,0); }
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: .3; }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .fade-in { animation: fadeIn .25s ease forwards; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,.2); }
`;
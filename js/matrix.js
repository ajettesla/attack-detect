/* matrix.js — renders the ATT&CK matrix */
function esc(s) { return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """).replace(/'/g, "'"); }

function renderMatrix(filter = "") {
  const q = filter.toLowerCase().trim();
  const tactics = DB.tactics;
  const techs = DB.techniques;

  const header = tactics.map(t => `<th scope="col" class="tactic-col" data-tactic="${esc(t.id)}">${esc(t.name)}<br><span class="tactic-id">${esc(t.id)}</span></th>`).join("");

  const rows = [];
  const maxLen = Math.max(...tactics.map(t => techs.filter(x => x.tacticId === t.id).length));
  for (let i = 0; i < maxLen; i++) {
    const cells = tactics.map(t => {
      const list = techs.filter(x => x.tacticId === t.id);
      const tech = list[i];
      if (!tech) return "<td></td>";
      const match = !q || tech.name.toLowerCase().includes(q) || tech.id.toLowerCase().includes(q) || tech.summary.toLowerCase().includes(q);
      return `<td class="${match ? "" : "dim"}"><button class="cell-btn" data-route="#/technique/${esc(tech.id)}">${esc(tech.name)}<br><span class="cell-id">${esc(tech.id)}</span></button></td>`;
    }).join("");
    rows.push("<tr>" + cells + "</tr>");
  }

  return `<div class="matrix-wrap"><table class="matrix" role="grid"><thead><tr>${header}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
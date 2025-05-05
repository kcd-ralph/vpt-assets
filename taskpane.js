let vulnData = [];
let perimeterText = "";
let refCounter = 1;

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    // Wait for the DOM to load
    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("insert-table").onclick = insertSelectedTables;
      document.getElementById("load-json").onclick = loadJson;
    });
  }
});

async function loadJson() {
  const response = await fetch("https://kcd-ralph.github.io/vpt-assets/dbv.json");
  const json = await response.json();
  vulnData = json.vulnerabilities || [];
  perimeterText = json.perimeter || "";

  const listContainer = document.getElementById("vuln-list");
  listContainer.innerHTML = "";

  vulnData.forEach((vuln, index) => {
    const label = document.createElement("label");
    label.className = "checkbox-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = index;

    const span = document.createElement("span");
    span.textContent = vuln.IdentifiedIssue;

    label.appendChild(checkbox);
    label.appendChild(span);
    listContainer.appendChild(label);
  });
}

async function insertSelectedTables() {
  const checked = Array.from(document.querySelectorAll("#vuln-list input:checked"));
  for (let checkbox of checked) {
    const vuln = vulnData[checkbox.value];
    await insertVulnTable(vuln, perimeterText);
  }
}

async function insertVulnTable(vuln, perimeter) {
  await Word.run(async (context) => {
    const range = context.document.getSelection();

    const safe = (val) => (val ? String(val) : "—");
    const ref = `V - ${refCounter++}`;

    const table = range.insertTable(
      6,
      5,
      Word.InsertLocation.before,
      [
        ["Ref.", "Identified issue", "Impact", "Criticality", "Exploitability"],
        [
          ref,
          safe(vuln.IdentifiedIssue),
          safe(vuln.Impact),
          safe(vuln.Criticality),
          safe(vuln.Exploitability),
        ],
        ["Description", safe(vuln.Description), "", "", ""],
        ["Risks", safe(vuln.Risks), "", "", ""],
        ["Recommendations", safe(vuln.Recommendations), "", "", ""],
        ["System(s)", perimeter, "", "", ""],
      ]
    );

    await context.sync();

    for (let rowIndex = 2; rowIndex <= 5; rowIndex++) {
      table.mergeCells(rowIndex, 1, rowIndex, 4);
    }

    await context.sync();

    const rows = table.rows;
    rows.load("items");
    await context.sync();

    styleHeaderRow(rows.items[0]);

    for (let i = 1; i < rows.items.length; i++) {
      rows.items[i].cells[0].shadingColor = "#eeeeee";
    }

    await context.sync();
  });
}

function styleHeaderRow(row) {
  for (let cell of row.cells.items) {
    cell.font.bold = true;
    cell.shadingColor = "#c2d9f0";
  }
}

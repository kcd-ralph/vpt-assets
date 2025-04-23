/* eslint-disable no-undef */

let vulnerabilities = [];
let refCounter = 1;

Office.onReady(() => {
  loadVulnerabilities();

  document.getElementById("insert-btn").onclick = async () => {
    const selectedIndex = document.getElementById("vuln-select").value;

    if (selectedIndex === "") {
      setStatus("Please select a vulnerability.");
      return;
    }

    const vuln = vulnerabilities[selectedIndex];
    const perimeter = document.getElementById("perimeter-input").value.trim();

    if (!perimeter) {
      setStatus("Perimeter is required.");
      return;
    }

    try {
      await insertVulnTable(vuln, perimeter);
      setStatus(`✅ Inserted: ${vuln.IdentifiedIssue}`);
    } catch (err) {
      console.error("Insert failed:", err);
      document.getElementById("errorDiv").textContent = `⚠️ Insert failed: ${err.message || err}`;
    }
  };
});

async function loadVulnerabilities() {
  try {
    const response = await fetch("https://kcd-ralph.github.io/vpt-assets/dbv.json");

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid data format: expected an array.");
    }

    vulnerabilities = data;

    const select = document.getElementById("vuln-select");
    select.innerHTML = '<option value="">Select a vulnerability</option>';

    vulnerabilities.forEach((vuln, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = vuln.IdentifiedIssue || `Unnamed Issue ${index + 1}`;
      select.appendChild(option);
    });

    setStatus("✅ Vulnerability database loaded.");
  } catch (err) {
    console.error("Failed to load dbv.json:", err);
    setStatus("⚠️ Could not load vulnerability database:", err);
  }
}


async function insertVulnTable(vuln, perimeter) {
  await Word.run(async (context) => {
    const body = context.document.body;
    const safe = (val) => (val ? String(val) : "—");
    const ref = `V - ${refCounter++}`;

    const table = body.insertTable(6, 5, Word.RangeLocation.start, [
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
    ]);

    await context.sync();

    // Merge columns 1–4 in rows 2–5
    for (let rowIndex = 2; rowIndex <= 5; rowIndex++) {
      table.mergeCells(rowIndex, 1, rowIndex, 4);
    }

    await context.sync();

    const rows = table.rows;
    rows.load("items");
    await context.sync();

    const headerRow = rows.items[0];
    styleHeaderRow(headerRow);

    for (let i = 1; i < rows.items.length; i++) {
      rows.items[1].font.bold = true
      rows.items[1].setCellPadding(Word.CellPaddingLocation.top, 5)
      rows.items[1].setCellPadding(Word.CellPaddingLocation.bottom, 5)

      rows.items[2].setCellPadding(Word.CellPaddingLocation.top, 15)
      rows.items[2].setCellPadding(Word.CellPaddingLocation.bottom, 15)
      rows.items[3].setCellPadding(Word.CellPaddingLocation.top, 15)
      rows.items[3].setCellPadding(Word.CellPaddingLocation.bottom, 15)
      rows.items[4].setCellPadding(Word.CellPaddingLocation.top, 15)
      rows.items[4].setCellPadding(Word.CellPaddingLocation.bottom, 15)
      rows.items[5].setCellPadding(Word.CellPaddingLocation.top, 15)
      rows.items[5].setCellPadding(Word.CellPaddingLocation.bottom, 15)

      const row = rows.items[i];
      row.font.name = "Cambria (Body)";
      row.font.size = 12;
      row.verticalAlignment = Word.VerticalAlignment.center;

      row.cells.load("items");
      await context.sync();

      const cells = row.cells.items;

      // Bold only the first column (column 0) in rows 2–5
      if (i >= 2 && i <= 5 && cells[0]) {
        // cells[0].font.bold = true;
        cells[0].shadingColor = "#003366";
      }

      // Make column 1 not bold in rows 2–5
      // if (i >= 2 && i <= 5 && cells[1]) {
        // cells[1].font.bold = false;
      // }

      // Alignment setup
      cells.forEach((cell, j) => {
        if (i === 1) {
          // Row 1: main vuln data
          if (j === 0) cell.horizontalAlignment = Word.Alignment.centered;
          else if (j === 1) cell.horizontalAlignment = Word.Alignment.left;
          else cell.horizontalAlignment = Word.Alignment.centered;
        } else {
          if (j === 0) cell.horizontalAlignment = Word.Alignment.centered;
          else if (j === 1) cell.horizontalAlignment = Word.Alignment.left;
        }
      });

      // Shading for Criticality & Exploitability
      if (i === 1) {
        const crit = cells[3]?.value;
        const exp = cells[4]?.value;

        if (crit === "Low") cells[3].shadingColor = "yellow";
        else if (crit === "Medium") cells[3].shadingColor = "orange";
        else if (crit === "High") cells[3].shadingColor = "red";

        if (exp === "Hacker") cells[4].shadingColor = "yellow";
        else if (exp === "Technical") cells[4].shadingColor = "orange";
        else if (exp === "User") cells[4].shadingColor = "red";
      }
    }

    await context.sync();
  });
}

function styleHeaderRow(row) {
  row.shadingColor = "#003366";
  row.preferredHeight = 45;
  row.font.name = "Cambria (Body)";
  row.font.size = 12;
  row.font.bold = true;
  row.horizontalAlignment = Word.Alignment.centered;
  row.verticalAlignment = Word.VerticalAlignment.center;
}

function setStatus(message) {
  const statusElement = document.getElementById("status");
  statusElement.textContent = message;
  statusElement.style.color = message.startsWith("✅") ? "green" : "red";
}

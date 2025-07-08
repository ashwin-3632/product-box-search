const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbyWIOJ3sUTr83JsIRB_A1XghJ5Lx-MuY6w6LSgTdcob4Gl3fvJFxGmDrgz7o00Z1AsvWA/exec";

let products = [];
let latestExportRows = [];

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const resultsDiv = document.getElementById("results");
  const scanBtn = document.getElementById("scanBtn");
  const scannerDiv = document.getElementById("scanner");
  const closeScannerBtn = document.getElementById("closeScanner");
  const csvExportContainer = document.getElementById("csvExportContainer");
  const csvExportBtn = document.getElementById("csvExportBtn");
  const pdfExportBtn = document.getElementById("pdfExportBtn");

  fetch(SHEET_API_URL)
    .then((res) => res.json())
    .then((data) => {
      products = data;
    });

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    displayResults(query);
  });

  resultsDiv.addEventListener("click", (e) => {
    if (e.target.classList.contains("search-link")) {
      const value = e.target.dataset.value;
      input.value = value;
      displayResults(value.toLowerCase());
    }

    if (e.target.classList.contains("box-toggle")) {
      const boxNum = e.target.dataset.box;
      const containerId = `box-detail-${boxNum}`;
      const existingContainer = document.getElementById(containerId);

      document.querySelectorAll('[id^="box-detail-"]').forEach((el) => el.remove());
      if (existingContainer) return;

      const items = products.filter((p) => String(p["Box Number"]) === boxNum);
      const rows = items
        .map(
          (p) =>
            `<tr class="border-t">
              <td class="px-2 py-1">${p["SKU ID"]}</td>
              <td class="px-2 py-1">${p["Product Name"]}</td>
              <td class="px-2 py-1 text-right">${p["Current Stock"]}</td>
            </tr>`
        )
        .join("");

      const tableHTML = `
        <div id="${containerId}" class="mt-3 bg-gray-50 border rounded p-3">
            <div class="text-sm font-semibold mb-2">Showing SKUs for Box Number: 
              <span class="text-green-700">${boxNum}</span>
            </div>
            <table class="w-full text-sm">
                <thead><tr class="border-b font-semibold">
                    <th class="text-left px-2 py-1">SKU ID</th>
                    <th class="text-left px-2 py-1">Product Name</th>
                    <th class="text-right px-2 py-1">Quantity</th>
                </tr></thead>
              <tbody>${rows}</tbody>
            </table>
        </div>`;

      const tile = e.target.closest(".tile");
      tile?.insertAdjacentHTML("beforeend", tableHTML);
      tile?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  function displayResults(query) {
    if (!query) {
      resultsDiv.innerHTML = "";
      csvExportContainer.classList.add("hidden");
      return;
    }

    let content = "";
    latestExportRows = [];

    const bySkuOrProduct = products.filter(
      (p) =>
        String(p["SKU ID"]).toLowerCase().includes(query) ||
        String(p["Product Name"]).toLowerCase().includes(query)
    );

    const byBox = products.filter((p) => String(p["Box Number"]).toLowerCase() === query);
    const byColour = products.filter((p) => String(p["Colour"]).toLowerCase() === query);

    if (byBox.length > 0 && bySkuOrProduct.length === 0) {
      byBox.forEach((p) => {
        latestExportRows.push([
          p["SKU ID"],
          p["Product Name"],
          p["Current Stock"],
          p["Box Number"],
          p["Colour"]
        ]);
      });

      content += byBox
        .map((item) => {
          return `
          <div class="bg-white rounded-xl p-4 shadow border">
            <div><strong>Box Number:</strong> 
              <span class="text-green-600 underline cursor-pointer search-link" data-value="${item["Box Number"]}">${item["Box Number"]}</span>
            </div>
            <div><strong>Product:</strong> ${item["Product Name"]}</div>
            <div><strong>SKU:</strong> ${item["SKU ID"]}</div>
          </div>`;
        })
        .join("");
    } else if (byColour.length > 0 && bySkuOrProduct.length === 0 && byBox.length === 0) {
      const skuMap = {};
      byColour.forEach((item) => {
        const sku = item["SKU ID"];
        if (!skuMap[sku]) skuMap[sku] = [];
        skuMap[sku].push(item);
      });

      for (const sku in skuMap) {
        const entries = skuMap[sku];
        const first = entries[0];
        const productName = first["Product Name"];
        const imageUrl = first["Image URL"];
        const quantity = entries.reduce((sum, p) => sum + Number(p["Current Stock"] || 0), 0);

        const allColours = products
          .filter((p) => p["SKU ID"] === sku)
          .map((p) => p["Colour"])
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(", ");

        latestExportRows.push([sku, productName, quantity, "-", allColours]);

        content += `
        <div class="bg-white rounded-xl p-4 shadow border tile">
          <div class="text-sm text-gray-600">SKU ID:
            <span class="text-blue-600 underline cursor-pointer search-link" data-value="${sku}">${sku}</span>
          </div>
          <div class="font-semibold mb-2">${productName}</div>
          <div><strong>Quantity:</strong> ${quantity}</div>
          <div><strong>Colours:</strong> ${allColours}</div>
          <div class="mt-2">
            <img loading="lazy" src="${imageUrl}" alt="Image" class="max-w-full h-auto rounded shadow" />
          </div>
        </div>`;
      }
    } else {
      const skuMap = {};
      bySkuOrProduct.forEach((item) => {
        const key = `${item["SKU ID"]}__${item["Product Name"]}`;
        if (!skuMap[key]) skuMap[key] = [];
        skuMap[key].push(item);
      });

      for (const key in skuMap) {
        const items = skuMap[key];
        const [skuId, productName] = key.split("__");

        const allBoxes = items.map((p) => p["Box Number"]).filter((v, i, a) => a.indexOf(v) === i).join(", ");
        const allColours = items.map((p) => p["Colour"]).filter((v, i, a) => a.indexOf(v) === i).join(", ");
        const stockTotal = items.reduce((sum, p) => sum + Number(p["Current Stock"] || 0), 0);
        const imageUrl = items[0]["Image URL"];

        latestExportRows.push([skuId, productName, stockTotal, allBoxes, allColours]);

        content += `
        <div class="bg-white rounded-xl p-4 shadow border tile">
          <div class="text-sm text-gray-600">SKU ID:
            <span class="text-blue-600 underline cursor-pointer search-link" data-value="${skuId}">${skuId}</span>
          </div>
          <div class="font-semibold mb-2">${productName}</div>
          <div><strong>Colour(s):</strong> ${allColours}</div>
          <div><strong>Box Number(s):</strong> ${allBoxes}</div>
          <div><strong>Total Stock:</strong> ${stockTotal}</div>
          <div class="mt-2">
            <img loading="lazy" src="${imageUrl}" alt="Image" class="max-w-full h-auto rounded shadow" />
          </div>
        </div>`;
      }
    }

    resultsDiv.innerHTML = content || `<p>No matching results found.</p>`;
    csvExportContainer.classList.toggle("hidden", !latestExportRows.length);
  }

  csvExportBtn.onclick = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      ["SKU ID,Product Name,Quantity,Box Numbers,Colours"]
        .concat(latestExportRows.map(r => r.map(v => `"${v}"`).join(",")))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_search_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  pdfExportBtn.onclick = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(10);
    doc.text("Product Search Results", 14, 12);

    const headers = [["SKU ID", "Product Name", "Qty", "Box Nos", "Colours"]];
    const body = latestExportRows;

    doc.autoTable({
      startY: 18,
      head: headers,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [52, 73, 94] }
    });

    doc.save("product_search_results.pdf");
  };

  // Barcode scanner
  let qrScanner;
  scanBtn.addEventListener("click", () => {
    scannerDiv.classList.remove("hidden");
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 200 },
        (decodedText) => {
          document.getElementById("searchInput").value = decodedText;
          displayResults(decodedText.toLowerCase());
          qrScanner.stop();
          scannerDiv.classList.add("hidden");
        }
      )
      .catch((err) => {
        console.error("QR Scan Error:", err);
      });
  });

  closeScannerBtn.addEventListener("click", () => {
    qrScanner?.stop().then(() => {
      scannerDiv.classList.add("hidden");
    });
  });
});

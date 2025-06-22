const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbyWIOJ3sUTr83JsIRB_A1XghJ5Lx-MuY6w6LSgTdcob4Gl3fvJFxGmDrgz7o00Z1AsvWA/exec";

let products = [];

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const resultsDiv = document.getElementById("results");
  const scanBtn = document.getElementById("scanBtn");
  const scannerDiv = document.getElementById("scanner");
  const closeScannerBtn = document.getElementById("closeScanner");
  const csvExportContainer = document.getElementById("csvExportContainer");
  const csvExportBtn = document.getElementById("csvExportBtn");


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
      const container = document.getElementById(containerId);

      if (container) {
        container.remove();
      } else {
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
            <table class="w-full text-sm">
              <thead><tr class="border-b font-semibold">
                <th class="text-left px-2 py-1">SKU ID</th>
                <th class="text-left px-2 py-1">Product Name</th>
                <th class="text-right px-2 py-1">Quantity</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;

        e.target.closest(".tile")?.insertAdjacentHTML("beforeend", tableHTML);
      }
    }
  });

  function displayResults(query) {
    if (!query) {
      resultsDiv.innerHTML = "";
      return;
    }

    let content = "";

    const bySkuOrProduct = products.filter(
      (p) =>
        String(p["SKU ID"]).toLowerCase().includes(query) ||
        String(p["Product Name"]).toLowerCase().includes(query)
    );

    const byBox = products.filter(
      (p) => String(p["Box Number"]).toLowerCase() === query
    );

    const byColour = products.filter(
      (p) => String(p["Colour"]).toLowerCase() === query
    );

    if (byBox.length > 0 && bySkuOrProduct.length === 0) {
      // Show only if directly searching by Box Number (unchanged logic)
      const skuMap = {};
      byBox.forEach((item) => {
        const key = item["Box Number"];
        if (!skuMap[key]) skuMap[key] = [];
        skuMap[key].push(item);
      });

      for (const box in skuMap) {
        const skus = skuMap[box]
          .map(
            (p) =>
              `<span class="text-blue-600 underline cursor-pointer search-link" data-value="${p["SKU ID"]}">${p["SKU ID"]}</span>`
          )
          .join(", ");
        const productNames = skuMap[box]
          .map((p) => p["Product Name"])
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(", ");
        content += `
        <div class="bg-white rounded-xl p-4 shadow border">
          <div><strong>Box Number:</strong> <span class="text-green-600 underline cursor-pointer search-link" data-value="${box}">${box}</span></div>
          <div><strong>Product(s):</strong> ${productNames}</div>
          <div><strong>SKU ID(s):</strong> ${skus}</div>
        </div>`;
      }
    } else if (byColour.length > 0 && bySkuOrProduct.length === 0 && byBox.length === 0) {
      // New: Colour search → one tile per SKU
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
        const quantity = entries.reduce(
          (sum, p) => sum + Number(p["Current Stock"] || 0),
          0
        );

        const allColours = products
          .filter((p) => p["SKU ID"] === sku)
          .map((p) => p["Colour"])
          .filter((v, i, a) => a.indexOf(v) === i)
          .map(
            (c) =>
              `<span class="text-pink-600 underline cursor-pointer search-link" data-value="${c}">${c}</span>`
          )
          .join(", ");

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
      // Default: Search by SKU or Product
      const skuMap = {};
      bySkuOrProduct.forEach((item) => {
        const key = `${item["SKU ID"]}__${item["Product Name"]}`;
        if (!skuMap[key]) skuMap[key] = [];
        skuMap[key].push(item);
      });

      for (const key in skuMap) {
        const items = skuMap[key];
        const [skuId, productName] = key.split("__");

        const allBoxes = items
          .map((p) => p["Box Number"])
          .filter((v, i, a) => a.indexOf(v) === i)
          .map(
            (b) =>
              `<span class="text-green-600 underline cursor-pointer box-toggle" data-box="${b}">${b}</span>`
          )
          .join(", ");

        const allColours = items
          .map((p) => p["Colour"])
          .filter((v, i, a) => a.indexOf(v) === i)
          .map(
            (c) =>
              `<span class="text-pink-600 underline cursor-pointer search-link" data-value="${c}">${c}</span>`
          )
          .join(", ");

        const stockTotal = items.reduce(
          (sum, p) => sum + Number(p["Current Stock"] || 0),
          0
        );

        const imageUrl = items[0]["Image URL"];

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
	
	// Generate CSV if results exist
	if (content) {
	  const rows = [];

	  if (byColour.length > 0 && bySkuOrProduct.length === 0 && byBox.length === 0) {
		const skuMap = {};
		byColour.forEach((item) => {
		  const sku = item["SKU ID"];
		  if (!skuMap[sku]) skuMap[sku] = [];
		  skuMap[sku].push(item);
		});

		for (const sku in skuMap) {
		  const items = skuMap[sku];
		  const productName = items[0]["Product Name"];
		  const quantity = items.reduce((sum, p) => sum + Number(p["Current Stock"] || 0), 0);
		  const boxes = items.map(p => p["Box Number"]).filter((v, i, a) => a.indexOf(v) === i).join(", ");
		  const colours = products
			.filter((p) => p["SKU ID"] === sku)
			.map(p => p["Colour"])
			.filter((v, i, a) => a.indexOf(v) === i)
			.join(", ");
		  rows.push([sku, productName, quantity, boxes, colours]);
		}

	  } else if (byBox.length > 0 && bySkuOrProduct.length === 0) {
		byBox.forEach((p) => {
		  rows.push([p["SKU ID"], p["Product Name"], p["Current Stock"], p["Box Number"], p["Colour"]]);
		});

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
		  const quantity = items.reduce((sum, p) => sum + Number(p["Current Stock"] || 0), 0);
		  const boxes = items.map(p => p["Box Number"]).filter((v, i, a) => a.indexOf(v) === i).join(", ");
		  const colours = items.map(p => p["Colour"]).filter((v, i, a) => a.indexOf(v) === i).join(", ");
		  rows.push([skuId, productName, quantity, boxes, colours]);
		}
	  }

	  csvExportBtn.onclick = () => {
		const csvContent = "data:text/csv;charset=utf-8," +
		  ["SKU ID,Product Name,Quantity,Box Numbers,Colours"]
			.concat(rows.map(r => r.map(v => `"${v}"`).join(",")))
			.join("\n");

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", "product_search_results.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	  };

	  csvExportContainer.classList.remove("hidden");
	} else {
	  csvExportContainer.classList.add("hidden");
	}


    resultsDiv.innerHTML = content || `<p>No matching results found.</p>`;
  }

  // Barcode scanner
  let qrScanner;
  scanBtn.addEventListener("click", () => {
    scannerDiv.classList.remove("hidden");
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: 200,
        },
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

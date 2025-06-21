const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbyWIOJ3sUTr83JsIRB_A1XghJ5Lx-MuY6w6LSgTdcob4Gl3fvJFxGmDrgz7o00Z1AsvWA/exec";

let products = [];

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const resultsDiv = document.getElementById("results");
  const scanBtn = document.getElementById("scanBtn");
  const scannerDiv = document.getElementById("scanner");
  const closeScannerBtn = document.getElementById("closeScanner");

  // Fetch data from Google Sheet
  fetch(SHEET_API_URL)
    .then((res) => res.json())
    .then((data) => {
      products = data;
    });

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    displayResults(query);
  });

  // Handle hyperlink click → trigger new search
  resultsDiv.addEventListener("click", (e) => {
    if (e.target.classList.contains("search-link")) {
      const value = e.target.dataset.value;
      input.value = value;
      displayResults(value.toLowerCase());
    }
  });

  function displayResults(query) {
    if (!query) {
      resultsDiv.innerHTML = "";
      return;
    }

    const isBoxSearch = products.some(
      (p) => String(p["Box Number"]).toLowerCase() === query
    );

    let filtered;

    if (isBoxSearch) {
      // Show all SKUs in this Box Number
      filtered = products.filter(
        (p) => String(p["Box Number"]).toLowerCase() === query
      );

      const content = filtered
        .map(
          (item) => `
        <div class="bg-white rounded-xl p-4 shadow border">
          <div class="text-sm text-gray-600">SKU ID: 
            <span class="text-blue-600 underline cursor-pointer search-link" data-value="${item["SKU ID"]}">
              ${item["SKU ID"]}
            </span>
          </div>
          <div class="font-semibold">${item["Product Name"]}</div>
        </div>
      `
        )
        .join("");

      resultsDiv.innerHTML = content;
    } else {
      // Search by SKU ID or Product Name
      filtered = products.filter(
        (p) =>
          String(p["SKU ID"]).toLowerCase().includes(query) ||
          String(p["Product Name"]).toLowerCase().includes(query)
      );

      const content = filtered
        .map((item) => {
          const allBoxes = products
            .filter((p) => p["SKU ID"] === item["SKU ID"])
            .map((p) => p["Box Number"])
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(
              (box) => `
                <span class="text-green-600 underline cursor-pointer search-link" data-value="${box}">
                  ${box}
                </span>`
            )
            .join(", ");

          return `
          <div class="bg-white rounded-xl p-4 shadow border">
            <div class="text-sm text-gray-600">SKU ID: 
              <span class="text-blue-600 underline cursor-pointer search-link" data-value="${item["SKU ID"]}">
                ${item["SKU ID"]}
              </span>
            </div>
            <div class="font-semibold mb-2">${item["Product Name"]}</div>
            <div><strong>Colour:</strong> ${item["Colour"]}</div>
            <div><strong>Box Number(s):</strong> ${allBoxes}</div>
            <div><strong>Current Stock:</strong> ${item["Current Stock"]}</div>
            <div class="mt-2">
              <img loading="lazy" src="${item["Image URL"]}" alt="Image" class="max-w-full h-auto rounded shadow" />
            </div>
          </div>`;
        })
        .join("");

      resultsDiv.innerHTML = content || `<p>No matching results found.</p>`;
    }
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

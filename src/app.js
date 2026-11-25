// Linggau AI Wrapper — foundation verification module.
function el(tag, text, style = {}) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  Object.assign(node.style, style);
  return node;
}

function status(label, value, ok) {
  const row = el("div", null, {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: "8px", padding: "14px 0",
    borderTop: "1px solid #e7e7e1"
  });
  row.append(
    el("span", label, { fontSize: "14px", color: "#555" }),
    el("span", value, {
      fontSize: "12px", fontWeight: "700", padding: "5px 9px",
      borderRadius: "6px", background: ok ? "#e6f2e9" : "#f8edd7",
      color: ok ? "#24613a" : "#745219", overflowWrap: "anywhere"
    })
  );
  return row;
}

export async function mount({ root, ai, version }) {
  if (!(root instanceof HTMLElement)) throw new Error("APP_ROOT_INVALID");
  if (typeof version !== "string" || !version.length) {
    throw new Error("APP_VERSION_INVALID");
  }
  const bridgeAvailable = ai?.available === true &&
    typeof ai.editImage === "function";

  const page = el("section", null, {
    width: "100%", maxWidth: "480px", margin: "0 auto",
    padding: "24px 16px", color: "#222"
  });
  const header = el("header", null, {
    display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px"
  });
  const logo = el("span", "L", {
    width: "46px", height: "46px", flexShrink: "0", display: "grid",
    placeItems: "center", borderRadius: "12px", background: "#222",
    color: "#fff", fontWeight: "700", fontSize: "20px"
  });
  logo.setAttribute("aria-hidden", "true");
  const brand = el("div");
  brand.append(
    el("strong", "Linggau AI Studio", { fontSize: "17px" }),
    el("div", "AI Wrapper Foundation", { fontSize: "12px", color: "#666" })
  );
  header.append(logo, brand);

  const card = el("article", null, {
    border: "1px solid #deded8", borderRadius: "16px",
    padding: "22px", background: "#fff"
  });
  card.append(
    el("div", "FOUNDATION / V" + version, {
      fontSize: "11px", fontWeight: "700", letterSpacing: "1px", color: "#666"
    }),
    el("h1", "Modul berhasil dimuat.", {
      fontSize: "25px", lineHeight: "1.2", margin: "12px 0"
    }),
    el("p", "Entry point berhasil dijalankan oleh cangkang aplikasi.", {
      fontSize: "14px", lineHeight: "1.6", color: "#555", margin: "0 0 20px"
    }),
    status("Manifest", "VALIDATED", true),
    status("CDN Module", "PASS", true),
    status("Application Mount", "PASS", true),
    status("AI Bridge", bridgeAvailable ? "AVAILABLE" : "NOT CONNECTED", bridgeAvailable),
    status("Application Version", version, true)
  );

  const note = el("aside", null, {
    marginTop: "16px", padding: "16px", background: "#ebebe5",
    borderRadius: "12px", fontSize: "14px", lineHeight: "1.6"
  });
  note.append(
    el("strong", "Checkpoint berikutnya"),
    el("p", bridgeAvailable
      ? "Uji pemrosesan AI nyata. Status bridge bukan bukti inferensi berhasil."
      : "AI Bridge sengaja nonaktif. Integrasi AI diuji setelah CDN lulus.", {
        margin: "6px 0 0", color: "#555"
      })
  );
  page.append(header, card, note, el("footer", "GitHub · jsDelivr · Gemini Canvas", {
    textAlign: "center", padding: "24px 0", fontSize: "12px", color: "#666"
  }));
  root.replaceChildren(page);
  console.info("APP_MOUNT_OK", { version, aiAvailable: bridgeAvailable });
}

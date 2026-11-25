// Linggau AI Bridge integration lab. No provider credentials or endpoint here.
const TYPES = new Set(["image/jpeg", "image/png"]);
const LIMIT = 2 * 1024 * 1024;
const DEFAULT_PROMPT = "Replace only the background with a clean, light beige studio background. Preserve the original object's identity, shape, proportions, colors, textures, labels and all existing text.";

export function mountBridgeLab(root, bridge) {
  if (!(root instanceof HTMLElement) || typeof bridge?.editImage !== "function") {
    throw new Error("BRIDGE_CONTRACT_INVALID");
  }
  root.innerHTML = `
    <style>
      #bridge-lab{max-width:1000px;margin:auto;padding:24px 16px;font:16px/1.5 system-ui,sans-serif;color:#17202a}
      #bridge-lab *{box-sizing:border-box}
      #bridge-lab h1{font-size:clamp(24px,4vw,34px);margin:0 0 8px}
      #bridge-lab p{margin:0 0 16px;color:#53606b}
      #bridge-lab label{display:block;font-weight:600;margin:16px 0 6px}
      #bridge-lab input,#bridge-lab textarea{width:100%;font:inherit}
      #bridge-lab textarea{padding:12px;border:1px solid #cbd5df;border-radius:10px;resize:vertical}
      #bridge-lab button,#bridge-lab a{font:inherit;border-radius:10px;padding:12px 16px}
      #bridge-lab button{background:#183b31;color:white;border:0;cursor:pointer}
      #bridge-lab button:disabled{opacity:.45;cursor:not-allowed}
      #bridge-lab .actions{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
      #bridge-lab .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px}
      #bridge-lab .panel{border:1px solid #dbe1e6;border-radius:14px;padding:16px;min-width:0}
      #bridge-lab figure{margin:0}
      #bridge-lab img{display:block;width:100%;max-height:480px;object-fit:contain;margin:8px 0}
      #bridge-lab [hidden]{display:none!important}
      #bridge-lab pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f5f6;padding:14px;border-radius:10px;font-size:13px}
    </style>
    <section id="bridge-lab">
      <h1>Linggau AI Bridge Lab</h1>
      <p>Uji integrasi: modul CDN → shell Canvas → AI runtime. Foto dikirim ke layanan Google hanya ketika tombol proses ditekan. Gunakan foto uji tanpa data sensitif.</p>
      <div class="grid">
        <section class="panel">
          <label for="lab-file">Foto asli (JPEG/PNG, maks. 2 MB)</label>
          <input id="lab-file" type="file" accept="image/jpeg,image/png">
          <label for="lab-prompt">Instruksi transformasi</label>
          <textarea id="lab-prompt" rows="5"></textarea>
          <div class="actions">
            <button id="lab-run" type="button" disabled>Proses AI</button>
            <button id="lab-reset" type="button">Bersihkan</button>
          </div>
          <pre id="lab-status" role="status" aria-live="polite">MODULE: LOADED\nBRIDGE: READY\nAI: NOT TESTED</pre>
        </section>
        <section class="panel">
          <figure><figcaption>Foto asli</figcaption><img id="lab-source" alt="Foto asli" hidden></figure>
          <figure><figcaption>Hasil AI</figcaption><img id="lab-output" alt="Hasil transformasi" hidden></figure>
          <a id="lab-download" hidden>Unduh hasil</a>
        </section>
      </div>
    </section>`;
  const q = id => root.querySelector("#lab-" + id);
  const file = q("file"), prompt = q("prompt"), run = q("run"), reset = q("reset");
  const source = q("source"), output = q("output"), download = q("download"), status = q("status");
  prompt.value = DEFAULT_PROMPT;
  let selected = null, sourceURL = null, outputURL = null, busy = false, revision = 0;
  const report = text => { status.textContent = "MODULE: LOADED\nBRIDGE: READY\n" + text; };
  function clearSource() {
    selected = null;
    if (sourceURL) URL.revokeObjectURL(sourceURL);
    sourceURL = null; source.removeAttribute("src"); source.hidden = true;
  }
  function clearOutput() {
    if (outputURL) URL.revokeObjectURL(outputURL);
    outputURL = null; output.removeAttribute("src"); output.hidden = true;
    download.removeAttribute("href"); download.hidden = true;
  }
  function refresh() {
    run.disabled = busy || !selected || !prompt.value.trim();
    file.disabled = busy; prompt.disabled = busy; reset.disabled = busy;
  }
  async function decode(url) {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("IMAGE_DECODE_FAILED");
    return { width: image.naturalWidth, height: image.naturalHeight };
  }
  function toBase64(blob) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
      reader.readAsDataURL(blob);
    });
  }
  file.addEventListener("change", async () => {
    if (busy) return;
    const current = ++revision;
    clearSource(); clearOutput(); refresh();
    const next = file.files?.[0];
    if (!next) { report("AI: NOT TESTED"); return; }
    if (!TYPES.has(next.type) || !next.size || next.size > LIMIT) {
      file.value = ""; report("INPUT: REJECTED (JPEG/PNG, maks. 2 MB)"); return;
    }
    const url = URL.createObjectURL(next);
    try {
      const size = await decode(url);
      if (current !== revision) { URL.revokeObjectURL(url); return; }
      selected = next; sourceURL = url; source.src = url; source.hidden = false;
      report("INPUT: VALID (" + size.width + " × " + size.height + ")\nAI: NOT TESTED");
    } catch {
      URL.revokeObjectURL(url);
      if (current === revision) { file.value = ""; report("INPUT: DECODE FAILED"); }
    } finally { if (current === revision) refresh(); }
  });
  prompt.addEventListener("input", refresh);
  reset.addEventListener("click", () => {
    if (busy) return;
    ++revision; clearSource(); clearOutput(); file.value = ""; prompt.value = DEFAULT_PROMPT;
    report("AI: NOT TESTED"); refresh();
  });
  run.addEventListener("click", async () => {
    if (busy || !selected || !prompt.value.trim()) return;
    busy = true; clearOutput(); refresh();
    report("AI: PROCESSING (one request; no automatic retry)");
    try {
      const result = await bridge.editImage({ mimeType: selected.type, base64: await toBase64(selected), prompt: prompt.value.trim() });
      if (!TYPES.has(result?.mimeType) || typeof result.base64 !== "string") throw new Error("OUTPUT_CONTRACT_INVALID");
      const binary = atob(result.base64);
      const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
      const blob = new Blob([bytes], { type: result.mimeType });
      outputURL = URL.createObjectURL(blob);
      const dimensions = await decode(outputURL);
      output.src = outputURL; output.hidden = false;
      download.href = outputURL; download.download = "linggau-ai-result." + (result.mimeType === "image/jpeg" ? "jpg" : "png"); download.hidden = false;
      report("AI: SUCCESS\nHTTP: " + result.httpStatus + "\nMODEL: " + result.model + "\nDURATION: " + result.elapsedMs + " ms\nMIME: " + result.mimeType + "\nDECODE: PASS (" + dimensions.width + " × " + dimensions.height + ")");
    } catch (error) {
      clearOutput();
      report("AI: FAILED\n" + (error instanceof Error ? error.message : String(error)));
    } finally { busy = false; refresh(); }
  });
  refresh();
}

// ANFD Explorer — frontend interaction layer.
// Works two ways: if window.__PARTS_DATA__ is embedded (standalone demo),
// it uses that directly; otherwise it calls the Express API at /api/parts.

(async function () {
  const svg = document.getElementById("machine-svg");
  const leaderLayer = document.getElementById("leader-layer");
  const diagramPane = document.querySelector(".diagram-pane");
  const bomList = document.getElementById("bom-list");
  const bomCount = document.getElementById("bom-count");
  const statusChip = document.getElementById("status-chip");
  const resetBtn = document.getElementById("reset-btn");

  const specEmpty = document.getElementById("spec-empty");
  const specContent = document.getElementById("spec-content");
  const specIndex = document.getElementById("spec-index");
  const specName = document.getElementById("spec-name");
  const specTagline = document.getElementById("spec-tagline");
  const specFunction = document.getElementById("spec-function");
  const specConstruction = document.getElementById("spec-construction");
  const specClose = document.getElementById("spec-close");
  const specThumbSvg = document.getElementById("spec-thumb-svg");
  const SVG_NS = "http://www.w3.org/2000/svg";

  let parts = [];
  let activeId = null;

  async function loadParts() {
    if (window.__PARTS_DATA__) return window.__PARTS_DATA__;
    const res = await fetch("/api/parts");
    if (!res.ok) throw new Error("Failed to load parts");
    return res.json();
  }

  function byId(id) {
    return parts.find((p) => p.id === id);
  }

  function buildBom() {
    bomList.innerHTML = "";
    parts.forEach((p) => {
      const li = document.createElement("li");
      li.className = "bom-item";
      li.dataset.part = p.id;
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.innerHTML = `
        <span class="bom-idx">${p.index}</span>
        <span>
          <span class="bom-name">${p.name}</span>
          <span class="bom-tag">${p.tagline}</span>
        </span>
      `;
      li.addEventListener("click", () => selectPart(p.id));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectPart(p.id);
        }
      });
      bomList.appendChild(li);
    });
    bomCount.textContent = `${parts.length} items`;
  }

  function clearLeaderLine() {
    leaderLayer.innerHTML = "";
  }

  function drawLeaderLine(el, part) {
    clearLeaderLine();
    const bbox = el.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const nx = cx + part.explode.dx;
    const ny = cy + part.explode.dy;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", cx);
    line.setAttribute("y1", cy);
    line.setAttribute("x2", nx);
    line.setAttribute("y2", ny);
    line.setAttribute("class", "leader-line");
    line.setAttribute("marker-end", "url(#leaderDot)");
    leaderLayer.appendChild(line);

    // fade in once the explode transform has mostly settled
    requestAnimationFrame(() => {
      setTimeout(() => line.classList.add("visible"), 240);
    });
  }

  function setActiveElementState(id) {
    document.querySelectorAll(".part").forEach((el) => {
      el.classList.toggle("exploded", el.dataset.part === id);
    });
    document.querySelectorAll(".bom-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.part === id);
    });
  }

  function populateSpec(part) {
    specEmpty.hidden = true;
    specContent.hidden = false;
    specIndex.textContent = part.index;
    specName.textContent = part.name;
    specTagline.textContent = part.tagline;
    specFunction.textContent = part.function;
    specConstruction.textContent = part.construction;
    renderThumbnail(part);
  }

  // Builds a small, self-contained "isolated view" of just the selected
  // part: crops the main diagram's own geometry down to that part's
  // bounding box so it reads clearly on its own, at rest (no explode offset).
  function renderThumbnail(part) {
    while (specThumbSvg.firstChild) specThumbSvg.removeChild(specThumbSvg.firstChild);

    const original = svg.querySelector(`[data-part="${part.id}"]`);
    if (!original) return;

    const bbox = original.getBBox();
    const pad = Math.max(bbox.width, bbox.height) * 0.28 + 12;
    const vx = bbox.x - pad;
    const vy = bbox.y - pad;
    const vw = bbox.width + pad * 2;
    const vh = bbox.height + pad * 2;
    specThumbSvg.setAttribute("viewBox", `${vx} ${vy} ${vw} ${vh}`);

    // soft amber backdrop glow, reusing the gradient already defined
    // in the main diagram's <defs> (id lookups work across the page)
    const glow = document.createElementNS(SVG_NS, "circle");
    glow.setAttribute("cx", bbox.x + bbox.width / 2);
    glow.setAttribute("cy", bbox.y + bbox.height / 2);
    glow.setAttribute("r", Math.max(bbox.width, bbox.height) * 0.85 || 40);
    glow.setAttribute("fill", "url(#amberGlow)");
    specThumbSvg.appendChild(glow);

    // clone the part's own shapes, stripped of interaction state,
    // so it renders identically but at rest and non-interactive
    const clone = original.cloneNode(true);
    clone.removeAttribute("style");
    clone.removeAttribute("class");
    clone.removeAttribute("tabindex");
    clone.removeAttribute("role");
    clone.classList.add("thumb-part-shape");
    specThumbSvg.appendChild(clone);
  }

  function clearThumbnail() {
    while (specThumbSvg.firstChild) specThumbSvg.removeChild(specThumbSvg.firstChild);
  }

  function selectPart(id) {
    const part = byId(id);
    if (!part) return;

    if (activeId === id) {
      deselect();
      return;
    }

    activeId = id;
    diagramPane.classList.add("has-active");
    setActiveElementState(id);

    const el = svg.querySelector(`[data-part="${id}"]`);
    el.style.setProperty("--dx", `${part.explode.dx}px`);
    el.style.setProperty("--dy", `${part.explode.dy}px`);

    drawLeaderLine(el, part);
    populateSpec(part);
    statusChip.textContent = `Part ${part.index} of ${parts.length} — ${part.name}`;

    // bring the selected BOM row into view on small screens
    const row = bomList.querySelector(`[data-part="${id}"]`);
    if (row && window.innerWidth < 980) {
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function deselect() {
    activeId = null;
    diagramPane.classList.remove("has-active");
    document.querySelectorAll(".part").forEach((el) => {
      el.classList.remove("exploded");
      el.style.removeProperty("--dx");
      el.style.removeProperty("--dy");
    });
    document.querySelectorAll(".bom-item").forEach((el) => el.classList.remove("active"));
    clearLeaderLine();
    clearThumbnail();
    specEmpty.hidden = false;
    specContent.hidden = true;
    statusChip.textContent = `${parts.length} parts · click any to open`;
  }

  function wireDiagramClicks() {
    svg.querySelectorAll(".part").forEach((el) => {
      el.addEventListener("click", () => selectPart(el.dataset.part));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectPart(el.dataset.part);
        }
      });
    });
  }

  resetBtn.addEventListener("click", deselect);
  specClose.addEventListener("click", deselect);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") deselect();
  });

  try {
    parts = await loadParts();
    buildBom();
    wireDiagramClicks();
  } catch (err) {
    statusChip.textContent = "Couldn't load part data";
    console.error(err);
  }
})();

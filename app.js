(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const el = (tag, attrs = {}, html = "") => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "class") node.className = value;
      else if (key === "style") Object.assign(node.style, value);
      else node.setAttribute(key, value);
    }
    if (html) node.innerHTML = html;
    return node;
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slides = $$(".slide");

  /* ---------------- navegação ---------------- */
  const NAV_GROUPS = [
    { label: "Agenda", ids: ["agenda"] },
    { label: "1 · Base", ids: ["documentos", "visao", "base", "telas", "ingestao", "busca", "rag1", "rag2", "roteiro", "q1"] },
    { label: "2 · Contexto", ids: ["contexto"] },
    { label: "3 · Guardrails", ids: ["guardrails"] },
    { label: "4 · Categorias", ids: ["categorias"] },
    { label: "5 · RAG 3", ids: ["rag3"] },
    { label: "Próximos", ids: ["roadmap"] },
    { label: "Resumo", ids: ["resumo"] },
  ];
  const topnav = $("#topnav");
  NAV_GROUPS.forEach((group) => {
    group.link = el("a", { href: `#${group.ids[0]}` }, group.label);
    topnav.append(group.link);
  });
  const dots = $("#dots");
  slides.forEach((slide) => dots.append(el("a", { href: `#${slide.id}`, "data-label": slide.dataset.title })));

  let current = 0;
  const setActive = (index) => {
    current = index;
    const id = slides[index].id;
    $$("a", dots).forEach((dot, i) => dot.classList.toggle("active", i === index));
    NAV_GROUPS.forEach((group) => group.link.classList.toggle("active", group.ids.includes(id)));
    updateNotes();
  };
  const spy = () => {
    const mid = window.innerHeight * 0.4;
    let index = 0;
    slides.forEach((slide, i) => { if (slide.getBoundingClientRect().top <= mid) index = i; });
    if (index !== current) setActive(index);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    $("#progressBar").style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  };
  window.addEventListener("scroll", spy, { passive: true });

  const goTo = (index) => {
    const target = slides[Math.max(0, Math.min(slides.length - 1, index))];
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };
  document.addEventListener("keydown", (event) => {
    if (event.target.closest("input, textarea, select") || document.querySelector("dialog[open]")) return;
    if (["ArrowRight", "PageDown"].includes(event.key)) { event.preventDefault(); goTo(current + 1); }
    else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); goTo(current - 1); }
    else if (event.key.toLowerCase() === "n") toggleNotes();
  });

  /* ---------------- roteiro de fala ---------------- */
  const drawer = $("#notesDrawer");
  const toggleNotes = (force) => {
    const open = typeof force === "boolean" ? force : !drawer.classList.contains("open");
    drawer.classList.toggle("open", open);
    $("#notesToggle").classList.toggle("on", open);
    updateNotes();
  };
  function updateNotes() {
    if (!drawer.classList.contains("open")) return;
    const slide = slides[current];
    $("#ndTitle").textContent = `Roteiro · ${slide.dataset.title}`;
    $("#ndBody").innerHTML = $(".notes", slide)?.innerHTML || "<p>Sem notas.</p>";
  }
  $("#notesToggle").addEventListener("click", () => toggleNotes());
  $("#ndClose").addEventListener("click", () => toggleNotes(false));

  /* ---------------- reveal ---------------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("in"); revealObserver.unobserve(entry.target); } });
  }, { threshold: 0.12 });
  const addReveal = () => $$(".slide:not(.hero) .wrap > *").forEach((node) => { node.classList.add("reveal"); revealObserver.observe(node); });

  /* ---------------- tooltip ---------------- */
  const tip = el("div", { class: "ftip", role: "tooltip" });
  document.body.append(tip);
  const showTip = (target, html) => {
    tip.innerHTML = html;
    tip.classList.add("on");
    const rect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(12, Math.min(window.innerWidth - tipRect.width - 12, left));
    let top = rect.top - tipRect.height - 12;
    tip.classList.toggle("below", top < 70);
    if (top < 70) top = rect.bottom + 12;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };
  const hideTip = () => tip.classList.remove("on");

  /* ---------------- documentos: adaptações ---------------- */
  const adaptList = $("#adaptList");
  ADAPTATIONS.forEach((item, i) => {
    const row = el("div", { class: "adapt", tabindex: "0" },
      `<div class="a-doc"><small>Documento</small>${item.doc}</div><div class="a-arrow">→</div><div class="a-did"><small>Implementei</small>${item.did}</div><div class="a-why">${item.why}</div>`);
    if (i === 0) row.classList.add("open");
    row.addEventListener("click", () => row.classList.toggle("open"));
    adaptList.append(row);
  });

  /* ---------------- base: tipos e chips ---------------- */
  const kinds = $("#kinds");
  KINDS.forEach((kind) => {
    kinds.append(el("div", { class: "kind", tabindex: "0" }, `
      <div class="kind-inner">
        <div class="kind-face"><div class="kind-ico">${kind.ico}</div><h4>${kind.title}</h4><p>${kind.desc}</p><span class="used">Usado em: ${kind.used}</span></div>
        <div class="kind-face back"><span class="k-label">Exemplo · ${kind.title}</span><div class="k-ex">${kind.ex}</div></div>
      </div>`));
  });
  const fillChips = (id, list) => { const box = $(id); list.forEach((label) => box.append(el("span", { class: "chip" }, label))); };
  fillChips("#chipsTypes", RESEARCH_TYPES);
  fillChips("#chipsTypes2", RESEARCH_TYPES);
  fillChips("#chipsIntents", INTENTS);
  fillChips("#chipsSlots", SLOTS);

  /* ---------------- telas ---------------- */
  const imgDialog = $("#imgDialog");
  $$(".shot").forEach((shot) => shot.addEventListener("click", () => {
    $("#imgDialogImg").src = shot.dataset.full;
    $("#imgDialogImg").alt = $("img", shot).alt;
    imgDialog.showModal();
  }));
  [imgDialog, $("#nodeDialog")].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));

  /* ---------------- fluxos ---------------- */
  const nodeDialog = $("#nodeDialog");
  const openNode = (node) => {
    const d = node.d || {};
    const guards = (d.guards || []).length ? `<div class="dlg-list"><h5>Guardrails e regras aqui</h5><ul>${d.guards.map((g) => `<li>${g}</li>`).join("")}</ul></div>` : "";
    $("#nodeDialogBody").innerHTML = `
      <div class="dlg-head ${node.k}"><span class="dlg-kind">${KIND_LABEL[node.k]}</span><h3>${node.t}</h3></div>
      <div class="dlg-body">
        <p>${d.what || node.tip}</p>
        ${d.in || d.out ? `<div class="dlg-io"><div><b>Recebe</b>${d.in || "-"}</div><div><b>Devolve</b>${d.out || "-"}</div></div>` : ""}
        ${guards}
        ${d.ex ? `<div class="dlg-ex">${d.ex.replace(/</g, "&lt;")}</div>` : ""}
        ${d.later ? `<div class="dlg-later">${d.later}</div>` : ""}
      </div>`;
    nodeDialog.showModal();
  };

  const buildFlow = (shell) => {
    const spec = FLOWS[shell.dataset.flow];
    const key = shell.dataset.flow;
    const scenarioNames = Object.keys(spec.scenarios);
    const toolbar = el("div", { class: "flow-toolbar" });
    const select = el("select", { "aria-label": "Cenário" });
    scenarioNames.forEach((name) => select.append(el("option", { value: name }, name)));
    const play = el("button", { class: "btn sm" }, "▶ Simular");
    const reset = el("button", { class: "btn sm ghost" }, "Limpar");
    const status = el("div", { class: "flow-status" }, "Passe o mouse nos nós para resumo; clique para detalhes.");
    if (scenarioNames.length > 1) toolbar.append(select);
    toolbar.append(play, reset, status);

    const scroll = el("div", { class: "flow-scroll" });
    const flow = el("div", { class: "flow" });
    flow.style.gridTemplateColumns = `repeat(${spec.cols}, minmax(104px, 1fr))`;
    if (spec.edges.some((edge) => edge[3] === "back")) flow.classList.add("has-back");
    flow.style.gridTemplateRows = `repeat(${spec.rows}, auto)`;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.classList.add("edges");
    svg.innerHTML = `<defs>
      <marker id="arr-${key}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#b8c6d8"/></marker>
      <marker id="arrhl-${key}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#0099e0"/></marker>
    </defs>`;
    flow.append(svg);

    const nodeEls = {};
    spec.nodes.forEach((node) => {
      const button = el("button", { class: `node ${node.k} ${node.cls || ""}`, type: "button" },
        `${node.flag ? `<span class="n-flag ${node.flag[0]}">${node.flag[1]}</span>` : ""}<div class="n-kind">${KIND_LABEL[node.k]}</div><div class="n-title">${node.t}</div><div class="n-sub">${node.s || ""}</div>`);
      button.style.gridColumn = node.c;
      button.style.gridRow = node.r;
      button.addEventListener("mouseenter", () => showTip(button, `${node.tip}<em>clique para detalhes</em>`));
      button.addEventListener("mouseleave", hideTip);
      button.addEventListener("focus", () => showTip(button, node.tip));
      button.addEventListener("blur", hideTip);
      button.addEventListener("click", () => { hideTip(); openNode(node); });
      nodeEls[node.id] = button;
      flow.append(button);
    });

    const labels = document.createElementNS(svgNS, "svg");
    labels.classList.add("labels");
    flow.append(labels);

    scroll.append(flow);
    shell.append(toolbar, scroll);

    const edgeEls = {};
    const box = (node) => ({ x: node.offsetLeft, y: node.offsetTop, w: node.offsetWidth, h: node.offsetHeight });
    const draw = () => {
      $$("g.edge-g", svg).forEach((g) => g.remove());
      labels.innerHTML = "";
      if (!flow.offsetWidth) return;
      svg.setAttribute("viewBox", `0 0 ${flow.offsetWidth} ${flow.offsetHeight}`);
      labels.setAttribute("viewBox", `0 0 ${flow.offsetWidth} ${flow.offsetHeight}`);
      spec.edges.forEach(([from, to, label = "", style = ""]) => {
        const a = box(nodeEls[from]);
        const b = box(nodeEls[to]);
        const acx = a.x + a.w / 2, acy = a.y + a.h / 2, bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
        const dx = bcx - acx, dy = bcy - acy;
        const sameRow = Math.abs(dy) < 10;
        let d, lx, ly;
        if (style === "back") {
          const x1 = acx - a.w * 0.2, y1 = a.y, x2 = bcx + b.w * 0.2, y2 = b.y;
          const lift = 46;
          d = `M${x1},${y1} C${x1},${y1 - lift} ${x2},${y2 - lift} ${x2},${y2}`;
          lx = (x1 + x2) / 2; ly = Math.min(y1, y2) - lift * 0.75 - 4;
        } else if (Math.abs(dx) < 10 || (!sameRow && dx < 0)) {
          const down = dy > 0;
          const x1 = acx, y1 = down ? a.y + a.h : a.y, x2 = bcx, y2 = down ? b.y : b.y + b.h;
          const c = Math.max(24, Math.abs(y2 - y1) / 2);
          d = `M${x1},${y1} C${x1},${y1 + (down ? c : -c)} ${x2},${y2 - (down ? c : -c)} ${x2},${y2}`;
          lx = (x1 + x2) / 2 + (Math.abs(dx) < 10 ? 8 : 0); ly = (y1 + y2) / 2;
        } else {
          const right = dx > 0;
          const x1 = right ? a.x + a.w : a.x, y1 = acy, x2 = right ? b.x : b.x + b.w, y2 = bcy;
          const c = Math.max(22, Math.abs(x2 - x1) / 2);
          d = `M${x1},${y1} C${x1 + (right ? c : -c)},${y1} ${x2 - (right ? c : -c)},${y2} ${x2},${y2}`;
          lx = (x1 + x2) / 2; ly = (y1 + y2) / 2 - 8;
        }
        const g = document.createElementNS(svgNS, "g");
        g.classList.add("edge-g");
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", d);
        path.setAttribute("class", `edge ${style === "dash" ? "dash" : ""}`);
        path.setAttribute("marker-end", `url(#arr-${key})`);
        g.append(path);
        let text = null;
        if (label) {
          text = document.createElementNS(svgNS, "text");
          text.setAttribute("x", lx);
          text.setAttribute("y", ly);
          text.setAttribute("text-anchor", Math.abs(dx) < 10 ? "start" : "middle");
          text.setAttribute("class", "edge-label");
          text.textContent = label;
          labels.append(text);
        }
        svg.append(g);
        const prev = edgeEls[`${from}>${to}`];
        if (prev?.hl) { path.classList.add("hl"); path.setAttribute("marker-end", `url(#arrhl-${key})`); text?.classList.add("hl"); }
        edgeEls[`${from}>${to}`] = { path, text, hl: prev?.hl };
      });
    };
    new ResizeObserver(draw).observe(flow);
    shell.redraw = draw;

    let timer = null;
    let dot = null;
    const clear = () => {
      clearTimeout(timer);
      flow.classList.remove("running");
      Object.values(nodeEls).forEach((n) => n.classList.remove("active", "visited"));
      Object.values(edgeEls).forEach((e) => { e.hl = false; e.path.classList.remove("hl", "flowing"); e.path.setAttribute("marker-end", `url(#arr-${key})`); e.text?.classList.remove("hl"); });
      dot?.remove();
      status.classList.remove("live");
      status.textContent = "Passe o mouse nos nós para resumo; clique para detalhes.";
      play.disabled = false;
    };
    const runDot = (path) => {
      if (reduceMotion) return;
      dot?.remove();
      dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("r", 6);
      dot.setAttribute("class", "pulse-dot");
      svg.append(dot);
      const len = path.getTotalLength();
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / 650);
        const p = path.getPointAtLength(len * (1 - Math.pow(1 - t, 3)));
        dot.setAttribute("cx", p.x);
        dot.setAttribute("cy", p.y);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const run = () => {
      clear();
      const steps = spec.scenarios[select.value || scenarioNames[0]];
      flow.classList.add("running");
      status.classList.add("live");
      play.disabled = true;
      let i = 0;
      let prevId = null;
      const tick = () => {
        if (i >= steps.length) {
          Object.values(nodeEls).forEach((n) => n.classList.remove("active"));
          status.textContent = "Fim do cenário. Clique nos nós para ver os detalhes.";
          play.disabled = false;
          return;
        }
        const [id, caption] = steps[i];
        Object.values(nodeEls).forEach((n) => n.classList.remove("active"));
        nodeEls[id].classList.add("active", "visited");
        const edge = prevId && edgeEls[`${prevId}>${id}`];
        if (edge) {
          edge.hl = true;
          edge.path.classList.add("hl", "flowing");
          edge.path.setAttribute("marker-end", `url(#arrhl-${key})`);
          edge.text?.classList.add("hl");
          runDot(edge.path);
          setTimeout(() => edge.path.classList.remove("flowing"), 900);
        }
        status.textContent = `${i + 1}/${steps.length} · ${caption}`;
        prevId = id;
        i += 1;
        timer = setTimeout(tick, reduceMotion ? 900 : 1500);
      };
      tick();
    };
    play.addEventListener("click", run);
    reset.addEventListener("click", clear);
    select.addEventListener("change", clear);
  };
  $$(".flow-shell").forEach(buildFlow);

  /* ---------------- abas (RAG 3) ---------------- */
  $$("[data-tabs]").forEach((tabs) => {
    const section = tabs.closest(".wrap");
    $$(".tab", tabs).forEach((tab) => tab.addEventListener("click", () => {
      $$(".tab", tabs).forEach((t) => t.classList.toggle("active", t === tab));
      $$(".tab-panel", section).forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === tab.dataset.tab));
      $$(".tab-panel.active .flow-shell", section).forEach((shell) => requestAnimationFrame(() => shell.redraw?.()));
    }));
  });

  /* ---------------- busca (demo) ---------------- */
  const STOP = new Set("a o e de do da dos das em no na nos nas um uma para por com que se ou os as ao sobre você voce como qual".split(" "));
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP.has(t));
  const sdType = $("#sdType");
  ["Todas as pesquisas", ...RESEARCH_TYPES].forEach((label, i) => sdType.append(el("option", { value: i ? label : "" }, label)));
  sdType.value = "Opinião pública";
  const runSearch = () => {
    const query = tokens($("#sdQuery").value);
    const type = sdType.value;
    const semantic = $("#sdVector").checked;
    $("#sdRankLabel").textContent = semantic ? "Ranqueia por palavras + significado (híbrida)" : "Ranqueia por palavras em comum (BM25)";
    const inType = SEARCH_RECORDS.filter((r) => !type || !r.types.length || r.types.includes(type));
    const outCount = SEARCH_RECORDS.length - inType.length;
    const docs = inType.map((r) => ({ r, toks: tokens(`${r.title} ${r.text}`) }));
    const avg = docs.reduce((s, d) => s + d.toks.length, 0) / (docs.length || 1);
    const df = {};
    docs.forEach((d) => new Set(d.toks).forEach((t) => { df[t] = (df[t] || 0) + 1; }));
    const k1 = 1.2, b = 0.75, N = docs.length;
    const scored = docs.map((d) => {
      let score = 0;
      query.forEach((q) => {
        const f = d.toks.filter((t) => t === q).length;
        if (!f) return;
        const idf = Math.log(1 + (N - df[q] + 0.5) / (df[q] + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.toks.length) / avg)));
      });
      let sem = false;
      if (semantic && d.r.sem && query.some((q) => d.r.sem.map(norm).includes(q))) { score += 1.6; sem = true; }
      return { ...d, score, sem };
    }).sort((x, y) => y.score - x.score);
    const max = Math.max(1, ...scored.map((s) => s.score));
    const list = $("#sdResults");
    list.innerHTML = "";
    scored.slice(0, 6).forEach((s, i) => {
      const li = el("li", { class: `${s.score ? "" : "out"} ${s.sem ? "sem" : ""}`, style: { animationDelay: `${i * 40}ms` } },
        `<span class="sd-kind">${s.r.kind}</span><span>${s.r.title}${s.sem ? " <small style='color:#fb5303;font-weight:700'>· por significado</small>" : ""}</span>
         <span class="sd-score"><span class="sd-bar"><i style="width:${(s.score / max) * 100}%"></i></span>${s.score.toFixed(2)}</span>`);
      list.append(li);
    });
    const top = scored[0];
    let tipText = `${outCount} conteúdo(s) de outro tipo de pesquisa foram filtrados antes da busca.`;
    if (!top || !top.score) tipText = `Nenhuma palavra em comum: a busca por palavras não encontra nada. ${semantic ? "" : "Ligue a busca por significado para comparar."}`;
    else if (semantic && scored.some((s) => s.sem)) tipText = "Com significado, \"pedágio\" encontra a pesquisa de mobilidade urbana mesmo sem a palavra no texto.";
    $("#sdTip").textContent = tipText;
  };
  ["input", "change"].forEach((evt) => { $("#sdQuery").addEventListener(evt, runSearch); sdType.addEventListener(evt, runSearch); $("#sdVector").addEventListener(evt, runSearch); });
  runSearch();

  /* ---------------- sessões (demo) ---------------- */
  const sess = { versions: [1, 2, 3, 4], locked: false, next: 5 };
  const renderVersions = (gone) => {
    const box = $("#versions");
    box.innerHTML = "";
    if (gone) box.append(el("span", { class: "ver gone" }, `v${gone}`));
    sess.versions.forEach((v, i) => box.append(el("span", { class: `ver ${i === sess.versions.length - 1 ? "current" : ""}` }, `v${v}${sess.locked && i === sess.versions.length - 1 ? " · 🔒Q3" : ""}`)));
  };
  $$("[data-sess]").forEach((button) => button.addEventListener("click", () => {
    const log = $("#sessLog");
    const action = button.dataset.sess;
    if (action === "edit") {
      sess.versions.push(sess.next++);
      let gone = null;
      if (sess.versions.length > 10) gone = sess.versions.shift();
      renderVersions(gone);
      log.textContent = gone ? `Nova versão v${sess.next - 1}. A v${gone} saiu: guardamos só as 10 últimas.` : `Edição aplicada: nova versão v${sess.next - 1}.${sess.locked ? " A Q3 continua igual porque está travada." : ""}`;
    } else if (action === "undo") {
      if (sess.versions.length > 1) {
        const removed = sess.versions.pop();
        renderVersions();
        log.textContent = `Desfeito: saiu a v${removed}, voltou a v${sess.versions[sess.versions.length - 1]}. Sem chamar modelo.`;
      } else log.textContent = "Não há versão anterior para voltar.";
    } else {
      sess.locked = !sess.locked;
      button.textContent = sess.locked ? "Destravar Q3" : "Travar Q3";
      renderVersions();
      log.textContent = sess.locked ? "Q3 travada: nenhuma edição muda essa pergunta, nem a recriação total." : "Q3 destravada.";
    }
  }));
  renderVersions();

  /* ---------------- roteiro (prévia) ---------------- */
  const script = $("#scriptPreview");
  SCRIPT_PREVIEW.forEach((line) => {
    script.append(el("li", { class: line.type },
      `<span class="s-slot">${line.slot}${line.type === "ai" ? " · IA" : line.type === "fixed" ? " · Base" : ""}</span>
       <div>${line.text}${line.keys ? `<div class="s-keys">${line.keys.map((k) => `<span>${k}</span>`).join("")}</div>` : ""}</div>`));
  });

  /* ---------------- guardrails ---------------- */
  const groups = $("#guardGroups");
  GUARDS.forEach((group) => {
    const card = el("div", { class: "ggroup" }, `<h4><i>${group.ico}</i>${group.title}</h4>`);
    group.items.forEach((item) => {
      const badge = item.badge === "adj" ? `<span class="badge adj">ajustável</span>` : item.badge === "log" ? `<span class="badge log">só log</span>` : "";
      card.append(el("div", { class: "gitem", tabindex: "0" }, `${item.t}${badge}<span class="g-detail">${item.d}</span>`));
    });
    groups.append(card);
  });
  const missing = $("#missingList");
  MISSING.forEach((item) => missing.append(el("div", { class: "miss" }, `<b>${item.t}</b><span>${item.d}</span><br/><span class="src">${item.src}</span>`)));

  /* ---------------- perguntas + anotações ---------------- */
  const STORE = "pd-apresentacao-ia-v1";
  const SHARE = {
    email: "mariana.mendanha@poder360.com.br",
    telegramUser: "MariMendanha",
  };
  const MAILTO_BODY_MAX = 1800;
  /** Limite conservador do parâmetro ?text= em t.me (URL total do navegador). */
  const TELEGRAM_TEXT_ENCODED_MAX = 3500;

  let state = {};
  try { state = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { state = {}; }
  const save = () => { localStorage.setItem(STORE, JSON.stringify(state)); renderSummary(); };
  const entry = (id) => (state[id] ||= { note: "", picks: [], done: false });

  const participantInput = $("#participantName");
  if (participantInput) {
    participantInput.value = state.participantName || "";
    participantInput.addEventListener("input", (event) => {
      state.participantName = event.target.value.slice(0, 120);
      save();
    });
  }

  $$("[data-qgroup]").forEach((grid) => {
    const n = grid.dataset.qgroup;
    QUESTIONS[n].forEach((q) => {
      const st = entry(q.id);
      const card = el("div", { class: `qcard ${st.done ? "done" : ""}` }, `
        <div class="q-top"><span class="q-badge">Pergunta para você</span></div>
        <h4>${q.t}</h4><p class="q-ctx">${q.ctx}</p>
        ${q.opts.length ? `<div class="q-opts">${q.opts.map((o) => `<span class="${st.picks.includes(o) ? "picked" : ""}">${o}</span>`).join("")}</div>` : ""}
        <textarea placeholder="Anotar a resposta...">${st.note}</textarea>
        <label class="q-done"><input type="checkbox" ${st.done ? "checked" : ""}/> respondida</label>`);
      $$(".q-opts span", card).forEach((chip) => chip.addEventListener("click", () => {
        const s = entry(q.id);
        const value = chip.textContent;
        s.picks = s.picks.includes(value) ? s.picks.filter((p) => p !== value) : [...s.picks, value];
        chip.classList.toggle("picked");
        save();
      }));
      $("textarea", card).addEventListener("input", (event) => { entry(q.id).note = event.target.value; save(); });
      $("input", card).addEventListener("change", (event) => { entry(q.id).done = event.target.checked; card.classList.toggle("done", event.target.checked); save(); });
      grid.append(card);
    });
  });

  function summaryText() {
    return Object.entries(QUESTIONS).map(([n, list]) => {
      const lines = list.map((q) => {
        const s = entry(q.id);
        const picks = s.picks.length ? ` [${s.picks.join(", ")}]` : "";
        return `- ${s.done ? "[x]" : "[ ]"} ${q.t}${picks}${s.note ? `\n    ${s.note.replace(/\n/g, "\n    ")}` : ""}`;
      });
      return `${n}. ${QUESTION_GROUP_LABEL[n]}\n${lines.join("\n")}`;
    }).join("\n\n");
  }

  function fullExportText() {
    const name = (state.participantName || "").trim();
    const who = name ? `Nome: ${name}\n\n` : "";
    return `Alinhamento IA PoderData\n${who}${summaryText()}`;
  }

  async function copyExportText(button, label = "Copiar anotações") {
    const text = fullExportText();
    try {
      await navigator.clipboard.writeText(text);
      if (button) button.textContent = "Copiado!";
    } catch {
      window.prompt("Copie o texto:", text);
    }
    if (button) setTimeout(() => { button.textContent = label; }, 1600);
  }

  async function shareExport(button) {
    const text = fullExportText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Alinhamento IA PoderData", text });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    openTelegramDraft(text, button, "Compartilhar");
  }

  async function openTelegramDraft(text, button, resetLabel) {
    const encoded = encodeURIComponent(text);
    const chat = `https://t.me/${SHARE.telegramUser}`;
    if (encoded.length <= TELEGRAM_TEXT_ENCODED_MAX) {
      window.location.assign(`${chat}?text=${encoded}`);
    } else {
      try { await navigator.clipboard.writeText(text); } catch { /* segue abrindo o chat */ }
      window.location.assign(chat);
      window.setTimeout(() => {
        window.alert("As respostas foram copiadas — cole na mensagem para @MariMendanha e envie.");
      }, 400);
    }
    if (button) {
      button.textContent = "Abrindo…";
      setTimeout(() => { button.textContent = resetLabel; }, 1600);
    }
  }

  function emailExport() {
    const text = fullExportText();
    let body = text;
    let extra = "";
    if (text.length > MAILTO_BODY_MAX) {
      body = `${text.slice(0, MAILTO_BODY_MAX)}\n\n[Texto truncado no e-mail — use Copiar anotações para o conteúdo completo.]`;
      extra = " (texto longo: parte foi truncada; use Copiar se precisar do completo)";
    }
    const href = `mailto:${SHARE.email}?subject=${encodeURIComponent("Alinhamento IA PoderData")}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    if (extra) window.setTimeout(() => { window.alert(extra); }, 300);
  }

  function telegramExport() {
    openTelegramDraft(fullExportText(), $("#telegramNotes"), "Telegram");
  }
  function renderSummary() {
    const box = $("#summary");
    box.innerHTML = "";
    Object.entries(QUESTIONS).forEach(([n, list]) => {
      const group = el("div", { class: "sum-group" }, `<h4>${n} · ${QUESTION_GROUP_LABEL[n]}</h4>`);
      list.forEach((q) => {
        const s = entry(q.id);
        const picks = s.picks.length ? ` <b style="color:#fb5303">· ${s.picks.join(", ")}</b>` : "";
        const item = el("div", { class: `sum-item ${s.done ? "done" : ""}` }, `<span class="chk"></span><div>${q.t}${picks}<span class="sum-note"></span></div>`);
        $(".sum-note", item).textContent = s.note;
        group.append(item);
      });
      box.append(group);
    });
  }
  renderSummary();
  $("#copyNotes").addEventListener("click", (event) => copyExportText(event.currentTarget));
  $("#shareNotes").addEventListener("click", (event) => shareExport(event.currentTarget));
  $("#emailNotes").addEventListener("click", () => emailExport());
  $("#telegramNotes").addEventListener("click", () => telegramExport());
  $("#clearNotes").addEventListener("click", () => {
    if (!window.confirm("Apagar todas as anotações?")) return;
    localStorage.removeItem(STORE);
    window.location.reload();
  });

  /* ---------------- roadmap ---------------- */
  const timeline = $("#timeline");
  TIMELINE.forEach((step) => timeline.append(el("div", { class: `tl ${step.done ? "done" : ""}` },
    `<div class="tl-card"><span class="tl-when">${step.when}</span><h4>${step.t}</h4><ul>${step.items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`)));

  addReveal();
  spy();
  setActive(0);
})();

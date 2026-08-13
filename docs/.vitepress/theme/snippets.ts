/**
 * Editable playground snippets. Each entry drives one <EditableDemo> instance:
 * the HTML pane is written into the demo container, the JS pane is executed
 * against a container-scoped `Selectable` (plus `asyncSource`, `tr`,
 * `defaultMessages`).
 */
export interface Snippet {
  html: string;
  js: string;
}

export const snippets: Record<string, Snippet> = {
  basic: {
    html: `<select id="city">
  <option value="">Choose a city…</option>
  <option value="34">Istanbul</option>
  <option value="06">Ankara</option>
  <option value="35">Izmir</option>
  <option value="16">Bursa</option>
  <option value="07">Antalya</option>
</select>`,
    js: `new Selectable("#city", { clearable: true });`,
  },

  searchable: {
    html: `<select id="province">
  <option value="">Search a province…</option>
  <option value="01">Adana</option>
  <option value="06">Ankara</option>
  <option value="07">Antalya</option>
  <option value="16">Bursa</option>
  <option value="17">Çanakkale</option>
  <option value="20">Denizli</option>
  <option value="27">Gaziantep</option>
  <option value="34">İstanbul</option>
  <option value="35">İzmir</option>
  <option value="38">Kayseri</option>
  <option value="42">Konya</option>
  <option value="55">Samsun</option>
  <option value="63">Şanlıurfa</option>
  <option value="61">Trabzon</option>
  <option value="65">Van</option>
</select>`,
    js: `new Selectable("#province", { search: true, clearable: true });

// or fine-tuned:
// new Selectable("#province", {
//   search: { minQueryLength: 2, filter: (opt, q) => opt.label.startsWith(q) },
// });`,
  },

  multiple: {
    html: `<select id="skills" multiple>
  <option value="ts" selected>TypeScript</option>
  <option value="css" selected>CSS</option>
  <option value="a11y">Accessibility</option>
  <option value="node">Node.js</option>
  <option value="sql">SQL</option>
  <option value="rust">Rust</option>
  <option value="go">Go</option>
</select>`,
    js: `// multiple comes from <select multiple>
new Selectable("#skills", {
  placeholder: "Pick your skills…",
  clearable: true,
});`,
  },

  counter: {
    html: `<select id="regions" multiple>
  <option value="mar" selected>Marmara</option>
  <option value="ege" selected>Aegean</option>
  <option value="akd" selected>Mediterranean</option>
  <option value="ic">Central Anatolia</option>
  <option value="kar">Black Sea</option>
  <option value="dogu">Eastern Anatolia</option>
  <option value="gdo">Southeastern Anatolia</option>
</select>`,
    js: `new Selectable("#regions", {
  overflow: "counter",   // single-line chips with a "+N" counter; default "wrap"
  maxSelections: 3,
  clearable: true,
});`,
  },

  visibleOptions: {
    html: `<select id="month">
  <option value="">Pick a month…</option>
  <option value="1">January</option>
  <option value="2">February</option>
  <option value="3">March</option>
  <option value="4">April</option>
  <option value="5">May</option>
  <option value="6">June</option>
  <option value="7">July</option>
  <option value="8">August</option>
  <option value="9">September</option>
  <option value="10">October</option>
  <option value="11">November</option>
  <option value="12">December</option>
</select>`,
    js: `new Selectable("#month", {
  visibleOptions: 5, // scroll after 5 rows
  search: false,     // isolate the effect (search auto-enables above 8 options)
});`,
  },

  tags: {
    html: `<select id="labels" multiple>
  <option value="bug" selected>bug</option>
  <option value="feature">feature</option>
  <option value="docs">docs</option>
</select>`,
    js: `new Selectable("#labels", {
  tags: true,
  placeholder: "Add labels…",
  clearable: true,
});

// custom option factory:
// new Selectable("#labels", {
//   tags: { create: (label) => ({ value: label.trim().toLowerCase(), label: label.trim() }) },
// });`,
  },

  remote: {
    html: `<select id="members"></select>`,
    js: `// Fake paginated API: 100 members, 20 per page, ~400 ms latency.
const MEMBERS = Array.from({ length: 100 }, (_, i) => ({
  value: String(i + 1),
  label: \`Member #\${String(i + 1).padStart(3, "0")}\`,
}));
const PAGE_SIZE = 20;

new Selectable("#members", {
  source: asyncSource(async (query, { page }) => {
    // in real code: fetch(\`/api/members?q=\${query}&page=\${page}\`, { signal })
    await new Promise((r) => setTimeout(r, 400));
    const q = query.trim().toLowerCase();
    const hits = MEMBERS.filter((m) => m.label.toLowerCase().includes(q));
    const start = page * PAGE_SIZE;
    return {
      options: hits.slice(start, start + PAGE_SIZE),
      hasMore: start + PAGE_SIZE < hits.length, // ← enables infinite scroll
    };
  }),
  placeholder: "Search members…",
  clearable: true,
});`,
  },

  selectAll: {
    html: `<select id="cities" multiple>
  <optgroup label="Marmara">
    <option value="34">Istanbul</option>
    <option value="16">Bursa</option>
    <option value="41">Kocaeli</option>
  </optgroup>
  <optgroup label="Aegean">
    <option value="35">Izmir</option>
    <option value="09">Aydın</option>
  </optgroup>
  <optgroup label="Central Anatolia">
    <option value="06">Ankara</option>
    <option value="42">Konya</option>
  </optgroup>
</select>`,
    js: `new Selectable("#cities", {
  selectAll: { groups: true }, // \`true\` = header row only; groups adds per-group toggles
  search: true,                // with a query, "all" means the filtered matches
  placeholder: "Pick cities…",
  clearable: true,
});`,
  },

  subtext: {
    html: `<!-- bootstrap-select markup parity: data-subtext / data-image / data-icon
     on native options are promoted to typed fields automatically -->
<select id="member">
  <option value="">Choose a member…</option>
  <option value="ada"
          data-image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect width='20' height='20' fill='%233d63dd'/%3E%3Ccircle cx='10' cy='8' r='3.5' fill='%23fff'/%3E%3Cpath d='M3.5 18a6.5 6.5 0 0113 0z' fill='%23fff'/%3E%3C/svg%3E"
          data-subtext="ada@example.com — image and subtext">Ada Lovelace</option>
  <option value="grace"
          data-image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect width='20' height='20' fill='%230e9f6e'/%3E%3Ccircle cx='10' cy='8' r='3.5' fill='%23fff'/%3E%3Cpath d='M3.5 18a6.5 6.5 0 0113 0z' fill='%23fff'/%3E%3C/svg%3E">Grace Hopper (image only)</option>
  <option value="alan" data-subtext="alan@example.com">Alan Turing</option>
  <option value="edsger" data-subtext="edsger@example.com">Edsger Dijkstra</option>
</select>`,
    js: `// No extra config needed — data-subtext renders a muted second line
// in the panel, data-image a 20px rounded leading image (data-icon takes
// an icon-font class string, e.g. "fa fa-user").
new Selectable("#member", { clearable: true });`,
  },

  veto: {
    html: `<select id="choice">
  <option value="">Pick anything but Forbidden…</option>
  <option value="alpha">Alpha</option>
  <option value="forbidden">Forbidden (vetoed)</option>
  <option value="beta">Beta</option>
</select>`,
    js: `const sel = new Selectable("#choice");

// before* events fire ahead of the action; preventDefault() aborts it
// silently — no change events, native select untouched.
sel.on("beforeChange", (e) => {
  // e.value/e.options = current selection; e.next/e.nextOptions = proposed
  if (e.next.includes("forbidden")) e.preventDefault();
});

// Same recipe gates opens/closes/tag creation:
// sel.on("beforeClose", (e) => { if (formIsDirty) e.preventDefault(); });`,
  },

  chain: {
    html: `<div style="display: grid; gap: 12px;">
  <select id="chain-province">
    <option value="">Choose a province…</option>
    <option value="34">Istanbul</option>
    <option value="06">Ankara</option>
    <option value="35">Izmir</option>
  </select>
  <select id="chain-district">
    <option value="">Choose a district…</option>
  </select>
  <select id="chain-neighborhood">
    <option value="">Choose a neighborhood…</option>
  </select>
</div>`,
    js: `const DISTRICTS = {
  "34": [
    { value: "kadikoy", label: "Kadıköy" },
    { value: "besiktas", label: "Beşiktaş" },
    { value: "uskudar", label: "Üsküdar" },
  ],
  "06": [
    { value: "cankaya", label: "Çankaya" },
    { value: "kecioren", label: "Keçiören" },
    { value: "mamak", label: "Mamak" },
  ],
  "35": [
    { value: "konak", label: "Konak" },
    { value: "bornova", label: "Bornova" },
    { value: "karsiyaka", label: "Karşıyaka" },
  ],
};

const province = new Selectable("#chain-province", { next: "#chain-district" });
const district = new Selectable("#chain-district", { next: "#chain-neighborhood" });
const neighborhood = new Selectable("#chain-neighborhood"); // terminal — no next

// Order guarantee: change handlers run BEFORE the next panel opens,
// so the district list is already populated when its panel appears.
province.on("change", ({ value }) => {
  district.setValue([], { silent: true });
  neighborhood.setValue([], { silent: true });
  neighborhood.setOptions([]);
  district.setOptions(DISTRICTS[value[0]] ?? []);
});
district.on("change", ({ value, options }) => {
  neighborhood.setValue([], { silent: true });
  neighborhood.setOptions([1, 2, 3].map((n) => ({
    value: \`\${value[0]}-n\${n}\`,
    label: \`\${options[0].label} Neighborhood \${n}\`,
  })));
});

// Tip: \`autofocus: true\` on the first select starts the flow on page
// load — left off here so this docs page doesn't steal your keyboard.`,
  },

  virtual: {
    html: `<select id="items"></select>`,
    js: `const items = Array.from({ length: 10000 }, (_, i) => ({
  value: String(i + 1),
  label: \`Item #\${String(i + 1).padStart(5, "0")}\`,
}));

// virtualization kicks in automatically above 50 options
new Selectable("#items", {
  source: items,
  placeholder: "Search 10,000 items…",
  clearable: true,
});`,
  },

  sizes: {
    html: `<div style="display: flex; gap: 12px; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 150px;">
    <select id="size-sm">
      <option value="">size: sm</option>
      <option value="1">Alpha</option>
      <option value="2">Beta</option>
      <option value="3">Gamma</option>
    </select>
  </div>
  <div style="flex: 1; min-width: 150px;">
    <select id="size-md">
      <option value="">size: md (default)</option>
      <option value="1">Alpha</option>
      <option value="2">Beta</option>
      <option value="3">Gamma</option>
    </select>
  </div>
  <div style="flex: 1; min-width: 150px;">
    <select id="size-lg">
      <option value="">size: lg</option>
      <option value="1">Alpha</option>
      <option value="2">Beta</option>
      <option value="3">Gamma</option>
    </select>
  </div>
</div>
<div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 12px;">
  <div style="flex: 1; min-width: 150px;">
    <select id="density-compact">
      <option value="">density: compact</option>
      <option value="1">Alpha</option>
      <option value="2">Beta</option>
      <option value="3">Gamma</option>
    </select>
  </div>
  <div style="flex: 1; min-width: 150px;">
    <select id="density-comfortable">
      <option value="">density: comfortable</option>
      <option value="1">Alpha</option>
      <option value="2">Beta</option>
      <option value="3">Gamma</option>
    </select>
  </div>
</div>`,
    js: `new Selectable("#size-sm", { size: "sm", search: false });
new Selectable("#size-md", { search: false });
new Selectable("#size-lg", { size: "lg", search: false });

new Selectable("#density-compact", { density: "compact", search: false });
new Selectable("#density-comfortable", { density: "comfortable", search: false });`,
  },

  theming: {
    html: `<select id="brand" multiple>
  <option value="mint" selected>Mint</option>
  <option value="sage">Sage</option>
  <option value="olive">Olive</option>
  <option value="fern">Fern</option>
</select>`,
    js: `const sel = new Selectable("#brand", {
  placeholder: "Green-brand select…",
  clearable: true,
});

// One token rebrands everything — focus ring, selection, chips all derive.
// In a stylesheet this is simply:  .sl { --sl-accent: #16a34a; }
document.getElementById("brand")
  .closest(".sl")
  .style.setProperty("--sl-accent", "#16a34a");`,
  },
};

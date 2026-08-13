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
    html: `<select id="country"></select>`,
    js: `// A fake API: ~400 ms latency over a country list.
const COUNTRIES = [
  "Argentina", "Australia", "Brazil", "Canada", "Denmark", "France",
  "Germany", "India", "Japan", "Mexico", "Netherlands", "Norway",
  "Portugal", "Spain", "Sweden", "Türkiye", "United Kingdom", "United States",
];

const fakeApi = (query) =>
  new Promise((resolve) =>
    setTimeout(() => {
      const q = query.trim().toLowerCase();
      resolve(COUNTRIES.filter((c) => c.toLowerCase().includes(q)));
    }, 400),
  );

new Selectable("#country", {
  source: asyncSource(async (query) => {
    const names = await fakeApi(query); // swap for fetch(\`/api/…?q=\${query}\`, { signal })
    return names.map((name) => ({
      value: name.toLowerCase().replace(/\\s+/g, "-"),
      label: name,
    }));
  }),
  placeholder: "Search countries…",
  clearable: true,
});`,
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

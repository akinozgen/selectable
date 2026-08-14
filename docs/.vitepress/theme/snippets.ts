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
    html: `<select id="operative">
  <option value="">Choose an operative…</option>
  <option value="jill">Jill Valentine</option>
  <option value="chris">Chris Redfield</option>
  <option value="leon">Leon S. Kennedy</option>
  <option value="claire">Claire Redfield</option>
  <option value="ada">Ada Wong</option>
</select>`,
    js: `new Selectable("#operative", { clearable: true });`,
  },

  searchable: {
    html: `<select id="location">
  <option value="">Search a location…</option>
  <option value="rpd">R.P.D. Station</option>
  <option value="clock-tower">Clock Tower</option>
  <option value="hospital">Hospital</option>
  <option value="nest">NEST Laboratory</option>
  <option value="spencer">Spencer Mansion</option>
  <option value="guardhouse">Guardhouse</option>
  <option value="training">Training Facility</option>
  <option value="dimitrescu">Castle Dimitrescu</option>
  <option value="village">The Village</option>
  <option value="salazar">Salazar Castle</option>
  <option value="stars-office">S.T.A.R.S. Office</option>
  <option value="evidence">Evidence Room</option>
  <option value="library">Library</option>
  <option value="main-hall">Main Hall</option>
  <option value="cold-storage">Cold Storage</option>
</select>`,
    js: `new Selectable("#location", { search: true, clearable: true });

// or fine-tuned:
// new Selectable("#location", {
//   search: { minQueryLength: 2, filter: (opt, q) => opt.label.startsWith(q) },
// });`,
  },

  multiple: {
    html: `<select id="inventory" multiple>
  <option value="green-herb" selected>Green Herb</option>
  <option value="red-herb" selected>Red Herb</option>
  <option value="blue-herb">Blue Herb</option>
  <option value="first-aid">First Aid Spray</option>
  <option value="ink-ribbon">Ink Ribbon</option>
  <option value="lockpick">Lockpick</option>
  <option value="master-key">Master Key</option>
</select>`,
    js: `// multiple comes from <select multiple>
new Selectable("#inventory", {
  placeholder: "Pick your items…",
  clearable: true,
});`,
  },

  counter: {
    html: `<select id="squad" multiple>
  <option value="jill" selected>Jill Valentine</option>
  <option value="chris" selected>Chris Redfield</option>
  <option value="barry" selected>Barry Burton</option>
  <option value="rebecca">Rebecca Chambers</option>
  <option value="brad">Brad Vickers</option>
  <option value="sheva">Sheva Alomar</option>
  <option value="jake">Jake Muller</option>
</select>`,
    js: `new Selectable("#squad", {
  overflow: "counter",   // single-line chips with a "+N" counter; default "wrap"
  maxSelections: 3,
  clearable: true,
});`,
  },

  visibleOptions: {
    html: `<select id="room">
  <option value="">Pick a room…</option>
  <option value="stars-office">S.T.A.R.S. Office</option>
  <option value="evidence">Evidence Room</option>
  <option value="library">Library</option>
  <option value="main-hall">Main Hall</option>
  <option value="dining">Dining Room</option>
  <option value="art-room">Art Room</option>
  <option value="terrace">Terrace</option>
  <option value="east-lab">East Wing Lab</option>
  <option value="cold-storage">Cold Storage</option>
  <option value="control-room">Control Room</option>
</select>`,
    js: `new Selectable("#room", {
  visibleOptions: 5, // scroll after 5 rows
  search: false,     // isolate the effect (search auto-enables above 8 options)
});`,
  },

  tags: {
    html: `<select id="loadout" multiple>
  <option value="green-herb" selected>green herb</option>
  <option value="red-herb">red herb</option>
  <option value="ink-ribbon">ink ribbon</option>
</select>`,
    js: `new Selectable("#loadout", {
  tags: true,
  placeholder: "Add items…",
  clearable: true,
});

// custom option factory:
// new Selectable("#loadout", {
//   tags: { create: (label) => ({ value: label.trim().toLowerCase(), label: label.trim() }) },
// });`,
  },

  remote: {
    html: `<select id="agents"></select>`,
    js: `// Fake paginated API: 100 agents, 20 per page, ~400 ms latency.
const AGENTS = Array.from({ length: 100 }, (_, i) => ({
  value: String(i + 1),
  label: \`Agent #\${String(i + 1).padStart(3, "0")}\`,
}));
const PAGE_SIZE = 20;

new Selectable("#agents", {
  source: asyncSource(async (query, { page }) => {
    // in real code: fetch(\`/api/agents?q=\${query}&page=\${page}\`, { signal })
    await new Promise((r) => setTimeout(r, 400));
    const q = query.trim().toLowerCase();
    const hits = AGENTS.filter((m) => m.label.toLowerCase().includes(q));
    const start = page * PAGE_SIZE;
    return {
      options: hits.slice(start, start + PAGE_SIZE),
      hasMore: start + PAGE_SIZE < hits.length, // ← enables infinite scroll
    };
  }),
  placeholder: "Search agents…",
  clearable: true,
});`,
  },

  selectAll: {
    html: `<select id="sites" multiple>
  <optgroup label="Raccoon City">
    <option value="rpd">R.P.D. Station</option>
    <option value="clock-tower">Clock Tower</option>
    <option value="hospital">Hospital</option>
  </optgroup>
  <optgroup label="Arklay Mountains">
    <option value="spencer">Spencer Mansion</option>
    <option value="guardhouse">Guardhouse</option>
  </optgroup>
  <optgroup label="Europe">
    <option value="dimitrescu">Castle Dimitrescu</option>
    <option value="village">The Village</option>
  </optgroup>
</select>`,
    js: `new Selectable("#sites", {
  selectAll: { groups: true }, // \`true\` = header row only; groups adds per-group toggles
  search: true,                // with a query, "all" means the filtered matches
  placeholder: "Pick locations…",
  clearable: true,
});`,
  },

  subtext: {
    html: `<!-- bootstrap-select markup parity: data-subtext / data-image / data-icon
     on native options are promoted to typed fields automatically -->
<select id="member">
  <option value="">Choose a member…</option>
  <option value="jill"
          data-image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect width='20' height='20' fill='%233d63dd'/%3E%3Ccircle cx='10' cy='8' r='3.5' fill='%23fff'/%3E%3Cpath d='M3.5 18a6.5 6.5 0 0113 0z' fill='%23fff'/%3E%3C/svg%3E"
          data-subtext="S.T.A.R.S. Alpha, Rear Security — image and subtext">Jill Valentine</option>
  <option value="chris"
          data-image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect width='20' height='20' fill='%230e9f6e'/%3E%3Ccircle cx='10' cy='8' r='3.5' fill='%23fff'/%3E%3Cpath d='M3.5 18a6.5 6.5 0 0113 0z' fill='%23fff'/%3E%3C/svg%3E">Chris Redfield (image only)</option>
  <option value="leon" data-subtext="R.P.D. Rookie">Leon S. Kennedy</option>
  <option value="grace" data-subtext="FBI Analyst">Grace Ashcroft</option>
</select>`,
    js: `// No extra config needed — data-subtext renders a muted second line
// in the panel, data-image a 20px rounded leading image (data-icon takes
// an icon-font class string, e.g. "fa fa-user").
new Selectable("#member", { clearable: true });`,
  },

  veto: {
    html: `<select id="contact">
  <option value="">Pick a contact…</option>
  <option value="ada">Ada Wong</option>
  <option value="forbidden">Albert Wesker</option>
  <option value="hunnigan">Ingrid Hunnigan</option>
</select>`,
    js: `const sel = new Selectable("#contact");

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
  <select id="chain-region">
    <option value="">Choose a region…</option>
    <option value="rc">Raccoon City</option>
    <option value="arklay">Arklay Mountains</option>
    <option value="europe">Europe</option>
  </select>
  <select id="chain-facility">
    <option value="">Choose a facility…</option>
  </select>
  <select id="chain-room">
    <option value="">Choose a room…</option>
  </select>
</div>`,
    js: `const FACILITIES = {
  "rc": [
    { value: "rpd", label: "R.P.D. Station" },
    { value: "clock-tower", label: "Clock Tower" },
    { value: "nest", label: "NEST Laboratory" },
  ],
  "arklay": [
    { value: "spencer", label: "Spencer Mansion" },
    { value: "guardhouse", label: "Guardhouse" },
    { value: "training", label: "Training Facility" },
  ],
  "europe": [
    { value: "dimitrescu", label: "Castle Dimitrescu" },
    { value: "village", label: "The Village" },
    { value: "salazar", label: "Salazar Castle" },
  ],
};

const region = new Selectable("#chain-region", { next: "#chain-facility" });
const facility = new Selectable("#chain-facility", { next: "#chain-room" });
const room = new Selectable("#chain-room"); // terminal — no next

// Order guarantee: change handlers run BEFORE the next panel opens,
// so the facility list is already populated when its panel appears.
region.on("change", ({ value }) => {
  facility.setValue([], { silent: true });
  room.setValue([], { silent: true });
  room.setOptions([]);
  facility.setOptions(FACILITIES[value[0]] ?? []);
});
facility.on("change", ({ value, options }) => {
  room.setValue([], { silent: true });
  room.setOptions([1, 2, 3].map((n) => ({
    value: \`\${value[0]}-r\${n}\`,
    label: \`\${options[0].label} Room \${n}\`,
  })));
});

// Tip: \`autofocus: true\` on the first select starts the flow on page
// load — left off here so this docs page doesn't steal your keyboard.`,
  },

  virtual: {
    html: `<select id="specimens"></select>`,
    js: `const specimens = Array.from({ length: 10000 }, (_, i) => ({
  value: String(i + 1),
  label: \`Specimen #\${String(i + 1).padStart(5, "0")}\`,
}));

// virtualization kicks in automatically above 50 options
new Selectable("#specimens", {
  source: specimens,
  placeholder: "Search 10,000 specimens…",
  clearable: true,
});`,
  },

  sizes: {
    html: `<div style="display: flex; gap: 12px; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 150px;">
    <select id="size-sm">
      <option value="">size: sm</option>
      <option value="1">Green Herb</option>
      <option value="2">Red Herb</option>
      <option value="3">Blue Herb</option>
    </select>
  </div>
  <div style="flex: 1; min-width: 150px;">
    <select id="size-md">
      <option value="">size: md (default)</option>
      <option value="1">Green Herb</option>
      <option value="2">Red Herb</option>
      <option value="3">Blue Herb</option>
    </select>
  </div>
  <div style="flex: 1; min-width: 150px;">
    <select id="size-lg">
      <option value="">size: lg</option>
      <option value="1">Green Herb</option>
      <option value="2">Red Herb</option>
      <option value="3">Blue Herb</option>
    </select>
  </div>
</div>
<div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 12px;">
  <div style="flex: 1; min-width: 150px;">
    <select id="density-compact">
      <option value="">density: compact</option>
      <option value="1">Green Herb</option>
      <option value="2">Red Herb</option>
      <option value="3">Blue Herb</option>
    </select>
  </div>
  <div style="flex: 1; min-width: 150px;">
    <select id="density-comfortable">
      <option value="">density: comfortable</option>
      <option value="1">Green Herb</option>
      <option value="2">Red Herb</option>
      <option value="3">Blue Herb</option>
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
  <option value="green-herb" selected>Green Herb</option>
  <option value="red-herb">Red Herb</option>
  <option value="blue-herb">Blue Herb</option>
  <option value="first-aid">First Aid Spray</option>
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

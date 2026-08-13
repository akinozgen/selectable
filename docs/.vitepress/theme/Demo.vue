<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

interface DemoOption {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
  selected?: boolean;
}

const props = defineProps<{
  /** Options rendered into the native <select> (progressive enhancement). */
  options?: DemoOption[];
  /** Generate N bulk options ("Item #00001"…) — passed as `source` (virtual demo). */
  optionCount?: number;
  multiple?: boolean;
  placeholder?: string;
  /** Options object passed straight to `new Selectable(el, config)`. */
  config?: Record<string, unknown>;
  /** Wire a fake asyncSource (~400 ms latency) over a small country list. */
  remote?: boolean;
  /** Render the live `value` under the demo. */
  showValue?: boolean;
  /** Inline `--sl-accent` override on the component root (theming teaser). */
  accent?: string;
}>();

const selectEl = ref<HTMLSelectElement | null>(null);
const currentValue = ref<string[]>([]);

/* Group consecutive options so native <optgroup>s can be rendered. */
const segments = computed(() => {
  const segs: { group: string | null; items: DemoOption[] }[] = [];
  for (const o of props.options ?? []) {
    const g = o.group ?? null;
    const last = segs[segs.length - 1];
    if (last && last.group === g) last.items.push(o);
    else segs.push({ group: g, items: [o] });
  }
  return segs;
});

const COUNTRIES = [
  "Argentina", "Australia", "Austria", "Belgium", "Brazil", "Canada",
  "Chile", "Denmark", "Egypt", "Finland", "France", "Germany", "Greece",
  "India", "Indonesia", "Ireland", "Italy", "Japan", "Mexico",
  "Netherlands", "New Zealand", "Norway", "Poland", "Portugal",
  "South Korea", "Spain", "Sweden", "Switzerland", "Türkiye",
  "United Kingdom", "United States",
];

let instance: any = null;
let observer: MutationObserver | null = null;
let offChange: (() => void) | null = null;

onMounted(async () => {
  const { Selectable, asyncSource } = await import("../../../src/index.ts");

  const config: Record<string, unknown> = { ...(props.config ?? {}) };
  if (props.placeholder && config.placeholder === undefined) {
    config.placeholder = props.placeholder;
  }

  if (props.optionCount) {
    config.source = Array.from({ length: props.optionCount }, (_, i) => ({
      value: String(i + 1),
      label: `Item #${String(i + 1).padStart(5, "0")}`,
    }));
  }

  if (props.remote) {
    config.source = asyncSource(async (query: string) => {
      await new Promise((r) => setTimeout(r, 400)); // fake network latency
      const q = query.trim().toLowerCase();
      return COUNTRIES.filter((c) => c.toLowerCase().includes(q)).map((c) => ({
        value: c.toLowerCase().replace(/\s+/g, "-"),
        label: c,
      }));
    });
  }

  instance = new Selectable(selectEl.value!, config);

  const root = selectEl.value!.closest(".sl") as HTMLElement | null;
  if (root) {
    if (props.accent) root.style.setProperty("--sl-accent", props.accent);
    // Bridge VitePress's `.dark` class on <html> to Selectable's theme attribute.
    const syncTheme = () => {
      root.setAttribute(
        "data-sl-theme",
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
    };
    syncTheme();
    observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  if (props.showValue) {
    currentValue.value = instance.value;
    offChange = instance.on("change", ({ value }: { value: string[] }) => {
      currentValue.value = value;
    });
  }
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
  offChange?.();
  offChange = null;
  instance?.destroy();
  instance = null;
});
</script>

<template>
  <div class="sl-demo">
    <select ref="selectEl" :multiple="multiple">
      <option v-if="placeholder && !multiple && options?.length" value="">{{ placeholder }}</option>
      <template v-for="(seg, i) in segments" :key="i">
        <optgroup v-if="seg.group" :label="seg.group">
          <option
            v-for="o in seg.items"
            :key="o.value"
            :value="o.value"
            :disabled="o.disabled"
            :selected="o.selected"
          >{{ o.label }}</option>
        </optgroup>
        <template v-else>
          <option
            v-for="o in seg.items"
            :key="o.value"
            :value="o.value"
            :disabled="o.disabled"
            :selected="o.selected"
          >{{ o.label }}</option>
        </template>
      </template>
    </select>
    <div v-if="showValue" class="sl-demo-value">
      value: <code>{{ JSON.stringify(currentValue) }}</code>
    </div>
  </div>
</template>

<style scoped>
.sl-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 24px;
  margin: 16px 0;
  background-color: var(--vp-c-bg-soft);
}

.sl-demo-value {
  margin-top: 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.sl-demo-value code {
  font-size: 12px;
}
</style>

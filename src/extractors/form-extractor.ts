import type { BrowserAdapter } from "../adapter";
import type { FormInfo } from "../domain/types";

export async function extractForms(
  adapter: BrowserAdapter
): Promise<FormInfo[]> {
  return adapter.evaluate(() => {
    function bestSelector(el: Element): string {
      if (el.id) return "#" + el.id;
      const name = el.getAttribute("name");
      if (name) return `[name="${name}"]`;
      return el.tagName.toLowerCase();
    }

    const forms: any[] = [];
    document.querySelectorAll("form").forEach((form, idx) => {
      const fields: any[] = [];
      form.querySelectorAll("input, textarea, select").forEach(el => {
        const labelEl = (el as HTMLInputElement).id
          ? document.querySelector(
              `label[for="${(el as HTMLInputElement).id}"]`
            )
          : null;
        fields.push({
          selector: bestSelector(el),
          name: el.getAttribute("name") || "",
          type: (el as HTMLInputElement).type || el.tagName.toLowerCase(),
          label:
            el.getAttribute("aria-label") ||
            el.getAttribute("placeholder") ||
            labelEl?.textContent?.trim() ||
            "",
          required:
            el.hasAttribute("required") ||
            el.getAttribute("aria-required") === "true",
          placeholder: el.getAttribute("placeholder") || undefined,
          options:
            el.tagName === "SELECT"
              ? Array.from((el as HTMLSelectElement).options).map(o => o.value)
              : undefined,
        });
      });
      const submitBtn = form.querySelector(
        'button[type="submit"], input[type="submit"], button:not([type])'
      );
      forms.push({
        selector: form.id ? "#" + form.id : `form:nth-of-type(${idx + 1})`,
        action: form.getAttribute("action") || "",
        method: (form.getAttribute("method") || "GET").toUpperCase(),
        fields,
        submitSelector: submitBtn ? bestSelector(submitBtn) : undefined,
        fieldCount: fields.length,
      });
    });
    return forms;
  });
}

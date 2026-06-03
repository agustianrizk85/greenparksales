import { useState } from "react";
import type { Dashboard } from "../../types";
import { SECTIONS } from "./schema";
import { ArrayEditor, CrudSection, SingletonForm } from "./widgets";

/**
 * Master-data admin. Reads the current dashboard payload, renders one editable
 * section at a time and calls reload() after every write so the dashboard view
 * reflects the change.
 */
export function Admin({ data, reload }: { data: Dashboard; reload: () => void }) {
  const [active, setActive] = useState(SECTIONS[0].id);
  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  return (
    <div className="adm-root">
      <aside className="adm-nav">
        <div className="adm-nav-title">Master Data</div>
        {SECTIONS.map((s) => (
          <button key={s.id} className={"adm-nav-item" + (s.id === active ? " active" : "")} onClick={() => setActive(s.id)}>
            {s.label}
          </button>
        ))}
      </aside>
      <div className="adm-body">
        {/* key by section id so editors re-init from the latest data on switch */}
        {section.kind === "crud" && <CrudSection key={section.id} section={section} rows={section.pick(data)} reload={reload} />}
        {section.kind === "single" && <SingletonForm key={section.id} section={section} value={section.pick(data)} reload={reload} />}
        {section.kind === "array" && <ArrayEditor key={section.id} section={section} rows={section.pick(data)} reload={reload} />}
      </div>
    </div>
  );
}

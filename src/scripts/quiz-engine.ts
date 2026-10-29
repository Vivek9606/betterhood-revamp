// A small re-implementation of the Gravity Forms behaviour the old assessments relied on:
// conditional logic (show/hide), calculation fields and their formulas.
export interface Choice { value: string; label: string; img?: string }
export interface Field {
  id: number; type: string; page: number; label: string; description?: string; required: boolean;
  hidden: boolean; css: string; choices?: Choice[]; inputType?: string; placeholder?: string; default?: string; html?: string;
}
export interface Rule { fieldId: string; operator: "is" | "isnot" | "<" | ">" | string; value: string }
export interface Logic { enabled?: boolean; actionType: "show" | "hide"; logicType: "all" | "any"; rules: Rule[] }
export interface FormDef { slug: string; formId: number; fields: Field[]; formulas: Record<string, string>; logic: Record<string, Logic> }

export type Values = Record<number, string | string[]>;

export class QuizEngine {
  byId = new Map<number, Field>();
  form: FormDef;
  values: Values;
  constructor(form: FormDef, values: Values = {}) {
    this.form = form;
    this.values = values;
    form.fields.forEach((f) => this.byId.set(f.id, f));
  }

  raw(id: number): string | string[] {
    const v = this.values[id];
    if (v !== undefined) return v;
    return this.byId.get(id)?.default ?? "";
  }

  /** Field passes its own conditional logic (and none of the fields its rules depend on are hidden). */
  shown(id: number, seen = new Set<number>()): boolean {
    const l = this.form.logic[id];
    if (!l || l.enabled === false) return true;
    if (seen.has(id)) return true;
    seen.add(id);
    const test = (r: Rule) => {
      const fid = +r.fieldId;
      const f = this.byId.get(fid);
      const depShown = this.shown(fid, seen);
      let v: string | string[] = depShown ? (f && this.isCalc(f) ? String(this.num(fid)) : this.raw(fid)) : "";
      const arr = Array.isArray(v) ? v : [v];
      switch (r.operator) {
        case "is": return arr.some((x) => x === r.value);
        case "isnot": return !arr.some((x) => x === r.value);
        case ">": return arr.some((x) => x !== "" && parseFloat(x) > parseFloat(r.value));
        case "<": return arr.some((x) => x !== "" && parseFloat(x) < parseFloat(r.value));
        case "contains": return arr.some((x) => x.includes(r.value));
        default: return false;
      }
    };
    const pass = l.logicType === "any" ? l.rules.some(test) : l.rules.every(test);
    return l.actionType === "hide" ? !pass : pass;
  }

  isCalc(f: Field) { return f.id in this.form.formulas || f.type === "number" || f.type === "calculation"; }

  private stack = new Set<number>();
  /** Numeric value of a field the way Gravity Forms computes it: hidden-by-logic counts as 0. */
  num(id: number): number {
    const f = this.byId.get(id);
    if (!f || !this.shown(id)) return 0;
    const formula = this.form.formulas[id];
    if (formula === undefined) {
      const v = this.raw(id);
      const n = parseFloat(Array.isArray(v) ? v[0] ?? "" : v);
      return Number.isFinite(n) ? n : 0;
    }
    if (this.stack.has(id)) return 0;
    this.stack.add(id);
    const expr = formula.replace(/\{[^}]*?:(\d+)(?:\.\d+)?\}/g, (_, fid) => `(${this.num(+fid)})`);
    this.stack.delete(id);
    if (!/^[\d\s+\-*/().]*$/.test(expr)) return 0;
    try {
      const n = Function(`"use strict";return (${expr || 0})`)() as number;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }
}

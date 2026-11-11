/** Shared helpers for composition ports. */

import type { App } from '../application/App.ts';

export type PortMethod = (...args: unknown[]) => unknown;
export type PortRecord = Record<string, unknown>;

export function bindMethod(app: App, name: keyof App): PortMethod {
  return (...args: unknown[]) => (app[name] as unknown as PortMethod).call(app, ...args);
}

export function bindCall(app: App, name: string): PortMethod {
  return (...args: unknown[]) => {
    const fn = (app as unknown as Record<string, unknown>)[name];
    return typeof fn === 'function' ? (fn as PortMethod).call(app, ...args) : undefined;
  };
}

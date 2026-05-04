// src/context.js
// Request-scoped context for log correlation.

import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage();

export const runWithContext = (context, fn) => {
    return storage.run({ ...(context || {}) }, fn);
};

export const getContext = () => {
    return storage.getStore() || {};
};

export const setContext = (values = {}) => {
    const current = storage.getStore();
    if (!current) return;

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            current[key] = value;
        }
    });
};

export default {
    runWithContext,
    getContext,
    setContext,
};

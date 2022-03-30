import { ReactiveEffect } from './effect';


export type Dep = Set<ReactiveEffect>;

export function createDep() {
    const dep = new Set<ReactiveEffect>();

    return dep;
}
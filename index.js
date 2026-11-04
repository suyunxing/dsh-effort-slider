/**
 * Host half of dsh-effort-slider.
 *
 * The whole feature lives in the browser half (exports "./client"): a composer
 * pill plus a frame-wide overlay panel. The Host row exists so the bundle owns a
 * Loader entry the Client half can attach to; it declares no Service, no Tool
 * and no Config, and therefore has nothing to apply.
 */
export const name = 'effort-slider'
export const inject = []
export function apply() {}

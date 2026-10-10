import $ from 'jquery';

// Ensure jQuery is available in the global scope (window and globalThis)
// before jquery-ui plugins attempt to reference it.
if (typeof window !== 'undefined') {
  (window as any).jQuery = $;
  (window as any).$ = $;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).jQuery = $;
  (globalThis as any).$ = $;
}

export default $;

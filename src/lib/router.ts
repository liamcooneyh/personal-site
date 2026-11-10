import { useEffect, useState, type MouseEvent } from 'react';

/** A two-page site doesn't need a router library: track the path and intercept internal links. */
export type Page = 'home' | 'art';

const pageFor = (path: string): Page => (path.replace(/\/+$/, '') === '/art' ? 'art' : 'home');

const scrollToHash = (hash: string) => {
  if (!hash) {
    window.scrollTo(0, 0);
    return;
  }
  // wait a frame so the new page has rendered before scrolling to the section
  requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
};

export const usePage = (): Page => {
  const [page, setPage] = useState<Page>(() => pageFor(window.location.pathname));
  useEffect(() => {
    const onPop = () => setPage(pageFor(window.location.pathname));
    window.addEventListener('popstate', onPop);
    window.addEventListener('site:navigate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('site:navigate', onPop);
    };
  }, []);
  return page;
};

/** onClick for internal links like "/art" or "/#work": navigate without a full reload. */
export const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
  const url = new URL(event.currentTarget.href);
  if (url.origin !== window.location.origin) return;
  const samePage = pageFor(url.pathname) === pageFor(window.location.pathname);
  if (samePage && url.hash) return; // ordinary in-page anchor
  event.preventDefault();
  window.history.pushState(null, '', url.pathname + url.hash);
  window.dispatchEvent(new Event('site:navigate'));
  scrollToHash(url.hash);
};

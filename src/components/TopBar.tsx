import { useEffect, useState, type MouseEvent } from 'react';
import { navigate, type Page } from '../lib/router';
import { ThemeToggle } from './ThemeToggle';

const LINKS = [
  { href: '/#work', label: 'Work' },
  { href: '/#built', label: 'Projects' },
  { href: '/art', label: 'Art', page: 'art' },
] as const;

/**
 * Wide screens show every link in the bar. Phones get a Menu button that drops a panel
 * of the same links under the bar, so every section stays one tap away.
 */
export const TopBar = ({ page }: { page: Page }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    setIsOpen(false);
    navigate(event);
  };

  return (
    <header className={`topbar${isOpen ? ' is-open' : ''}`}>
      <a className="topbar__name" href="/" onClick={follow}>
        Liam Cooney
      </a>
      <div className="topbar__end">
        <ThemeToggle />
        <button
          type="button"
          className="pill topbar__menu"
          aria-expanded={isOpen}
          aria-controls="site-nav"
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? 'Close' : 'Menu'}
        </button>
      </div>
      <nav id="site-nav" className="topbar__nav" aria-label="Sections">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={follow}
            aria-current={'page' in link && page === link.page ? 'page' : undefined}
          >
            {link.label}
          </a>
        ))}
        <a className="pill pill--ink" href="#hi" onClick={() => setIsOpen(false)}>
          Say hi
        </a>
      </nav>
    </header>
  );
};

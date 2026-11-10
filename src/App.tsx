import { ArtWall } from './components/ArtWall';
import { Background } from './components/Background';
import { DataLens } from './components/DataLens';
import { GalleryRoom } from './components/GalleryRoom';
import { InkIntro } from './components/InkIntro';
import { Landing } from './components/Landing';
import { ThemeToggle } from './components/ThemeToggle';
import { Headshot } from './components/Headshot';
import { Projects } from './components/Projects';
import { WorkList } from './components/WorkList';
import { CONTACT, HERO_ART, PAINTINGS, SKETCHES } from './data/content';
import { artSrc } from './data/content';
import { useState } from 'react';
import { navigate, usePage } from './lib/router';

export const App = () => {
  const page = usePage();
  const [artView, setArtView] = useState<'gallery' | 'all'>('gallery');
  return (
  <>
    <Background />
    {page === 'home' && <InkIntro />}
    <a className="skip-link" href="#main">
      Skip to content
    </a>

    <header className="topbar">
      <a className="topbar__name" href="/" onClick={navigate}>
        Liam Cooney
      </a>
      <nav className="topbar__nav" aria-label="Sections">
        <a href="/#work" onClick={navigate}>Work</a>
        <a href="/#built" onClick={navigate}>Projects</a>
        <a href="/art" onClick={navigate} aria-current={page === 'art' ? 'page' : undefined}>
          Art
        </a>
        <ThemeToggle />
        <a className="pill pill--ink" href="#hi">
          Say hi
        </a>
      </nav>
    </header>

    {page === 'art' ? (
    <main id="main" className="art-page">
      <section className="block art-page__head" aria-labelledby="art-page-title">
        <h1 id="art-page-title" className="block__title">
          Art
        </h1>
        <div className="view-switch" role="group" aria-label="How to show the art">
          <button type="button" aria-pressed={artView === 'gallery'} onClick={() => setArtView('gallery')}>
            Gallery
          </button>
          <button type="button" aria-pressed={artView === 'all'} onClick={() => setArtView('all')}>
            See everything
          </button>
        </div>
      </section>

      {artView === 'gallery' ? (
        <>
          <section className="block block--room" id="art" aria-labelledby="art-title">
            <h2 id="art-title" className="gallery-title">
              Paintings
            </h2>
            <GalleryRoom artworks={PAINTINGS} kind="painting" label="Paintings" />
          </section>
          <section className="block block--room" id="sketchbook" aria-labelledby="sketch-title">
            <h2 id="sketch-title" className="gallery-title">
              Sketchbook
            </h2>
            <GalleryRoom artworks={SKETCHES} kind="sketch" label="Sketchbook" />
          </section>
        </>
      ) : (
        <>
          <section className="block block--gallery" id="art" aria-labelledby="art-title">
            <h2 id="art-title" className="gallery-title">
              Paintings
            </h2>
            <ArtWall artworks={PAINTINGS} />
          </section>
          <section className="block block--gallery" id="sketchbook" aria-labelledby="sketch-title">
            <h2 id="sketch-title" className="gallery-title">
              Sketchbook
            </h2>
            <ArtWall artworks={SKETCHES} />
          </section>
        </>
      )}
    </main>
    ) : (
    <main id="main">
      <Landing />
      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero__copy">
          <h1 id="hero-title" className="hero__title">
            Hi, I’m Liam.
          </h1>
          <p className="hero__lede">
            I build the integrations, pipelines, and internal tools that sales, finance, and
            operations teams depend on. I also paint.
          </p>
          <p className="hero__hint">
            That’s one of mine on the right. Move your cursor over it (or tap) and the lens turns
            the paint into data. Click to see that color full-screen, or switch the lens off to just look.
          </p>
          <div className="hero__ctas">
            <a className="pill pill--ink pill--big" href="#work">
              See my work
            </a>
            <a className="pill pill--big" href={`mailto:${CONTACT.email}`}>
              Email me
            </a>
          </div>
        </div>
        <div className="hero__art">
          <DataLens artworks={HERO_ART} />
        </div>
      </section>

      <section className="about" aria-labelledby="about-title">
        <Headshot />
        <div className="about__copy">
          <h2 id="about-title" className="about__title">
            Half spreadsheet, half sketchbook.
          </h2>
          <p>
            I studied Information Systems and Business Analytics at Boston College, with a minor in
            Studio Art, and I never really picked between them.
          </p>
          <p>
            Most of my work has sat between the people who build systems and the people who have to
            use them, which is usually where things break. I like owning a problem end to end, from
            questioning messy data to shipping the fix, and I won’t draw a conclusion the data
            can’t support.
          </p>
          <p>
            I learn by taking things apart, from video games to production systems, until I
            understand how the small pieces fit together. Outside work that means management games,
            roguelites, reading, and documentaries, plus painting, drawing, and music production.
          </p>
          <p className="about__now">
            <span className="pill pill--ink">Right now</span>
            GTM Operations at Shelf
          </p>
        </div>
      </section>

      <section className="block" id="work" aria-labelledby="work-title">
        <div className="block__head">
          <h2 id="work-title" className="block__title">
            Where I’ve worked
          </h2>
        </div>
        <WorkList />
      </section>

      <section className="block" id="built" aria-labelledby="built-title">
        <div className="block__head">
          <h2 id="built-title" className="block__title">
            Stuff I’ve built
          </h2>
        </div>
        <Projects />
      </section>

      <section className="block art-teaser" aria-labelledby="art-teaser-title">
        <div className="art-teaser__inner">
          <div>
            <h2 id="art-teaser-title" className="block__title">
              Paintings and sketches
            </h2>
          </div>
          <a className="pill pill--ink pill--big" href="/art" onClick={navigate}>
            See the art
          </a>
        </div>
        <ul className="art-teaser__strip" aria-hidden="true">
          {PAINTINGS.slice(0, 6).map((piece) => (
            <li key={piece.id}>
              <a href="/art" onClick={navigate} tabIndex={-1}>
                <img src={artSrc(piece, 's')} alt="" loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
    )}

    <footer className="hi" id="hi" aria-labelledby="hi-title">
      <h2 id="hi-title" className="hi__title">
        Say hi.
      </h2>
      <p className="hi__lede">
        Building something, or want to talk data, systems, or painting? My inbox is open.
      </p>
      <a className="hi__email" href={`mailto:${CONTACT.email}`}>
        {CONTACT.email}
      </a>
      <div className="hi__links">
        <a className="pill pill--ink pill--big" href={CONTACT.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a className="pill pill--ink pill--big" href={CONTACT.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
      <p className="hi__fine">Built in React. Painted by hand.</p>
    </footer>
  </>
  );
};

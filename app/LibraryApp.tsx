"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, ChevronDown, Heart, Library, List, Menu, Minus, Moon, Search, Settings2, SlidersHorizontal, Sun, X } from "lucide-react";
import { books, readerPages, type Book, type Profile } from "./data";
import LibraryRoom, { createRoomPlacements } from "./LibraryRoom";

type Theme = "light" | "dark";
type View = "catalog" | "room";
type Filter = "All" | "Mine" | "Lucia" | "Shared" | "Reading" | "Finished" | "Want to Read" | "Favorites";
type ReaderTheme = "light" | "dark" | "sepia";
const FILTERS: Filter[] = ["All", "Mine", "Lucia", "Shared", "Reading", "Finished", "Want to Read", "Favorites"];

function Cover({ book, compact = false }: { book: Book; compact?: boolean }) {
  return <div className={`cover cover-${book.motif} ${compact ? "cover-compact" : ""}`} style={{ "--cover": book.color, "--ink": book.ink, "--accent": book.accent } as React.CSSProperties}>
    <div className="cover-grain" /><div className="cover-rule" /><div className="cover-mark"><i /><i /><i /></div>
    <div className="cover-copy">{book.series && <span>{book.series}</span>}<strong>{book.title}</strong><em>{book.author}</em></div>
  </div>;
}

function Progress({ value }: { value: number }) {
  return <span className="progress-track" aria-label={`${value}% read`}><i style={{ width: `${value}%` }} /></span>;
}

function BookCard({ book, profile, onOpen, index }: { book: Book; profile: Profile; onOpen: () => void; index: number }) {
  const state = book.states[profile];
  return <button className="book-card" onClick={onOpen} style={{ "--delay": `${Math.min(index, 12) * 34}ms` } as React.CSSProperties} aria-label={`Open ${book.title} by ${book.author}`}>
    <div className="book-object"><Cover book={book} /></div>
    <div className="book-meta"><strong>{book.title}</strong><span>{book.author}</span>{state.progress > 0 && state.progress < 100 ? <div className="card-progress"><Progress value={state.progress} /><small>{state.progress}%</small></div> : <small>{state.status === "Finished" ? "Finished" : book.genre}</small>}</div>
    {state.favorite && <Heart className="favorite-mark" size={14} fill="currentColor" />}
  </button>;
}

function Detail({ book, profile, onClose, onRead, onFavorite }: { book: Book; profile: Profile; onClose: () => void; onRead: () => void; onFavorite: () => void }) {
  const state = book.states[profile];
  return <div className="detail-layer" role="dialog" aria-modal="true" aria-label={`${book.title} details`}>
    <button className="scrim" onClick={onClose} aria-label="Close details" />
    <article className="detail-card"><button className="icon-button detail-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
      <div className="detail-cover-wrap"><div className="detail-book"><Cover book={book} /></div></div>
      <div className="detail-copy"><div className="eyebrow">{book.series || book.genre} · {book.year}</div><h2>{book.title}</h2><p className="detail-author">{book.author}</p><p className="description">{book.description}</p>
        <div className="detail-stats"><div><span>{profile}’s progress</span><strong>{state.progress}%</strong><Progress value={state.progress} /></div><div><span>Status</span><strong>{state.status}</strong></div><div><span>Lives on</span><strong>{book.owner === "Shared" ? "Our shelves" : `${book.owner}’s shelf`}</strong></div></div>
        <div className="rating" aria-label={`${state.rating} out of five stars`}>{[1,2,3,4,5].map(i => <span key={i} className={i <= state.rating ? "filled" : ""}>★</span>)}</div>
        <div className="detail-actions"><button className="primary-button" onClick={onRead}><BookOpen size={18} />{state.progress > 0 && state.progress < 100 ? "Continue reading" : "Read"}</button><button className={`round-action ${state.favorite ? "active" : ""}`} onClick={onFavorite} aria-label={`${state.favorite ? "Remove" : "Add"} ${book.title} ${state.favorite ? "from" : "to"} favorites`} aria-pressed={state.favorite}><Heart size={19} fill={state.favorite ? "currentColor" : "none"} /></button></div>
      </div>
    </article>
  </div>;
}

function Reader({ book, initialPage, onPage, onClose }: { book: Book; initialPage: number; onPage: (page: number) => void; onClose: () => void }) {
  const [page, setPage] = useState(Math.min(initialPage, readerPages.length - 1));
  const [controls, setControls] = useState(true), [settings, setSettings] = useState(false), [toc, setToc] = useState(false);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>("sepia"), [font, setFont] = useState("literary"), [fontSize, setFontSize] = useState(19), [lineHeight, setLineHeight] = useState(1.72), [width, setWidth] = useState("comfortable"), [mode, setMode] = useState<"pages" | "scroll">("pages"), [align, setAlign] = useState<"left" | "justify">("left"), [bookmarked, setBookmarked] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const go = useCallback((next: number) => { const value = Math.max(0, Math.min(readerPages.length - 1, next)); setPage(value); onPage(value); }, [onPage]);
  useEffect(() => { const key = (e: KeyboardEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    if (e.key === "Escape") { settings || toc ? (setSettings(false), setToc(false)) : onClose(); return; }
    if (settings || toc || mode === "scroll" || target?.closest("button,input,select,textarea,[contenteditable='true']")) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); go(page - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(page + 1); }
  }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [go, mode, onClose, page, settings, toc]);
  const chapter = readerPages[page], readProgress = Math.round(((page + 1) / readerPages.length) * 100);
  return <div className={`reader reader-${readerTheme} font-${font} width-${width} mode-${mode}`} style={{ "--reader-size": `${fontSize}px`, "--line-height": lineHeight, "--align": align } as React.CSSProperties} onTouchStart={e => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => { if (settings || toc || mode === "scroll") return; const dx = e.changedTouches[0].clientX - touchStart.current.x, dy = e.changedTouches[0].clientY - touchStart.current.y; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) go(page + (dx < 0 ? 1 : -1)); }}>
    <div className={`reader-bars ${controls ? "visible" : ""}`}><header><button className="reader-icon" onClick={onClose} aria-label="Close reader"><ArrowLeft size={20} /></button><div><span>{book.title}</span><small>{chapter[0]} · {readProgress}%</small></div><nav><button className={`reader-icon ${bookmarked ? "active" : ""}`} onClick={() => setBookmarked(!bookmarked)} aria-label="Bookmark"><Bookmark size={19} fill={bookmarked ? "currentColor" : "none"} /></button><button className="reader-icon" onClick={() => { setToc(!toc); setSettings(false); }} aria-label="Table of contents"><List size={20} /></button><button className="reader-icon" onClick={() => { setSettings(!settings); setToc(false); }} aria-label="Reading settings"><Settings2 size={20} /></button></nav></header><footer><span>{page + 1}</span><Progress value={readProgress} /><span>{readerPages.length}</span></footer></div>
    <button className="reader-zone reader-left" disabled={page === 0 || mode === "scroll"} onClick={() => go(page - 1)} aria-label="Previous page" /><main className="reader-page" onClick={() => setControls(!controls)}><div className="chapter-kicker">{String(page + 1).padStart(2, "0")}</div><h1>{chapter[0]}</h1><p className="lead">{chapter[1]}</p><p>{chapter[2]}</p><p>{chapter[3]}</p>{mode === "scroll" && readerPages.slice(page + 1).map((c, i) => <section key={i}><h1>{c[0]}</h1><p className="lead">{c[1]}</p><p>{c[2]}</p><p>{c[3]}</p></section>)}</main><button className="reader-zone reader-right" disabled={page === readerPages.length - 1 || mode === "scroll"} onClick={() => go(page + 1)} aria-label="Next page" />
    {settings && <aside className="reader-panel settings-panel"><div className="panel-title"><strong>Reading appearance</strong><button onClick={() => setSettings(false)}><X size={18} /></button></div><label>Theme</label><div className="segmented three">{(["light", "sepia", "dark"] as ReaderTheme[]).map(t => <button key={t} className={readerTheme === t ? "active" : ""} onClick={() => setReaderTheme(t)}>{t}</button>)}</div><label>Font</label><div className="segmented two">{["serif", "literary", "sans", "accessible"].map(f => <button key={f} className={font === f ? "active" : ""} onClick={() => setFont(f)}>{f}</button>)}</div><div className="setting-row"><label>Font size</label><div><button onClick={() => setFontSize(Math.max(15, fontSize - 1))}><Minus size={16} /></button><span>{fontSize}</span><button onClick={() => setFontSize(Math.min(28, fontSize + 1))}>A+</button></div></div><div className="setting-row"><label>Line height</label><input type="range" min="1.35" max="2.05" step=".05" value={lineHeight} onChange={e => setLineHeight(+e.target.value)} /></div><label>Page width</label><div className="segmented three">{["narrow", "comfortable", "wide"].map(w => <button key={w} className={width === w ? "active" : ""} onClick={() => setWidth(w)}>{w}</button>)}</div><label>Mode &amp; alignment</label><div className="segmented two"><button className={mode === "pages" ? "active" : ""} onClick={() => setMode("pages")}>Pages</button><button className={mode === "scroll" ? "active" : ""} onClick={() => setMode("scroll")}>Scroll</button><button className={align === "left" ? "active" : ""} onClick={() => setAlign("left")}>Left</button><button className={align === "justify" ? "active" : ""} onClick={() => setAlign("justify")}>Justified</button></div></aside>}
    {toc && <aside className="reader-panel toc-panel"><div className="panel-title"><strong>Contents</strong><button onClick={() => setToc(false)}><X size={18} /></button></div>{readerPages.map((c, i) => <button key={c[0]} className={i === page ? "active" : ""} onClick={() => { go(i); setToc(false); }}><span>{String(i + 1).padStart(2, "0")}</span>{c[0]}{i === page && <Check size={16} />}</button>)}</aside>}
  </div>;
}

export default function LibraryApp() {
  const [theme, setTheme] = useState<Theme>("light"), [profile, setProfile] = useState<Profile>("Dan"), [view, setView] = useState<View>("catalog"), [filter, setFilter] = useState<Filter>("All"), [query, setQuery] = useState(""), [searchOpen, setSearchOpen] = useState(false), [filterOpen, setFilterOpen] = useState(false), [profileOpen, setProfileOpen] = useState(false), [selectedId, setSelectedId] = useState<number | null>(null), [roomSelected, setRoomSelected] = useState<number | null>(null), [roomRetrieval, setRoomRetrieval] = useState<"idle" | "moving" | "ready">("idle"), [readerBook, setReaderBook] = useState<Book | null>(null), [progress, setProgress] = useState<Record<string, number>>({}), [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("our-library") || "{}"); const params = new URLSearchParams(window.location.search); if (saved.theme) setTheme(saved.theme); if (saved.profile) setProfile(saved.profile); if (saved.progress) setProgress(saved.progress); if (saved.favorites) setFavoriteOverrides(saved.favorites); if (params.get("room") === "1") setView("room"); if (params.get("theme") === "dark") setTheme("dark"); } catch {} }, []);
  useEffect(() => { localStorage.setItem("our-library", JSON.stringify({ theme, profile, progress, favorites: favoriteOverrides })); }, [theme, profile, progress, favoriteOverrides]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 30); } if (e.key === "Escape" && !readerBook) { setSelectedId(null); setRoomSelected(null); setSearchOpen(false); } }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [readerBook]);
  const personalizedBooks = useMemo(() => books.map(book => ({ ...book, states: { ...book.states, [profile]: { ...book.states[profile], favorite: favoriteOverrides[`${profile}-${book.id}`] ?? book.states[profile].favorite } } })), [profile, favoriteOverrides]);
  const roomPlacements = useMemo(() => createRoomPlacements(personalizedBooks), [personalizedBooks]);
  const filtered = useMemo(() => personalizedBooks.filter(book => { const q = query.toLowerCase(); if (q && !`${book.title} ${book.author} ${book.genre} ${book.series || ""}`.toLowerCase().includes(q)) return false; const s = book.states[profile]; if (filter === "Mine") return book.owner === profile; if (filter === "Lucia") return book.owner === "Lucia"; if (filter === "Shared") return book.owner === "Shared"; if (filter === "Reading" || filter === "Finished" || filter === "Want to Read") return s.status === filter; if (filter === "Favorites") return s.favorite; return true; }), [personalizedBooks, query, filter, profile]);
  const selected = selectedId ? personalizedBooks.find(b => b.id === selectedId) || null : null, roomBook = roomSelected ? personalizedBooks.find(b => b.id === roomSelected) || null : null, continueBooks = personalizedBooks.filter(b => b.states[profile].status === "Reading").slice(0, 4), favorites = personalizedBooks.filter(b => b.states[profile].favorite).slice(0, 5);
  const roomBooksInOrder = useMemo(() => [...personalizedBooks].sort((a,b) => (roomPlacements.get(a.id) ?? 0) - (roomPlacements.get(b.id) ?? 0)), [personalizedBooks, roomPlacements]);
  const navigateRoom = useCallback((direction: "left" | "right" | "up" | "down") => {
    if (!roomBooksInOrder.length) return;
    const current = roomSelected ? roomBooksInOrder.find(book => book.id === roomSelected) : null;
    if (!current) { setRoomSelected(roomBooksInOrder[direction === "left" || direction === "up" ? roomBooksInOrder.length - 1 : 0].id); return; }
    const currentIndex = roomPlacements.get(current.id) ?? 0;
    const coords = (index: number) => ({ row: Math.floor(index / 4) % 4, x: [-5.25,-1.75,1.75,5.25][index % 4] - .72 + Math.floor(index / 16) * .48 });
    const here = coords(currentIndex);
    const candidates = roomBooksInOrder.filter(book => book.id !== current.id).map(book => { const index = roomPlacements.get(book.id) ?? 0; return { book, ...coords(index) }; });
    let target: Book | undefined;
    if (direction === "left" || direction === "right") {
      const sameRow = candidates.filter(item => item.row === here.row && (direction === "left" ? item.x < here.x : item.x > here.x)).sort((a,b) => Math.abs(a.x-here.x)-Math.abs(b.x-here.x));
      target = sameRow[0]?.book;
    } else {
      const desiredRow = Math.max(0, Math.min(3, here.row + (direction === "up" ? 1 : -1)));
      target = candidates.filter(item => item.row === desiredRow).sort((a,b) => Math.abs(a.x-here.x)-Math.abs(b.x-here.x))[0]?.book;
    }
    if (!target) {
      const index = roomBooksInOrder.findIndex(book => book.id === current.id);
      const delta = direction === "left" || direction === "down" ? -1 : 1;
      target = roomBooksInOrder[(index + delta + roomBooksInOrder.length) % roomBooksInOrder.length];
    }
    setRoomSelected(target.id);
  }, [roomBooksInOrder, roomPlacements, roomSelected]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (view !== "room" || readerBook || selectedId || searchOpen || profileOpen || filterOpen || target?.closest("button,input,select,textarea,[contenteditable='true'],[role='dialog']")) return;
      const directions: Record<string, "left" | "right" | "up" | "down"> = { ArrowLeft:"left", ArrowRight:"right", ArrowUp:"up", ArrowDown:"down" };
      if (directions[event.key]) { event.preventDefault(); navigateRoom(directions[event.key]); }
      if (event.key === "Enter" && roomBook && roomRetrieval === "ready") { event.preventDefault(); setSelectedId(roomBook.id); setRoomSelected(null); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [filterOpen, navigateRoom, profileOpen, readerBook, roomBook, roomRetrieval, searchOpen, selectedId, view]);
  const openReader = (book: Book) => { setReaderBook(book); setSelectedId(null); }, pageFor = (book: Book) => progress[`${profile}-${book.id}`] ?? Math.floor(book.states[profile].progress / 100 * readerPages.length), savePage = (book: Book, page: number) => setProgress(p => ({ ...p, [`${profile}-${book.id}`]: page })), toggleFavorite = (book: Book) => setFavoriteOverrides(f => ({ ...f, [`${profile}-${book.id}`]: !(f[`${profile}-${book.id}`] ?? book.states[profile].favorite) })), enterRoom = () => { setView("room"); setSelectedId(null); }, roomSearchMatch = searchOpen && query ? filtered[0] : null;

  return <div className={`app theme-${theme} view-${view}`}>
    <header className="app-header"><button className="brand" onClick={() => setView("catalog")} aria-label="Our Library home"><span className="brand-mark"><i /><i /><i /></span><span>OUR <em>LIBRARY</em></span></button><div className="view-switch" role="tablist" aria-label="Library view"><button role="tab" aria-selected={view === "catalog"} className={view === "catalog" ? "active" : ""} onClick={() => setView("catalog")}><Library size={16} />Library</button><button role="tab" aria-selected={view === "room"} className={view === "room" ? "active" : ""} onClick={enterRoom}><span className="door-icon" />Our Library</button><i className="switch-thumb" /></div><nav className="header-actions"><button className="search-trigger" onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 30); }}><Search size={17} /><span>Search our library…</span><kbd>⌘ K</kbd></button><button className="icon-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button><div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen} aria-haspopup="menu"><span>{profile[0]}</span>{profile}<ChevronDown size={14} /></button>{profileOpen && <div className="profile-menu" role="menu"><small>Reading as</small>{(["Dan", "Lucia"] as Profile[]).map(p => <button role="menuitemradio" aria-checked={p === profile} key={p} onClick={() => { setProfile(p); setProfileOpen(false); }}>{p}<span>{p === profile && <Check size={15} />}</span></button>)}<p>A little bookmark shows what each of you is reading.</p></div>}</div></nav><button className="mobile-search icon-button" onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={19} /></button><button className="mobile-menu icon-button" onClick={() => setProfileOpen(!profileOpen)} aria-label="Choose reading profile" aria-expanded={profileOpen}><Menu size={19} /></button></header>
    {view === "catalog" ? <main className="catalog"><section className="welcome-row"><div><span className="eyebrow">Saturday, quiet morning</span><h1>{profile === "Dan" ? "Good morning, Dan." : "Good morning, Lucia."}</h1><p>{continueBooks.length ? `You have ${continueBooks.length} stories waiting for you.` : "What shall we read next?"}</p></div><button className="room-invite" onClick={enterRoom}><span><small>Step inside</small><strong>Our room</strong></span><i>→</i></button></section>
      {continueBooks.length > 0 && <section className="shelf-section continue-section"><div className="section-heading"><h2>Continue reading</h2><span>{profile}’s books</span></div><div className="continue-row">{continueBooks.map(book => <button key={book.id} className="continue-card" onClick={() => openReader(book)}><div className="mini-book"><Cover book={book} compact /></div><div><small>{book.states[profile].status}</small><strong>{book.title}</strong><span>{book.author}</span><Progress value={book.states[profile].progress} /><em>{book.states[profile].progress}% · Continue</em></div><ArrowRight size={18} /></button>)}</div></section>}
      <section className="shelf-section all-books"><div className="section-heading browse-heading"><div><h2>{filter === "All" ? "Your shelves" : filter}</h2><span>{filtered.length} books</span></div><button className="filter-trigger" onClick={() => setFilterOpen(!filterOpen)} aria-expanded={filterOpen}><SlidersHorizontal size={16} />{filter}<ChevronDown size={14} /></button></div><div className="filter-bar" aria-label="Book filters">{FILTERS.map(f => <button key={f} aria-pressed={filter === f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>)}</div>{filtered.length ? <div className="book-grid">{filtered.map((book, i) => <BookCard key={book.id} book={book} profile={profile} onOpen={() => setSelectedId(book.id)} index={i} />)}</div> : <div className="empty-state"><Search size={24} /><h3>No book found on these shelves</h3><p>Try a title, author, genre, or another filter.</p><button onClick={() => { setQuery(""); setFilter("All"); }}>Show all books</button></div>}</section>
      <section className="favorites-section"><div className="section-heading"><h2>Our favorites</h2><span>Books we keep returning to</span></div><div className="favorite-stack">{favorites.map((book, i) => <button key={book.id} onClick={() => setSelectedId(book.id)} style={{ "--i": i, "--cover": book.color } as React.CSSProperties}><Cover book={book} compact /></button>)}<p><Heart size={18} fill="currentColor" /> {profile === "Dan" ? "Lucia loved two of these too." : "Dan loved three of these too."}</p></div></section></main> : <main className="room-view">
      <LibraryRoom books={personalizedBooks} theme={theme} selectedId={roomSelected || roomSearchMatch?.id || null} search={searchOpen ? query : ""} profile={profile} onSelect={setRoomSelected} onClear={() => setRoomSelected(null)} onRetrievalChange={setRoomRetrieval} />
      <div className="room-ui"><div className="room-title"><span className="eyebrow">Dan &amp; Lucia’s</span><h1>Our Library</h1><p>{theme === "dark" ? "The fire is warm. Stay a while." : "A quiet afternoon among our books."}</p></div><div className="room-hint"><span className="mouse-hint" />Drag to look · scroll to move · arrows browse books</div></div>
      {!roomBook && <div className="room-book-navigation" aria-label="Browse books on the shelves">
        <button onClick={() => navigateRoom("left")} aria-label="Previous book"><ArrowLeft size={18} /></button>
        <div aria-live="polite"><small>Explore the shelves</small><strong>Choose a book</strong></div>
        <button onClick={() => navigateRoom("right")} aria-label="Next book"><ArrowRight size={18} /></button>
      </div>}
      {roomBook && <aside className={`room-selection ${roomRetrieval !== "ready" ? "is-retrieving" : ""}`} aria-live="polite"><div className="room-mini-cover"><Cover book={roomBook} compact /></div><div className="room-selection-copy"><small>{roomRetrieval !== "ready" ? "The ladder is on its way…" : roomBook.highShelf ? "The ladder found it" : "From our shelves"}</small><strong>{roomBook.title}</strong><span>{roomBook.author}</span></div><button disabled={roomRetrieval !== "ready"} onClick={() => { setSelectedId(roomBook.id); setRoomSelected(null); }}>{roomRetrieval === "ready" ? "Open book" : "Retrieving"} <ArrowRight size={16} /></button><button className="room-selection-close" onClick={() => setRoomSelected(null)} aria-label="Put book back"><X size={17} /></button><div className="room-selection-nav"><button onClick={() => navigateRoom("left")} aria-label="Previous book"><ArrowLeft size={17} /></button><span>{roomBooksInOrder.findIndex(book => book.id === roomBook.id)+1} of {roomBooksInOrder.length}</span><button onClick={() => navigateRoom("right")} aria-label="Next book"><ArrowRight size={17} /></button></div></aside>}
      <div className="room-controls"><button onClick={() => setView("catalog")}><ArrowLeft size={16} /> Catalog</button><button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}{theme === "light" ? "Evening" : "Daylight"}</button></div>
    </main>}
    {searchOpen && <div className="search-layer" role="dialog" aria-modal="true" aria-label="Search our library"><button className="search-scrim" onClick={() => setSearchOpen(false)} /><div className="search-box"><div className="search-input"><Search size={20} /><input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search our library…" /><kbd>ESC</kbd><button onClick={() => setSearchOpen(false)}><X size={18} /></button></div><div className="search-results">{query ? filtered.slice(0, 6).map(book => <button key={book.id} onClick={() => { setSearchOpen(false); if (view === "room") setRoomSelected(book.id); else setSelectedId(book.id); }}><div className="result-cover"><Cover book={book} compact /></div><span><strong>{book.title}</strong><small>{book.author} · {book.genre}</small></span><em>{book.highShelf ? "Upper shelf" : book.owner}</em></button>) : <div className="search-suggestions"><span>Try a favorite</span>{[books[0], books[1], books[12]].map(b => <button key={b.id} onClick={() => setQuery(b.title)}>{b.title}</button>)}</div>}{query && !filtered.length && <div className="no-results">No book found. The shelves are quiet.</div>}</div><footer><span>Type to filter instantly</span><span>Choose a result to open it</span><span>Titles, authors, genres &amp; series</span></footer></div></div>}
    {filterOpen && <div className="mobile-sheet"><button className="sheet-scrim" onClick={() => setFilterOpen(false)} /><div><i /><h3>Show me</h3>{FILTERS.map(f => <button key={f} className={filter === f ? "active" : ""} onClick={() => { setFilter(f); setFilterOpen(false); }}>{f}{filter === f && <Check size={16} />}</button>)}</div></div>}
    {selected && <Detail book={selected} profile={profile} onClose={() => setSelectedId(null)} onRead={() => openReader(selected)} onFavorite={() => toggleFavorite(selected)} />}{readerBook && <Reader book={readerBook} initialPage={pageFor(readerBook)} onPage={p => savePage(readerBook, p)} onClose={() => setReaderBook(null)} />}
    <nav className="mobile-nav"><button aria-current={view === "catalog" ? "page" : undefined} className={view === "catalog" ? "active" : ""} onClick={() => setView("catalog")}><Library size={20} /><span>Library</span></button><button aria-current={view === "room" ? "page" : undefined} className={view === "room" ? "active" : ""} onClick={enterRoom}><span className="door-icon" /><span>Our room</span></button><button onClick={() => setSearchOpen(true)}><Search size={20} /><span>Search</span></button><button onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}><span className="nav-avatar">{profile[0]}</span><span>{profile}</span></button></nav>
  </div>;
}

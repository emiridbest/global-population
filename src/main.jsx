import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { geoOrthographic, geoDistance, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Globe2, Activity, ArrowUpRight, ArrowDownRight, Pause, Play, FastForward, RotateCcw, Search, Maximize2, Minimize2, SlidersHorizontal, Info, X, ChevronRight, Users, Radio, Plus, Minus } from 'lucide-react';
import 'flag-icons/css/flag-icons.min.css';
import './style.css';
import { prepare, population, totals, YEAR, EPOCH } from './model';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);
const fmt = n => Math.floor(n).toLocaleString('en-US');
const compact = n => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
function Counter({ value }) { return <span className="counter" aria-label={fmt(value)}>{fmt(value).split('').map((d, i) => /\d/.test(d) ? <span className="digit" key={i}><span className="reel" style={{ transform: `translateY(-${Number(d) * 10}%)` }}>{'0123456789'.split('').map(n => <span key={n}>{n}</span>)}</span></span> : <span className="comma" key={i}>{d}</span>)}</span> }
function Flag({ code }) { return <span aria-hidden="true" className={`fi fi-${code}`} /> }
function App() {
    const [countries, setCountries] = useState([]), [world, setWorld] = useState(null), [error, setError] = useState('');
    const [seconds, setSeconds] = useState((Date.now() - EPOCH) / 1000), [paused, setPaused] = useState(false), [speed, setSpeed] = useState(1), [region, setRegion] = useState('All regions'), [query, setQuery] = useState(''), [selected, setSelected] = useState(null), [tab, setTab] = useState('map'), [broadcast, setBroadcast] = useState(false), [info, setInfo] = useState(false), [zoom, setZoom] = useState(1);
    useEffect(() => { Promise.all([fetch('/countries-raw.json').then(r => { if (!r.ok) throw Error(); return r.json() }), fetch('/world.json').then(r => { if (!r.ok) throw Error(); return r.json() })]).then(([c, w]) => { setCountries(prepare(c)); setWorld(feature(w, w.objects.countries)) }).catch(() => setError('Could not load the bundled map and country data. Refresh to try again.')); }, []);
    useEffect(() => { let last = performance.now(); const id = setInterval(() => { const now = performance.now(), delta = (now - last) / 1000; last = now; if (!paused) setSeconds(s => Math.min(s + delta * speed, 24 * YEAR)); }, 150); return () => clearInterval(id) }, [paused, speed]);
    useEffect(() => { const key = e => { if (e.key === 'Escape') { setSelected(null); setInfo(false); setBroadcast(false) } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, []);
    const [tourPlaying, setTourPlaying] = useState(false), [tourTime, setTourTime] = useState(0);
    const tourCountries = useMemo(() => countries.filter(c => region === 'All regions' || c.region === region).sort((a, b) => a.lon - b.lon || a.name.localeCompare(b.name)), [countries, region]);
    useEffect(() => { setTourTime(0) }, [region]);
    useEffect(() => {
        if (!tourPlaying || !tourCountries.length || selected || info) return;
        let frame, last;
        const tick = now => {
            if (last === undefined || document.hidden) last = now;
            if (now - last >= 50) {
                const delta = (now - last) / 1000;
                setTourTime(t => t + delta);
                last = now;
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [tourPlaying, tourCountries.length, selected, info]);
    const tourIndex = Math.floor(tourTime / 5) % Math.max(1, tourCountries.length);
    const activeCountry = tourCountries[tourIndex];
    const [hoveredCountry, setHoveredCountry] = useState(null);
    const spotlightCountry = hoveredCountry || activeCountry;
    const nextCountry = tourCountries[(tourIndex + 1) % Math.max(1, tourCountries.length)];
    const progress = (tourTime % 5) / 5;
    const centerLon = activeCountry ? activeCountry.lon + ((nextCountry.lon - activeCountry.lon + 360) % 360) * progress : 0;
    const centerLat = activeCountry ? activeCountry.lat + (nextCountry.lat - activeCountry.lat) * progress : 15;
    const total = totals(countries, seconds), date = new Date(EPOCH + seconds * 1000), day = seconds % 86400;
    const filtered = countries.filter(c => (region === 'All regions' || c.region === region) && c.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => population(b, seconds) - population(a, seconds));
    const projection = useMemo(() => geoOrthographic().scale(245).translate([550, 275]).rotate([-centerLon, -centerLat]).clipAngle(90), [centerLon, centerLat]), path = useMemo(() => geoPath(projection), [projection]);
    const reset = () => { setSeconds((Date.now() - EPOCH) / 1000); setSpeed(1); setPaused(false) };
    if (error) return <div className="loading">{error}<button
        onClick={() => location.reload()}>Retry</button>
    </div>
        ;
    if (!world) return <div className="loading"><Globe2 size={40} /> Mapping our world…
    </div>
        ;
    return <div className={`app ${broadcast ? 'broadcast' : ''}`}>
        <header><a className="brand" href="/" aria-label="Global Population home"><span className="brand-icon"><Globe2 size={26} /></span><span>GLOBAL<span className="brand-light">POPULATION</span><small>A WORLD IN MOTION</small></span></a><nav><button className={tab === 'map' ? 'active' : ''}
            onClick={() => setTab('map')}>Overview</button><button className={tab === 'countries' ? 'active' : ''}
                onClick={() => setTab('countries')}>Countries</button><button
                    onClick={() => setInfo(true)}>About the data <ArrowUpRight size={13} /></button></nav>
            <div className="header-right"><span className="live-pill"><i />{paused ? 'PAUSED' : 'LIVE SIMULATION'}</span><button className="icon-button" title={broadcast ? 'Exit broadcast view' : 'Broadcast view'}
                onClick={() => setBroadcast(!broadcast)}>{broadcast ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
            </div>
        </header>
        <main>
            <section className="intro"><div>
                <div className="eyebrow">ONE PLANET. BILLIONS OF STORIES.
                </div>
                <h1>Watch our world grow<span>.</span></h1><p>A living view of humanity, one moment at a time.</p>
            </div>

                <div className="date"><span className="status-dot" /> {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}<small>{date.toLocaleTimeString('en-GB', { timeZone: 'UTC' })} UTC · {speed === 1 ? 'Real-time pace' : 'Future projection'}</small>
                </div>
            </section>

            <section className="stats">
                <div className="world-stat">
                    <div className="stat-label"><Globe2 size={16} /> WORLD POPULATION <span>ESTIMATE</span>
                    </div>

                    <div className="big-number"><Counter value={total.population} />
                    </div>

                    <div className="stat-foot"><span className="green"><ArrowUpRight size={14} /> {((total.births - total.deaths)).toFixed(2)} people / second</span><span>and counting</span>
                    </div>

                </div>
                <Stat label="BIRTHS TODAY" value={total.births * day} kind="birth" rate={total.births} /><Stat label="DEATHS TODAY" value={total.deaths * day} kind="death" rate={total.deaths} /><Stat label="NET GROWTH TODAY" value={(total.births - total.deaths) * day} kind="growth" rate={total.births - total.deaths} /></section>

            <div className="workspace">
                <section className="map-panel">
                    <div className="panel-heading"><div><Globe2 size={17} /><h2>{tab === 'map' ? 'The world, right now' : 'Explore every country'}</h2>
                        <span className="tiny-tag">{countries.length} COUNTRIES & TERRITORIES</span>
                    </div>
                        <span className="muted hide-small">Click a country to explore <ChevronRight size={13} /></span>
                    </div>


                    <div className="map-toolbar">
                        <div className="tabs"><button className={tab === 'map' ? 'chosen' : ''}
                            onClick={() => setTab('map')}><Globe2 size={14} /> World map</button><button className={tab === 'countries' ? 'chosen' : ''}
                                onClick={() => setTab('countries')}><Users size={14} /> Country list</button>
                        </div>
                        <button className="tour-button" aria-pressed={tourPlaying} onClick={() => setTourPlaying(p => !p)}>{tourPlaying ? <Pause size={14} /> : <Play size={14} />}{tourPlaying ? 'Pause globe tour' : 'Play globe tour'}</button><select aria-label="Filter region" value={region} onChange={e => setRegion(e.target.value)}>{['All regions', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Polar'].map(r => <option key={r}>{r}</option>)}</select>
                    </div>

                    {tab === 'map' ?
                        <div className="map-viewport">
                            <div className="map-inner" style={{ transform: `scale(${zoom})` }}><svg viewBox="0 0 1100 550" preserveAspectRatio="xMidYMid meet" aria-label="Interactive world population map"><defs><radialGradient id="ocean"><stop stopColor="#17232b" /><stop offset="1" stopColor="#0d141e" /></radialGradient></defs><rect width="1100" height="550" fill="url(#ocean)" /><path d={path({ type: 'Sphere' })} fill="#152831" stroke="#4a776e" /><path d={path(geoGraticule10())} fill="none" stroke="#24313b" strokeWidth=".55" />{world.features.filter(f => f.id !== '010').map(f => {
                                const c = countries.find(c => c.id === f.id); return <path key={f.id || f.properties.name} d={path(f)} className={`country-shape ${c?.code === spotlightCountry?.code ? 'spotlight' : ''} ${c && region !== 'All regions' && c.region !== region ? 'dim' : ''}`}
                                    onMouseEnter={() => setHoveredCountry(c || null)} onMouseLeave={() => setHoveredCountry(null)} onClick={() => c && setSelected(c)}><title>{c?.name || f.properties.name}</title></path>
                            })}</svg>{countries.filter(c => (region === 'All regions' || c.region === region) && geoDistance([c.lon, c.lat], [centerLon, centerLat]) < Math.PI / 2).map(c => {
                                const [x, y] = projection([c.lon, c.lat]); return <button key={c.code} className={`map-marker ${c.code === spotlightCountry?.code ? 'minor spotlight' : 'minor'}`} style={{ left: `${x / 11}%`, top: `${y / 5.5}%` }}
                                    onMouseEnter={() => setHoveredCountry(c)} onMouseLeave={() => setHoveredCountry(null)} onFocus={() => setHoveredCountry(c)} onBlur={() => setHoveredCountry(null)} onClick={() => setSelected(c)} title={`Explore ${c.name}`}><span className="marker-card"><span><Flag code={c.code} />{c.name}</span><strong><Counter value={population(c, seconds)} /></strong></span><span className="map-dot" /></button>
                            })}
                            </div>

                            <div className="ocean-label atlantic">
                            </div>

                            <div className="ocean-label pacific">
                            </div>

                            <div className="zoom-controls"><button aria-label="Zoom in"
                                onClick={() => setZoom(z => Math.min(1.5, z + .1))}><Plus size={16} /></button><button aria-label="Zoom out"
                                    onClick={() => setZoom(z => Math.max(1, z - .1))}><Minus size={16} /></button>
                            </div>

                            <div className="map-legend"><span className="status-dot" /> Live population estimates <span className="legend-divider" /> Sample data
                            </div>

                        </div>
                        :
                        <div className="country-table"><label className="search"><Search size={16} /><input placeholder="Search countries…" value={query} onChange={e => setQuery(e.target.value)} /></label>{filtered.map((c, i) => <button className={`country-row ${c.code === activeCountry?.code ? 'spotlight' : ''}`} key={c.code}
                            onClick={() => setSelected(c)}><span className="rank">{i + 1}</span><Flag code={c.code} /><span className="country-name">{c.name}<small>{c.region}</small></span><Counter value={population(c, seconds)} /><ChevronRight size={15} /></button>)}{!filtered.length && <p className="empty">No countries match your search.</p>}
                        </div>
                    }

                    {tab === 'map' && spotlightCountry && <button className="population-spotlight" onClick={() => setSelected(spotlightCountry)} aria-label={`Population details for ${spotlightCountry.name}`}>
                        <span className="spotlight-identity" key={spotlightCountry.code}><Flag code={spotlightCountry.code} /><span><small>COUNTRY SPOTLIGHT</small><strong>{spotlightCountry.name}</strong></span></span>
                        <span className="spotlight-population"><small>Estimated population</small><strong><Counter value={population(spotlightCountry, seconds)} /></strong></span>
                        <ChevronRight size={16} />
                    </button>}

                    <div className="map-footer"><span><span className="status-dot" /> {paused ? 'Simulation paused' : 'Counters updating'} · {speed.toLocaleString()}× speed</span><button
                        onClick={() => setInfo(true)}><Info size={13} /> How estimates work</button>
                    </div>
                </section>
                <aside>
                    <section className="control-panel"><h2><SlidersHorizontal size={16} /> Simulation studio</h2>
                        <p>Explore the pace of population.</p>
                        <div className="control-label">PLAYBACK <span>{paused ? 'Paused' : 'Running'} <i className={paused ? 'paused-dot' : 'status-dot'} /></span>
                        </div>
                        <button className="pause-button"
                            onClick={() => setPaused(!paused)}>{paused ? <Play size={16} /> : <Pause size={16} />} {paused ? 'Resume simulation' : 'Pause simulation'}</button>
                        <div className="control-label speed-label">TIME SPEED <span>{speed.toLocaleString()}×</span>
                        </div>
                        <div className="speed-options">{[1, 60, 3600, 86400].map(s => <button className={speed === s ? 'chosen' : ''} key={s}
                            onClick={() => setSpeed(s)}>{s === 1 ? '1×' : s === 60 ? '1m/s' : s === 3600 ? '1h/s' : '1d/s'}</button>)}
                        </div>
                        <div className="speed-hint"><span>Real time</span><span>Fast forward <FastForward size={11} /></span>
                        </div>
                        <div className="projection-control"><label htmlFor="future">JUMP INTO THE FUTURE</label><select id="future" value="" onChange={e => { setSeconds((Date.UTC(Number(e.target.value), 0, 1) - EPOCH) / 1000); setPaused(true) }}><option value="" disabled>Select a year</option>{[2027, 2030, 2035, 2040, 2050].map(y => <option key={y}>{y}</option>)}</select>
                        </div>
                        <button className="reset"
                            onClick={reset}><RotateCcw size={13} /> Return to now</button></section>
                    <section className="insight">
                        <div className="eyebrow"><Activity size={14} /> THE HUMAN PICTURE
                        </div>
                        <h3>Every second,<br />a new story begins.</h3><p>About <strong>{total.births.toFixed(1)} people</strong> are born each second in this simulation. A reminder of a world that never stands still.</p>
                        <div className="mini-wave">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ height: 8 + Math.sin(i * .7) ** 2 * 28 }} />)}
                        </div>
                        <span>SMALL MOMENTS. GLOBAL CHANGE.</span></section></aside>
            </div>


            <section className="ranking">
                <div className="section-title"><h2>Around the world. One country at a time.</h2>
                    <button
                        onClick={() => setTab('countries')}>Explore all countries <ArrowUpRight size={15} /></button>
                </div>

                <div className="country-cards">{Array.from({ length: Math.min(5, tourCountries.length) }, (_, i) => tourCountries[(tourIndex + i) % tourCountries.length]).map((c, i) => <button key={c.code} className={`country-card ${c.code === activeCountry?.code ? 'spotlight' : ''}`}
                    onClick={() => setSelected(c)}><div><Flag code={c.code} /><span>{String(tourIndex + i + 1 > tourCountries.length ? tourIndex + i + 1 - tourCountries.length : tourIndex + i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3>{c.name}</h3><strong><Counter value={population(c, seconds)} /></strong><small className={c.birth >= c.death ? 'green' : 'coral'}>{c.birth >= c.death ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {Math.abs((c.birth - c.death) / 10).toFixed(2)}% annual natural change</small>
                    <div className="card-bar"><i style={{ width: `${population(c, seconds) / total.population * 400}%` }} />
                    </div>
                </button>)}
                </div>
            </section>
            <footer><span><Globe2 size={14} /> Global Population Live Dashboard</span><span>Illustrative estimates · Births & deaths model · No migration</span><button
                onClick={() => setInfo(true)}>Data & methodology <ArrowUpRight size={12} /></button></footer></main>
        {selected && <CountryModal country={selected} seconds={seconds} onClose={() => setSelected(null)} />}{info && <Modal close={() => setInfo(false)}>
            <div className="eyebrow">TRANSPARENT BY DESIGN
            </div>
            <h2>Estimates, not a census.</h2>
            <p>This demo includes {countries.length} countries and territories from the bundled REST Countries snapshot. Population baselines are multiplied by 1.06 to create an illustrative January 2026 scenario; they are not official 2026 estimates.</p><p>Sample birth and death rates per 1,000 people vary by region, with a few country overrides. Population follows P(t) = P₀ × exp((birth rate − death rate) × years / 1,000). Migration is excluded.</p><p>The world counter sums every country counter. “Today” totals approximate the current modeled event rate multiplied by elapsed UTC time since midnight. Charts show a modeled historical curve and constant-rate scenarios, not observed history or official forecasts.</p><p>For a public broadcast, replace sample baselines and rates with licensed, dated demographic data and retain the estimate label. Broadcast view hides navigation and controls; press Escape to exit.</p><a href="https://github.com/apilayer/restcountries" target="_blank" rel="noreferrer">Country metadata: REST Countries ↗</a><br /><a href="https://github.com/topojson/world-atlas" target="_blank" rel="noreferrer">Map: World Atlas / Natural Earth ↗</a></Modal>}

    </div>

}
function Stat({ label, value, kind, rate }) {
    return <div className={`small-stat ${kind}`}>
        <div className="stat-label">{label}<span className="stat-icon">{kind === 'death' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}</span>
        </div>
        <strong><Counter value={value} /></strong>
        <div className="stat-foot"><span className={kind === 'death' ? 'coral' : 'green'}>{rate.toFixed(2)} / second</span><span>estimated</span>
        </div>

    </div>

}
function Modal({ children, close }) {
    const ref = useRef(); useEffect(() => { const previous = document.activeElement; ref.current?.focus(); const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = old; previous?.focus() } }, []); return <div className="modal-backdrop"
        onClick={close}>
        <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Population details" className="modal"
            onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const nodes = ref.current.querySelectorAll('button,a,select,input'); const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() } } }}><button className="modal-close icon-button" aria-label="Close details"
                onClick={close}><X size={20} /></button>{children}</section>
    </div>

}
function CountryModal({ country: c, seconds, onClose }) {
    const p = population(c, seconds); const years = [2000, 2010, 2020, 2026, 2030, 2040, 2050]; return <Modal close={onClose}>
        <div className="eyebrow">COUNTRY SPOTLIGHT · {c.region}
        </div>
        <h2><Flag code={c.code} /> {c.name}</h2>

        <div className="modal-pop"><Counter value={p} />
        </div>
        <p>Estimated population · {new Date(EPOCH + seconds * 1000).getUTCFullYear()}</p>
        <div className="detail-stats"><div><small>Births / 1,000 / year</small><strong className="green">{c.birth}</strong>
        </div>
            <div>
                <small>Deaths / 1,000 / year</small><strong className="coral">{c.death}</strong>
            </div>
            <div><small>Natural annual change</small><strong>{((c.birth - c.death) / 10).toFixed(2)}%</strong>
            </div>

        </div>
        <h3>Population through time</h3><p className="chart-note">Modeled history & future scenario · Sample rates held constant</p>
        <div className="chart">
            <Line data={{ labels: years, datasets: [{ label: 'Modeled population', data: years.map(y => population(c, (y - 2026) * YEAR)), borderColor: '#57dcb1', backgroundColor: '#57dcb112', fill: true, tension: .35, pointRadius: 4, segment: { borderDash: ctx => ctx.p0DataIndex >= 3 ? [5, 5] : undefined } }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#ffffff08' }, ticks: { color: '#8995a8' } }, y: { grid: { color: '#ffffff08' }, ticks: { color: '#8995a8', callback: compact } } } }} />
        </div>

        <div className="projection-note"><Activity size={18} /><span>2050 scenario <strong>{fmt(population(c, 24 * YEAR))}</strong></span><span className="tiny-tag">ILLUSTRATIVE</span>
        </div>
    </Modal>
}
createRoot(document.getElementById('root')).render(<App />);

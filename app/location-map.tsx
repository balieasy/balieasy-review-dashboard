'use client';

import {useState} from 'react';
import {ChevronRight, ExternalLink, MapPin, Search} from 'lucide-react';
import type {Location} from './metrics';
import {locationMapLinks} from './location-map-links';
import styles from './location-map.module.css';

export default function LocationMap({locations}: {locations: Location[]}) {
  const [activeId, setActiveId] = useState('');
  const [keyword, setKeyword] = useState('');
  const active = locations.length === 1 ? locations[0] : locations.find(location => location.id === activeId);
  const query = keyword.trim().toLocaleLowerCase('id-ID');
  const matches = locations.filter(location =>
    `${location.title} ${location.address}`.toLocaleLowerCase('id-ID').includes(query)
  );
  const links = locationMapLinks(active);

  if (!locations.length) return null;

  return (
    <section className={`panel ${styles.panel}`} aria-labelledby="overview-map-title">
      <div className={`panel-head ${styles.header}`}>
        <div>
          <h2 id="overview-map-title">Peta lokasi <span className="count-pill">{locations.length}</span></h2>
          <p>Pilih cabang untuk melihat titiknya di Google Maps.</p>
        </div>
        <a className={styles.external} href={links.external} target="_blank" rel="noopener noreferrer">
          Buka Google Maps <ExternalLink size={13} aria-hidden="true"/>
        </a>
      </div>
      <div className={styles.layout}>
        <div className={styles.map}>
          <iframe
            key={links.embed}
            title={active ? `Google Maps · ${active.title}` : 'Google Maps · Lokasi BaliEasy di Bali'}
            src={links.embed}
            loading="lazy"
            referrerPolicy="no-referrer"
            allowFullScreen
          />
        </div>
        <div className={styles.directory}>
          {locations.length > 1 && <>
            <label className={styles.search}>
              <Search size={15} aria-hidden="true"/>
              <input type="search" aria-label="Cari cabang di peta" placeholder="Cari nama atau alamat cabang"
                value={keyword} onChange={event => setKeyword(event.target.value)}/>
            </label>
            <button className={styles.all} type="button" aria-pressed={!active} onClick={() => setActiveId('')}>
              Peta BaliEasy di Bali
            </button>
          </>}
          <ul className={styles.list} aria-label="Daftar lokasi BaliEasy">
            {matches.map(location => (
              <li key={location.id}>
                <button type="button" className={styles.location} aria-pressed={active?.id === location.id}
                  onClick={() => setActiveId(location.id)}>
                  <span className={styles.marker}><MapPin size={16} aria-hidden="true"/></span>
                  <span className={styles.description}>
                    <strong>{location.title}</strong>
                    {location.address && <span>{location.address}</span>}
                  </span>
                  <ChevronRight className={styles.arrow} size={14} aria-hidden="true"/>
                </button>
              </li>
            ))}
          </ul>
          {matches.length === 0 && <p className={styles.empty} role="status">Lokasi tidak ditemukan.</p>}
        </div>
      </div>
    </section>
  );
}

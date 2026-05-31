const SECTIONS = [
    { key: 'bothMatch', label: 'BPM + Tonalità', sub: 'Compatibili per entrambi i parametri' },
    { key: 'bpmOnly',   label: 'Solo BPM',       sub: 'Stesso ritmo, tonalità diversa' },
    { key: 'keyOnly',   label: 'Solo Tonalità',   sub: 'Stessa chiave, BPM diverso' },
];

function TrackTable({ tracks }) {
    if (!tracks?.length) return (
        <div className="rec-empty">Nessun risultato in questa categoria.</div>
    );

    return (
        <div className="rec-table-wrap">
            <div className="rec-scroll-hint" aria-hidden="true">
                <span className="rec-scroll-hint__icon">↔</span>
                <span>Scorri la tabella per vedere tutti i valori</span>
            </div>
            <div className="table-responsive">
                <table className="table neo-table align-middle mb-0">
                    <thead>
                        <tr>
                            <th className="rec-th rec-th--num">#</th>
                            <th className="rec-th">Titolo</th>
                            <th className="rec-th rec-th--artist">Artista</th>
                            <th className="rec-th text-center rec-th--chip">BPM</th>
                            <th className="rec-th text-center rec-th--chip">Tonalità</th>
                            <th className="rec-th text-end"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {tracks.map((track, index) => (
                            <tr key={track.id} className="rec-row">
                                <td className="rec-td rec-td--num">{index + 1}</td>
                                <td className="rec-td rec-td--title">{track.title}</td>
                                <td className="rec-td rec-td--artist">{track.artist?.name}</td>
                                <td className="rec-td text-center">
                                    <span className="rec-chip">{track.bpm}</span>
                                </td>
                                <td className="rec-td text-center">
                                    <span className="rec-chip rec-chip--key">{track.bpm_key}</span>
                                </td>
                                <td className="rec-td text-end">
                                    <a
                                        href={track.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rec-link"
                                        aria-label={`Apri ${track.title} su Deezer`}
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="13" height="13"><path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42L17.59 5H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z" fill="currentColor"/></svg>
                                        Apri
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RecommendationsTable({ recommendations }) {
    const { bothMatch = [], bpmOnly = [], keyOnly = [] } = recommendations || {};
    const counts = { bothMatch: bothMatch.length, bpmOnly: bpmOnly.length, keyOnly: keyOnly.length };
    const total = counts.bothMatch + counts.bpmOnly + counts.keyOnly;
    const data = { bothMatch, bpmOnly, keyOnly };

    if (total === 0) return null;

    return (
        <section className="mt-4 mt-md-5" aria-label="Tracce consigliate">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
                <h3 className="h4 mb-0">Tracce consigliate</h3>
                <span className="table-count">{total} risultati</span>
            </div>

            {SECTIONS.map(({ key, label, sub }, i) => (
                <div key={key} className={i < SECTIONS.length - 1 ? 'mb-5' : 'mb-2'}>
                    <div className="rec-section-header">
                        <div>
                            <span className="rec-section-title">{label}</span>
                            <span className="rec-section-sub">{sub}</span>
                        </div>
                        <span className="rec-section-count">{counts[key]}</span>
                    </div>
                    <TrackTable tracks={data[key]} />
                </div>
            ))}
        </section>
    );
}

export default RecommendationsTable;

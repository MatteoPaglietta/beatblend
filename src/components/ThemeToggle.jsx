function ThemeToggle({ theme, onSelectTheme }) {
    const isDark = theme === 'dark';

    return (
        <div className={`theme-toggle duo-switch ${isDark ? 'is-dark' : 'is-light'}`} role="group" aria-label="Selettore tema">
            <span className="duo-switch-shell" aria-hidden="true">
                <span className="duo-switch-track">
                    <button
                        type="button"
                        className="duo-switch-end duo-switch-end--light"
                        onClick={() => onSelectTheme('light')}
                        aria-pressed={theme === 'light'}
                        aria-label="Imposta modalità chiara"
                        title="Modalità chiara"
                    >
                        <span className="duo-switch-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" className="duo-switch-svg" focusable="false" aria-hidden="true">
                                <circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
                                <path
                                    d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M18 6l-1.6 1.6M7.6 16.4L6 18"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </span>
                    </button>
                    <button
                        type="button"
                        className="duo-switch-end duo-switch-end--dark"
                        onClick={() => onSelectTheme('dark')}
                        aria-pressed={theme === 'dark'}
                        aria-label="Imposta modalità scura"
                        title="Modalità scura"
                    >
                        <span className="duo-switch-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" className="duo-switch-svg" focusable="false" aria-hidden="true">
                                <path
                                    d="M14.8 3.6a8.6 8.6 0 1 0 5.6 14.8 9 9 0 1 1-5.6-14.8Z"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </span>
                    </button>
                </span>
            </span>
        </div>
    );
}

export default ThemeToggle;

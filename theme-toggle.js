(() => {
    const root = document.documentElement;
    const toggle = document.getElementById('theme-toggle');
    const image = document.getElementById('theme-toggle-image');
    const text = document.getElementById('theme-toggle-text');

    if (!toggle || !image || !text) return;

    const paths = {
        day: 'assets/images/theme-toggle/day.png',
        night: 'assets/images/theme-toggle/night.png',
        toNight: 'assets/images/theme-toggle/day-to-night.webp',
        toDay: 'assets/images/theme-toggle/night-to-day.webp'
    };

    const animationLength = {
        dark: 1260,
        light: 990
    };

    const themeFadeLength = 520;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    Object.values(paths).forEach((src) => {
        const preload = new Image();
        preload.src = src;
    });

    const storedTheme = localStorage.getItem('portfolio-theme');
    let theme = storedTheme || 'dark';
    let animationTimer;
    let themeTimer;
    let isAnimating = false;

    function setAccessibleState(nextTheme) {
        const isDark = nextTheme === 'dark';
        toggle.setAttribute('aria-pressed', String(isDark));
        const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
        toggle.setAttribute('aria-label', label);
        text.textContent = label;
    }

    function applyTheme(nextTheme, animate = false) {
        const commitTheme = () => {
            root.dataset.theme = nextTheme;
            root.style.colorScheme = nextTheme;
            setAccessibleState(nextTheme);
        };

        window.clearTimeout(themeTimer);

        if (!animate || reduceMotion.matches) {
            root.classList.remove('theme-transitioning');
            commitTheme();
            return;
        }

        root.classList.add('theme-transitioning');

        if (typeof document.startViewTransition === 'function') {
            const transition = document.startViewTransition(commitTheme);
            transition.finished.finally(() => {
                root.classList.remove('theme-transitioning');
            });
            return;
        }

        // Fallback for browsers without the View Transitions API.
        requestAnimationFrame(commitTheme);
        themeTimer = window.setTimeout(() => {
            root.classList.remove('theme-transitioning');
        }, themeFadeLength + 80);
    }

    function updateControl(nextTheme, animate = false) {
        const isDark = nextTheme === 'dark';
        applyTheme(nextTheme, animate);
        window.clearTimeout(animationTimer);

        if (!animate || reduceMotion.matches) {
            image.src = isDark ? paths.night : paths.day;
            isAnimating = false;
            toggle.disabled = false;
            return;
        }

        isAnimating = true;
        toggle.disabled = true;
        image.src = isDark ? paths.toNight : paths.toDay;

        animationTimer = window.setTimeout(() => {
            image.src = isDark ? paths.night : paths.day;
            isAnimating = false;
            toggle.disabled = false;
        }, animationLength[nextTheme]);
    }

    updateControl(theme);

    toggle.addEventListener('click', () => {
        if (isAnimating) return;
        theme = theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('portfolio-theme', theme);
        updateControl(theme, true);
    });
})();

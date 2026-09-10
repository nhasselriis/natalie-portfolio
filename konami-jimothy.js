
'use strict';

(() => {
    const KONAMI_CODE = [
        'ArrowUp', 'ArrowUp',
        'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight',
        'ArrowLeft', 'ArrowRight',
        'b', 'a'
    ];

    let position = 0;
    let activeRunner = null;

    window.addEventListener('keydown', (event) => {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

        if (key === KONAMI_CODE[position]) {
            position += 1;

            if (position === KONAMI_CODE.length) {
                position = 0;
                launchJimothy();
            }
            return;
        }

        // If the wrong key is also the first key in the sequence, start over at 1.
        position = key === KONAMI_CODE[0] ? 1 : 0;
    });

    function launchJimothy() {
        if (activeRunner) {
            activeRunner.remove();
            activeRunner = null;
        }

        const runner = document.createElement('div');
        runner.className = 'jimothy-runner';
        runner.setAttribute('aria-hidden', 'true');

        const image = document.createElement('img');
        image.src = 'assets/images/jimothy.png';
        image.alt = '';
        image.draggable = false;

        // Jimothy's image is part of the project now, so no visible placeholder is needed.
        // If the file is ever missing, fail quietly instead of showing setup text to visitors.
        image.addEventListener('error', () => {
            runner.remove();
            if (activeRunner === runner) activeRunner = null;
        }, { once: true });

        runner.append(image);
        document.body.appendChild(runner);
        activeRunner = runner;

        runner.addEventListener('animationend', () => {
            runner.remove();
            if (activeRunner === runner) activeRunner = null;
        }, { once: true });
    }
})();


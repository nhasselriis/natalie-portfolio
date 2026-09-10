'use strict';

(() => {
    const trigger = document.getElementById('lotus-compliment-trigger');
    const scroll = document.getElementById('compliment-scroll');
    const closeButton = document.getElementById('compliment-scroll-close');
    const form = document.getElementById('compliment-form');
    const nameInput = document.getElementById('compliment-name');
    const result = document.getElementById('compliment-result');
    const anotherButton = document.getElementById('another-compliment');

    if (!trigger || !scroll || !closeButton || !form || !nameInput || !result || !anotherButton) return;

    const compliments = [
        'You make ordinary moments feel a little more special',
        'Your creativity deserves room to grow',
        'You bring something to the world that nobody else can copy',
        'You have a way of making people feel welcome',
        'Your curiosity is one of your best qualities',
        'You are more capable than you give yourself credit for',
        'Your ideas are worth following',
        'You make the spaces around you more interesting',
        'Your kindness leaves a longer impression than you realize',
        'You have excellent taste',
        'You are allowed to be proud of how far you have come',
        'Someone is happier because you are in their life',
        'Your perspective is worth hearing',
        'You have a beautiful smile',
        'You make being yourself look good',
        'Your imagination is a gift',
        'The things you care about are better because you care about them',
        'You have survived every difficult day that brought you here',
        'You deserve the same patience you give to other people',
        'There is something wonderfully unmistakable about you'
    ];

    let lastComplimentIndex = -1;

    function openScroll() {
        scroll.classList.add('is-open');
        scroll.setAttribute('aria-hidden', 'false');
        trigger.setAttribute('aria-expanded', 'true');
        window.setTimeout(() => nameInput.focus(), 60);
    }

    function closeScroll() {
        scroll.classList.remove('is-open');
        scroll.setAttribute('aria-hidden', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
    }

    function chooseCompliment() {
        let index = Math.floor(Math.random() * compliments.length);
        if (compliments.length > 1 && index === lastComplimentIndex) {
            index = (index + 1 + Math.floor(Math.random() * (compliments.length - 1))) % compliments.length;
        }
        lastComplimentIndex = index;
        return compliments[index];
    }

    function giveCompliment() {
        const name = nameInput.value.trim();
        if (!name) {
            nameInput.focus();
            nameInput.reportValidity();
            return;
        }

        result.textContent = `${chooseCompliment()}, ${name}.`;
        anotherButton.hidden = false;
    }

    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'compliment-scroll');

    trigger.addEventListener('click', () => {
        if (scroll.classList.contains('is-open')) closeScroll();
        else openScroll();
    });

    closeButton.addEventListener('click', closeScroll);

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        giveCompliment();
    });

    anotherButton.addEventListener('click', giveCompliment);

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && scroll.classList.contains('is-open')) {
            closeScroll();
        }
    });
})();

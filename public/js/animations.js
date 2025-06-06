// Initialize GSAP
gsap.registerPlugin(ScrollTrigger);

// Hero section animations
gsap.from('.hero-content', {
    duration: 1,
    y: 100,
    opacity: 0,
    ease: 'power3.out',
});

gsap.from('.hero-image', {
    duration: 1.2,
    scale: 0.8,
    opacity: 0,
    ease: 'power3.out',
    delay: 0.3,
});

// Features section animations with enhanced ScrollTrigger
gsap.to('.feature-card', {
    scrollTrigger: {
        trigger: '#features',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
        markers: false,
    },
    duration: 0.8,
    scale: 1,
    y: 0,
    opacity: 1,
    rotationX: 0,
    transformOrigin: 'center center',
    stagger: {
        amount: 0.5,
        from: 'random',
    },
    ease: 'back.out(1.7)',
});

// Pricing section animations
gsap.from('.pricing-card', {
    scrollTrigger: {
        trigger: '#pricing',
        start: 'top center+=100',
    },
    duration: 1,
    y: 50,
    opacity: 0,
    stagger: 0.2,
    ease: 'power2.out',
});

// Contact form animation
gsap.from('#contact form', {
    scrollTrigger: {
        trigger: '#contact',
        start: 'top center+=100',
    },
    duration: 1,
    y: 50,
    opacity: 0,
    ease: 'power2.out',
});

// Navigation menu animation
const navLinks = document.querySelectorAll('nav a');
navLinks.forEach((link, i) => {
    gsap.from(link, {
        duration: 0.5,
        y: -20,
        opacity: 0,
        delay: i * 0.1,
        ease: 'power2.out',
    });
});

// Footer animation
gsap.from('footer', {
    scrollTrigger: {
        trigger: 'footer',
        start: 'top bottom-=100',
    },
    duration: 1,
    y: 50,
    opacity: 0,
    ease: 'power2.out',
});

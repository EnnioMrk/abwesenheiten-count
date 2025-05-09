// Main JavaScript for Untis-Tools index page

document.addEventListener('DOMContentLoaded', function () {
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');

            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80, // Offset for fixed header
                        behavior: 'smooth',
                    });

                    // Close mobile menu if open
                    if (
                        mobileMenu &&
                        !mobileMenu.classList.contains('hidden')
                    ) {
                        mobileMenu.classList.add('hidden');
                    }
                }
            }
        });
    });

    // Highlight active nav item on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');

    function highlightNavOnScroll() {
        const scrollPosition = window.scrollY + 100;

        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (
                scrollPosition >= sectionTop &&
                scrollPosition < sectionTop + sectionHeight
            ) {
                navLinks.forEach((link) => {
                    link.classList.remove('border-blue-500', 'text-gray-900');
                    link.classList.add('border-transparent', 'text-gray-500');

                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.remove(
                            'border-transparent',
                            'text-gray-500'
                        );
                        link.classList.add('border-blue-500', 'text-gray-900');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNavOnScroll);

    // Form submission handling for contact form
    const contactForm = document.querySelector('#contact form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(this);
            const formEntries = Object.fromEntries(formData.entries());

            // Show submission feedback (simple alert for now)
            alert('Thank you for your message. We will get back to you soon!');

            // Reset form
            this.reset();
        });
    }

    // Initialize any animations or effects
    function animateOnScroll() {
        const animatedElements = document.querySelectorAll('.bg-gray-50');
        animatedElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.top <= window.innerHeight * 0.8;

            if (isVisible) {
                el.classList.add('animate-on-scroll');
            }
        });
    }

    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Initial check on page load
});

// Add a simple preloader
window.addEventListener('load', function () {
    // If you want to add a preloader, you can uncomment and customize this code
    // const preloader = document.getElementById('preloader');
    // if (preloader) {
    //     setTimeout(() => {
    //         preloader.classList.add('fade-out');
    //         setTimeout(() => {
    //             preloader.style.display = 'none';
    //         }, 500);
    //     }, 500);
    // }
});

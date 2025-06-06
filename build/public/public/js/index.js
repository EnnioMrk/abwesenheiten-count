// Built with Bun at 2025-06-05T10:39:13.543Z
// public/js/index.js
document.addEventListener("DOMContentLoaded", function() {
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });
  }
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function(e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      if (targetId !== "#") {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: "smooth"
          });
          if (mobileMenu && !mobileMenu.classList.contains("hidden")) {
            mobileMenu.classList.add("hidden");
          }
        }
      }
    });
  });
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  function highlightNavOnScroll() {
    const scrollPosition = window.scrollY + 100;
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute("id");
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        navLinks.forEach((link) => {
          link.classList.remove("border-blue-500", "text-gray-900");
          link.classList.add("border-transparent", "text-gray-500");
          if (link.getAttribute("href") === `#${sectionId}`) {
            link.classList.remove("border-transparent", "text-gray-500");
            link.classList.add("border-blue-500", "text-gray-900");
          }
        });
      }
    });
  }
  window.addEventListener("scroll", highlightNavOnScroll);
  const contactForm = document.querySelector("#contact form");
  if (contactForm) {
    contactForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const formEntries = Object.fromEntries(formData.entries());
      alert("Thank you for your message. We will get back to you soon!");
      this.reset();
    });
  }
  function animateOnScroll() {
    const animatedElements = document.querySelectorAll(".bg-gray-50");
    animatedElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const isVisible = rect.top <= window.innerHeight * 0.8;
      if (isVisible) {
        el.classList.add("animate-on-scroll");
      }
    });
  }
  window.addEventListener("scroll", animateOnScroll);
  animateOnScroll();
});
window.addEventListener("load", function() {
});

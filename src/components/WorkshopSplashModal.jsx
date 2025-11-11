import { useState, useEffect } from "react";
import "./WorkshopSplashModal.css";

const WorkshopSplashModal = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // Slide 1: The Hook
    {
      title: "What if AI Could Bridge the Gap to Our Tools?",
      content: (
        <>
          <p className="slide-subtitle">
            We have incredible drafting tools, checking systems, and resources. But many users
            still struggle to access their full potential.
          </p>
          <p className="slide-emphasis">What if natural conversation could be the bridge?</p>
          <p className="slide-cta">
            Exploring how AI guides can complement the tools we've built together.
          </p>
        </>
      ),
    },
    // Slide 2: The Vision
    {
      title: "Complementing Tools with Conversational Guidance",
      content: (
        <>
          <p className="slide-subtitle">
            Our existing tools are powerful. But onboarding new users remains a shared challenge.
          </p>
          <p className="slide-emphasis">
            AI guides help users navigate and leverage our tools more effectively.
          </p>
          <p className="slide-description">
            Think of it as a friendly expert who knows when to use your tools, when to check
            resources, and how to explain complex concepts simply.
          </p>
          <p className="slide-note">
            <em>Demo: Ruth 1:1 - Showing the conversational approach in action.</em>
          </p>
        </>
      ),
    },
    // Slide 3: Why This Matters
    {
      title: "Meeting Users Where They Are",
      content: (
        <>
          <p className="slide-subtitle">
            Many potential translators can't access desktop tools or find interfaces overwhelming.
            How do we reach them?
          </p>
          <ul className="slide-list">
            <li>Conversational interfaces in familiar apps (WhatsApp, SMS)</li>
            <li>Guiding users to the right tool at the right time</li>
            <li>Building confidence before introducing complexity</li>
          </ul>
          <div className="slide-timeline">
            <div>
              <strong>Today:</strong> Testing conversational guidance
            </div>
            <div>
              <strong>Tomorrow:</strong> Integrating with our existing tools via APIs
            </div>
            <div>
              <strong>The Vision:</strong> Every tool accessible to every translator
            </div>
          </div>
        </>
      ),
    },
    // Slide 4: What You'll See Today
    {
      title: "Today's Focus: The Guiding Conversation",
      content: (
        <>
          <ul className="slide-features">
            <li>✓ How natural dialogue can onboard new translators</li>
            <li>✓ Learning user context to personalize guidance</li>
            <li>✓ Making complex concepts accessible through conversation</li>
            <li>✓ Preparing users for professional tools</li>
          </ul>
          <div className="slide-callout">
            <strong>What we're NOT showing today:</strong> Advanced features like automated
            drafting, direct tool integration (MCP servers), or batch processing. These will
            connect with our existing infrastructure—not replace it.
          </div>
        </>
      ),
    },
    // Slide 5: The Partnership Model
    {
      title: "Better Together: Integration Opportunities",
      content: (
        <>
          <p className="slide-subtitle">How conversational AI enhances what we will see today:</p>
          <ul className="slide-list">
            <li>Pre-training users before they enter complex tools</li>
            <li>Explaining checking results in plain language</li>
            <li>Routing to the right resource at the right time</li>
            <li>Collecting field feedback for our tools</li>
          </ul>
          <div className="slide-emphasis-box">
            <p>
              <strong>Our tools provide the capability.</strong>
            </p>
            <p>
              <strong>Conversational AI provides the accessibility.</strong>
            </p>
          </div>
        </>
      ),
    },
    // Slide 6: Let's Begin
    {
      title: "Let's Explore This Together",
      content: (
        <>
          <p className="slide-subtitle">
            Try the demo and imagine how this could complement our existing tools and workflows.
          </p>
          <p className="slide-description">
            Your feedback is crucial: What would make this useful for the communities we serve? How
            could it integrate with the systems we use? What integrations could you envision to
            adapt this for your process?
          </p>
          <div className="slide-final-note">
            <p>
              <em>
                This proof of concept shows one piece of the puzzle—the conversational guide.
              </em>
            </p>
            <p>
              <em>Together, we can build the complete picture.</em>
            </p>
          </div>
        </>
      ),
    },
  ];

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentSlide]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleClose = () => {
    // Mark that user has seen the splash
    localStorage.setItem("hasSeenWorkshopSplash", "true");
    setCurrentSlide(0); // Reset for next time
    onClose();
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  if (!isOpen) return null;

  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="splash-modal-overlay" onClick={handleClose}>
      <div className="splash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="splash-modal-header">
          <button className="skip-button" onClick={handleClose}>
            Skip Intro
          </button>
          <button className="close-button" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="splash-modal-content">
          <div className="slide-container">
            <h2 className="slide-title">{slides[currentSlide].title}</h2>
            <div className="slide-body">{slides[currentSlide].content}</div>
          </div>

          <div className="splash-navigation">
            <button
              className="nav-button prev"
              onClick={handlePrevious}
              disabled={isFirstSlide}
              aria-label="Previous slide"
            >
              ← Previous
            </button>

            <div className="slide-indicators">
              {slides.map((_, index) => (
                <button
                  key={index}
                  className={`indicator-dot ${index === currentSlide ? "active" : ""}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {isLastSlide ? (
              <button className="nav-button start" onClick={handleClose}>
                Start Workshop →
              </button>
            ) : (
              <button className="nav-button next" onClick={handleNext} aria-label="Next slide">
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkshopSplashModal;


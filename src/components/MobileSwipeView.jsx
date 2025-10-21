import { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, EffectCards } from "swiper/modules";
import ChatInterfaceMultiAgent from "./ChatInterfaceMultiAgent";
import { useTranslation } from "../contexts/TranslationContext";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-cards";
import "./MobileSwipeView.css";

const MobileSwipeView = () => {
  const swiperRef = useRef(null);
  const [cards, setCards] = useState(["chat", "styleGuide", "glossary", "scripture", "feedback"]);
  const [dismissedCards, setDismissedCards] = useState(new Set());
  const { project, workflow, updateStyleGuide, addGlossaryTerm, addFeedback } = useTranslation();

  // Reorder cards based on workflow phase
  useEffect(() => {
    const currentPhase = workflow?.currentPhase || "planning";
    let orderedCards = ["chat"]; // Chat is always first

    // Add cards in order based on phase priority
    switch (currentPhase) {
      case "planning":
        orderedCards.push("styleGuide", "glossary", "scripture", "feedback");
        break;
      case "understanding":
        orderedCards.push("glossary", "scripture", "styleGuide", "feedback"); // Glossary first for term collection!
        break;
      case "drafting":
      case "checking":
        orderedCards.push("scripture", "glossary", "styleGuide", "feedback");
        break;
      case "sharing":
        orderedCards.push("feedback", "scripture", "styleGuide", "glossary");
        break;
      default:
        orderedCards.push("styleGuide", "glossary", "scripture", "feedback");
    }

    setCards(orderedCards);
  }, [workflow?.currentPhase]);

  const handleDismiss = (cardId) => {
    if (cardId === "chat") return; // Can't dismiss chat
    setDismissedCards((prev) => new Set([...prev, cardId]));
  };

  const addResourceCard = (resourceType, resourceId) => {
    const newCardId = `resource-${resourceType}-${resourceId}`;
    if (!cards.includes(newCardId)) {
      setCards((prev) => [...prev, newCardId]);
      // Navigate to the new card
      setTimeout(() => {
        if (swiperRef.current) {
          swiperRef.current.slideTo(cards.length);
        }
      }, 100);
    }
  };

  const renderCard = (cardType) => {
    // Skip dismissed cards
    if (dismissedCards.has(cardType)) {
      return null;
    }

    switch (cardType) {
      case "chat":
        return (
          <div className='mobile-card chat-card'>
            <ChatInterfaceMultiAgent />
          </div>
        );

      case "styleGuide":
        return (
          <div className='mobile-card artifact-card'>
            <div className='card-header'>
              <h3>📝 Style Guide</h3>
              <button className='dismiss-button' onClick={() => handleDismiss("styleGuide")}>
                ✕
              </button>
            </div>
            <div className='card-content'>
              <div className='style-item'>
                <label>Language Pair</label>
                <div className='value'>{project.styleGuide.languagePair}</div>
              </div>
              <div className='style-item'>
                <label>Reading Level</label>
                <div className='value'>{project.styleGuide.readingLevel}</div>
              </div>
              <div className='style-item'>
                <label>Tone</label>
                <div className='value'>{project.styleGuide.tone}</div>
              </div>
              <div className='style-item'>
                <label>Philosophy</label>
                <div className='value'>{project.styleGuide.philosophy}</div>
              </div>
            </div>
          </div>
        );

      case "glossary":
        return (
          <div className='mobile-card artifact-card'>
            <div className='card-header'>
              <h3>📚 Glossary</h3>
              <button className='dismiss-button' onClick={() => handleDismiss("glossary")}>
                ✕
              </button>
            </div>
            <div className='card-content'>
              {Object.keys(project.glossary.terms).length === 0 ? (
                <p className='empty-state'>Terms will appear as you translate</p>
              ) : (
                <div className='terms-list'>
                  {Object.entries(project.glossary.terms).map(([term, data]) => (
                    <div key={term} className='term-item'>
                      <strong>{term}</strong>
                      <p>{data.definition}</p>
                      {data.notes && <p className='notes'>{data.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "scripture":
        return (
          <div className='mobile-card artifact-card'>
            <div className='card-header'>
              <h3>📖 Scripture Draft</h3>
              <button className='dismiss-button' onClick={() => handleDismiss("scripture")}>
                ✕
              </button>
            </div>
            <div className='card-content'>
              {Object.keys(project.scriptureCanvas.verses).length === 0 ? (
                <p className='empty-state'>Your translation will appear here</p>
              ) : (
                <div className='verses-list'>
                  {Object.entries(project.scriptureCanvas.verses).map(([ref, data]) => (
                    <div key={ref} className='verse-item'>
                      <div className='verse-ref'>{ref}</div>
                      {data.draft && <p className='verse-text'>{data.draft}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "feedback":
        return (
          <div className='mobile-card artifact-card'>
            <div className='card-header'>
              <h3>💬 Feedback</h3>
              <button className='dismiss-button' onClick={() => handleDismiss("feedback")}>
                ✕
              </button>
            </div>
            <div className='card-content'>
              {project.feedback.comments.length === 0 ? (
                <p className='empty-state'>No feedback yet</p>
              ) : (
                <div className='feedback-list'>
                  {project.feedback.comments.map((comment) => (
                    <div key={comment.id} className='feedback-item'>
                      <div className='feedback-meta'>
                        <strong>{comment.reviewer}</strong> on {comment.verseRef}
                      </div>
                      <p>{comment.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        // Handle dynamic resource cards
        if (cardType.startsWith("resource-")) {
          const [, resourceType, ...resourceIdParts] = cardType.split("-");
          const resourceId = resourceIdParts.join("-");
          return (
            <div className='mobile-card resource-card'>
              <div className='card-header'>
                <h3>
                  📷 {resourceType}: {resourceId}
                </h3>
                <button className='dismiss-button' onClick={() => handleDismiss(cardType)}>
                  ✕
                </button>
              </div>
              <div className='card-content'>
                {resourceType === "image" || resourceType === "map" ? (
                  <img
                    src={`/data/ruth/fia/${resourceId}`}
                    alt={resourceId}
                    className='resource-image'
                  />
                ) : (
                  <p>Resource: {resourceId}</p>
                )}
              </div>
            </div>
          );
        }
        return null;
    }
  };

  const activeCards = cards.filter((card) => !dismissedCards.has(card));

  return (
    <div className='mobile-swipe-view'>
      <Swiper
        ref={swiperRef}
        effect={"cards"}
        grabCursor={true}
        modules={[EffectCards, Pagination]}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        className='mobile-swiper'
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
      >
        {activeCards.map((cardType) => (
          <SwiperSlide key={cardType}>{renderCard(cardType)}</SwiperSlide>
        ))}
      </Swiper>

      <div className='swipe-hints'>
        <div className='hint'>← Swipe to navigate →</div>
        <div className='hint'>↑ Swipe up to dismiss ↑</div>
      </div>
    </div>
  );
};

export default MobileSwipeView;

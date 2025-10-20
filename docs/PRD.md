# Product Requirements Document (PRD): AI-Augmented Bible Translation Assistant (PoC)

## Version History

- **Version**: 1.2
- **Date**: October 16, 2025
- **Author**: Grok (in collaboration with User)
- **Status**: Draft for Review
- **Revision Notes**:
  - **Version 1.0**: Initial PRD synthesized from conversation history, ETEN Innovation Lab recommendations, FIA methodology, and user’s vision for a conversational AI-driven Bible translation tool. Outlined end-to-end workflow (Planning, Understanding, Drafting, Checking, Sharing/Publishing) for the ETEN Summit workshop.
  - **Version 1.1**: Addressed LLM issue of premature sample translations in Understanding. Mandated verbatim open-license translation (e.g., NET Bible) at start, with question-based guidance only until Drafting, where user phrasings are compiled into a sample draft for review and articulation.
  - **Version 1.2**: Refined Understanding for fast-paced workshop: Phrase-by-phrase focus per verse after pericope reading, with storytelling offers for key terms. Questions structured with explanations first, ending with quoted phrase for recall. Prevents workflow recaps to maintain focus.

## 1. Executive Summary

The AI-Augmented Bible Translation Assistant is a Proof of Concept (PoC) webapp designed to demonstrate a fully conversational, LLM-driven Bible translation (BT) workflow for the ETEN Summit (November 2025, ~240 attendees: CEOs, translators, field staff, developers). It empowers church-led translation by aligning with ETEN Innovation Lab’s recommendations for multimodal processes (orality/visuality), Church-Based Bible Translation (CBBT) cycles, and iterative quality assurance, while integrating the Familiarization, Internalization, Articulation (FIA) methodology for Understanding and Drafting.

The tool starts as a pure chat interface (“Welcome. What kind of translation?”), dynamically building a “scripture canvas” sidebar for drafts (text/audio/video). It facilitates a symbiotic relationship: the AI educates users on biblical concepts while collecting cultural/language data for tailored drafts. Key features include verbal drafting with background transcription, automated checking using unfoldingWord (uW) resources, and conversational feedback where the AI explains/defends choices. The PoC targets Ruth 1 in English (extensible to minority languages via LWC chats), leveraging FIA resources (images/maps/videos) and uW translationHelps for trustworthiness.

**High-Level Goals**:

- Vision-cast AI’s role in accelerating trustworthy BT for church empowerment.
- Deliver a minimal viable prototype for a 45-minute workshop demo + 10-minute Q&A.
- Ensure strict sourcing to prevent hallucinations, aligning with CBBT’s trust focus.

**Scope**: Cloud-based Progressive Web App (PWA); WhatsApp integration deferred. Success measured by workshop engagement, time savings, and feedback on trustworthiness.

## 2. Problem Statement

Traditional BT workflows are resource-heavy, often inaccessible to low-literacy or minority-language communities due to rigid tools and limited multimodal engagement. The ETEN Lab emphasizes orality/visuality for natural drafts, church-led conversational exegesis, and iterative QA.<grok:render type=“render_inline_citation”>
<argument name="citation_id">3</argument>
</grok:render><grok:render type=“render_inline_citation”>
<argument name="citation_id">1</argument>
</grok:render><grok:render type=“render_inline_citation”>
<argument name="citation_id">2</argument>
</grok:render> Existing tools (e.g., Paratext, translationCore) lack full conversational AI, hindering data collection, feedback aggregation, and consistency checks. This tool addresses:

- **Accessibility**: Conversational chat for beginners/leaders, reducing barriers.
- **Trustworthiness**: Strict sourcing from FIA/uW resources to avoid untrusted outputs.
- **Engagement**: Multimodal interactions (verbal, visual) for ownership, per Lab’s recommendations.
- **Iteration Overload**: AI manages complex cross-checks and explanations, freeing humans for decisions.

## 3. Product Overview

The Bible Translation Assistant is a React-based PWA that functions as a conversational LLM interface, starting with a chat prompt and dynamically generating a canvas for translations. It guides users through Planning, Understanding, Drafting, Checking, Sharing/Feedback, and Publishing/Iteration, emphasizing symbiotic learning: AI shares trusted info, learns user phrasings for personalization. The PoC focuses on Ruth 1 (English target, extensible to minority languages via LWC), using FIA resources for multimodal Understanding/Drafting and uW translationHelps for supplemental Q&A and Checking.

**Core Workflow Phases**:

1. **Planning**: Set style guide (e.g., dynamic, Grade 8) via chat.
2. **Understanding**: FIA-guided, phrase-by-phrase education/data collection, starting with verbatim open-license source (e.g., NET Bible).
3. **Drafting**: AI compiles user phrasings into sample draft; user articulates verbally/text.
4. **Checking**: Automated uW-based validation, prioritizing severe issues (e.g., heresy > grammar).
5. **Sharing/Feedback**: Conversational community review via links; AI explains choices.
6. **Publishing/Iteration**: Multimodal export; AI ensures consistency.

**Key Differentiators**:

- Fully conversational from “welcome” to end, inspired by ChatGPT’s canvas/Anthropic’s artifacts.
- Symbiotic learning: User educates AI on cultural nuances; AI tailors drafts.
- Multimodal: Verbal input (transcribed), FIA visuals (maps/images/videos).
- Church-Centric: Empowers local decision-making, per CBBT principles.

## 4. Target Users and Use Cases

**Primary Users**:

- ETEN Summit attendees (~240): CEOs/leaders (vision), translators/field staff (hands-on), developers/managers (tech).
- Future: Church leaders, translators in oral/minority-language communities.

**User Personas**:

- **Translator**: Needs guided, natural drafting; benefits from verbal input.
- **Community Reviewer**: Provides feedback via simple chat; AI explains choices.
- **Leader**: Evaluates scalability for church ministry.

**Use Cases**:

- Workshop Demo: Pairs translate Ruth 1 (10min guided FIA, 20min individual, 5min review, 10min Q&A).
- Real-World: Minority language BT via LWC; glossary-building.
- Iterative Review: AI flags project-wide inconsistencies.

## 5. Key Features and Requirements

### 5.1 Functional Requirements

- **Conversational Interface**:
  - Start with prompt: “Welcome. What kind of translation are you doing?” (Set language pair, reading level, literal/meaning-based).
  - Dynamic tool building: Generate canvas sidebar, embed FIA media (e.g., videos/maps) in chat.
  - Symbiotic Data Collection: Probe for cultural phrasings (e.g., "How to say 'loyalty' for your community?"); build mini-glossary.
- **Planning Phase**:
  - Interview for style guide (e.g., “Dynamic or literal? Grade 8?”); enforce with notifications (e.g., “This exceeds Grade 8—simplify?”).
  - Requirements: Store guide in project DB (Firebase JSON); flag deviations real-time.
- **Understanding Phase (FIA Integration - Refined for Pace)**:

  - **Start with Verbatim Source**: Quote full pericope (e.g., Ruth 1 from NET Bible) verbatim at start, fetched via flat files (or Bible Brain API for PoC).<grok:render type=“render_inline_citation”>
    <argument name="citation_id">0</argument>
    </grok:render> Example (Ruth 1:1-22, NET Bible):

  > 1 During the time of the judges there was a famine in the land of Judah. So a man from Bethlehem in Judah went to live as a resident foreigner in the region of Moab, along with his wife and two sons.  
  > 2 (Now the man’s name was Elimelech, his wife was Naomi, and his two sons were Mahlon and Kilion. They were of the clan of Ephrath from Bethlehem in Judah.) They entered the region of Moab and settled there.  
  > [Full text as in Version 1.1]

  - **Phrase-by-Phrase Workflow**: Narrow to one verse (e.g., Ruth 1:1), then break into phrases. Discuss each concept iteratively (e.g., key terms, themes, figures of speech). Offer storytelling for key terms (e.g., “Want to tell a story about ‘famine’ to solidify?”).
  - **Question Format**: Explanations first, end with exact quoted phrase (e.g., “This Hebrew term implies scarcity—how would you phrase ‘there was a famine in the land’?”). No workflow recaps mid-chat to maintain focus.
  - **No Samples**: Prohibit AI-generated translations/examples; use questions only (e.g., “What words convey ‘loyalty’ in verse 16 without changing meaning?”).
  - **Progression**: Track concept coverage per verse (e.g., internal checklist: terms like _chesed_, themes like redemption); transition to Drafting per verse once understood.
  - **Requirements**: Brief interactions; FIA media (flat files: images/maps/videos for Ruth 1, e.g., Moab map, widow illustrations); glossary-building; browser audio recording (Web Audio API, 30s clips); Whisper transcription (supported languages only, e.g., English/Spanish; fallback: “Transcription not available—describe key phrases?”).

- **Drafting Phase**:
  - Per verse, post-Understanding. Compile sample draft from user phrasings (e.g., “scarcity” for famine) and style guide.
  - Prompt: “Review original source [re-quote phrase, e.g., ‘there was a famine in the land’] and compiled draft [AI sample]. Articulate in your own words—record or type.”
  - Iterate based on feedback (e.g., “What you like/don’t like?”).
  - Requirements: Draft reflects only user inputs; multimodal storage (text + audio); approve before Checking.
- **Checking Phase**:
  - Automated scans using uW translationHelps (flat files): Apply notes/questions conversationally (e.g., “Handled this metaphor correctly? [uW note link]”).
  - Severity Ranking: LLM discretion (heresy > additions/omissions > grammar); flag project-wide (e.g., “Inconsistent ‘loyalty’ in Ruth 1:16”).
  - Requirements: Cite uW with expandables; confirm concepts match without exact words.
- **Sharing/Feedback Phase**:
  - Generate shareable link for community review; reviewers chat with LLM (e.g., “Easy to understand?”).
  - AI explains: “We used this word for reading level—still an issue?” Log feedback (e.g., “word choice concern”); aggregate for translator.
  - Requirements: Multi-user session simulation; anonymized feedback storage.
- **Publishing/Iteration Phase**:
  - Export multimodal (text/audio/video) as Bible app view (HTML).
  - Auto-rescan: “Earlier we used this word—reason for change?”
  - Requirements: Iterative loops; re-apply checks for new verses.

### 5.2 Non-Functional Requirements

- **Performance**: Cloud-based; responsive on laptop/mobile (PWA savable to home screen).
- **Security/Privacy**: Encrypt projects; anonymize feedback; GDPR-compliant.
- **Accessibility**: Voice input/output; screen-reader friendly.
- **Reliability**: Strict RAG (FIA/uW flat files only); cite sources with clickable/expandable links.
- **Scalability**: PoC for 240 users; future multi-language support.

## 6. User Journeys

**Sample Journey: Translating Ruth 1 (Refined)**

1. LLM: “Welcome. Language pair? Reading level?” User sets English, dynamic, Grade 8.
2. Understanding: “Here’s Ruth 1 [verbatim NET Bible quote]. Focus on verse 1.”

- Phrase: “Famine means scarcity—view this Moab map [FIA image]. How to phrase ‘there was a famine in the land’? Story about ‘famine’?”
- Iterate concepts; end with phrase quote. Complete verse: “All covered—draft verse 1?”

3. Drafting: “Based on your ‘scarcity,’ here’s a draft: [sample]. Review original [‘there was a famine in the land’]. Articulate verbally/type.”
4. Checking: “Potential issue: Metaphor mismatch [uW link]. Fix?”
5. Sharing: Send link; reviewer chats: “Word feels off.” AI: “Chosen for Grade 8—still an issue?”
6. Iteration: “Feedback suggests change; consistent with earlier?”
7. Publish: Export verse as text/audio.

**Workshop Journey**: 45min (10min intro, 10min guided FIA on Ruth 1:1, 20min individual verse translation, 5min review/feedback, 10min Q&A).

## 7. Technical Requirements

- **Frontend**: React PWA (Netlify-hosted); chat UI with canvas sidebar (e.g., Stream Chat-inspired).
- **Backend**: Node.js/Express or Vercel; Firebase (JSON drafts, audio blobs).
- **LLM**: ChatGPT/Anthropic/Grok with function calling; RAG for FIA/uW flat files (Ruth 1 media/notes).
- **Integrations**: Web Audio API (30s recordings); Whisper (transcription); FIA flat files (images/maps/videos from fiaproject.org); uW translationHelps (notes/questions).
- **Development**: Prototype with multiple LLMs; test on English/Ruth 1.

## 8. Dependencies, Risks, and Assumptions

- **Dependencies**: FIA/uW flat files; paid LLM APIs.
- **Risks**: Transcription accuracy for non-English; LLM straying from RAG (mitigated by strict prompts); workshop connectivity.
- **Assumptions**: Cloud access at Summit; users have mics/browsers; budget for APIs.

## 9. Success Metrics and Timeline

- **Metrics**: Workshop scores (80%+ engagement); Ruth 1 completion time (<30min); trustworthiness feedback.
- **Timeline**: 1 week prototyping; 1 week testing; ready by Summit (November 2025).

## 10. Appendix

- **Resources**: FIA (https://www.fiaproject.org); uW translationHelps; ETEN Lab PDFs (multimodal, CBBT cycle).<grok:render type=“render_inline_citation”>
  <argument name="citation_id">3</argument>
  </grok:render><grok:render type=“render_inline_citation”>
  <argument name="citation_id">1</argument>
  </grok:render><grok:render type=“render_inline_citation”>
  <argument name="citation_id">2</argument>
  </grok:render>
- **Inspirations**: ChatGPT canvas; Anthropic artifacts; translationCore checks.

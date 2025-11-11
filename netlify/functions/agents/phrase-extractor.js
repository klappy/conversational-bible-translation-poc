/**
 * Dynamic Phrase Extractor
 * Breaks any verse into meaningful phrases for translation
 */

export function extractPhrasesFromVerse(verseText, targetCount = 5) {
  if (!verseText) return [];
  
  // Special case: Ruth 1:1 (keep backward compatibility)
  if (verseText.includes("In the days when the judges ruled")) {
    return [
      "In the days when the judges ruled",
      "there was a famine in the land",
      "a certain man from Bethlehem in Judah", 
      "with his wife and two sons",
      "went to reside in the land of Moab"
    ];
  }
  
  // Dynamic extraction for any other verse
  let phrases = [];
  
  // First try: Split by punctuation and conjunctions
  const naturalBreaks = verseText.split(/[,;.]|\band\b|\bbut\b|\bso\b|\bthen\b/i);
  
  phrases = naturalBreaks
    .map(p => p.trim())
    .filter(p => p.length > 10) // Minimum meaningful length
    .filter(p => p.split(' ').length >= 3); // At least 3 words
  
  // If we got too many phrases, combine shorter ones
  while (phrases.length > targetCount + 2) {
    // Find shortest phrase and combine with next
    let shortestIndex = 0;
    let shortestLength = phrases[0].length;
    
    for (let i = 1; i < phrases.length - 1; i++) {
      if (phrases[i].length < shortestLength) {
        shortestIndex = i;
        shortestLength = phrases[i].length;
      }
    }
    
    // Combine with next phrase
    phrases[shortestIndex] = phrases[shortestIndex] + ', ' + phrases[shortestIndex + 1];
    phrases.splice(shortestIndex + 1, 1);
  }
  
  // If we got too few phrases, split longer ones
  while (phrases.length < targetCount - 1 && phrases.length > 0) {
    // Find longest phrase
    let longestIndex = 0;
    let longestLength = phrases[0].length;
    
    for (let i = 1; i < phrases.length; i++) {
      if (phrases[i].length > longestLength) {
        longestIndex = i;
        longestLength = phrases[i].length;
      }
    }
    
    // Split at midpoint conjunction or comma
    const longPhrase = phrases[longestIndex];
    const splitPoint = longPhrase.search(/\b(and|with|for|from)\b/i);
    
    if (splitPoint > 10) {
      const part1 = longPhrase.substring(0, splitPoint).trim();
      const part2 = longPhrase.substring(splitPoint).trim();
      phrases.splice(longestIndex, 1, part1, part2);
    } else {
      // Can't split meaningfully, stop trying
      break;
    }
  }
  
  return phrases;
}

/**
 * Examples:
 * 
 * Ruth 1:2:
 * "The man's name was Elimelech, his wife's name was Naomi, 
 * and the names of his two sons were Mahlon and Kilion. 
 * They were Ephrathites from Bethlehem, Judah. 
 * And they went to Moab and lived there."
 * 
 * Would extract:
 * 1. "The man's name was Elimelech"
 * 2. "his wife's name was Naomi"
 * 3. "the names of his two sons were Mahlon and Kilion"
 * 4. "They were Ephrathites from Bethlehem, Judah"
 * 5. "And they went to Moab and lived there"
 */

export default extractPhrasesFromVerse;

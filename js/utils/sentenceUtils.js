export function hideWordInSentence(sentence, targetWord) {
    if (!sentence || !targetWord) {
        return sentence || '';
    }

    // Create a regex to find the word (case insensitive, whole word)
    const regex = new RegExp(`\\b${targetWord.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'gi');

    // Replace the word with underscores of the same length
    return sentence.replace(regex, (match) => {
        return '_'.repeat(match.length);
    });
} 
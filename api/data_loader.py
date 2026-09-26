# Initalize Trie with wordfreq data at startup
from trie import Trie
from wordfreq import get_frequency_dict

DEFAULT_LANG = "en"
MIN_FREQUENCY = 1e-6
DEFAULT_LIMIT = 10

def load_words(trie: Trie, lang: str = DEFAULT_LANG, min_freq: float = MIN_FREQUENCY) -> int:
    # loads words from wordfreq into the Trie
    freq_dict = get_frequency_dict(lang)

    count = 0
    for word, freq in freq_dict.items():
        if freq >= min_freq:
            clean_word = word.lower().strip()
            if clean_word and clean_word.isalpha():
                trie.insert(clean_word)
                count += 1
    return count

def get_top_words(trie: Trie, limit: int = DEFAULT_LIMIT) -> list[str]:
    # get top suggestions for empty prefix
    return trie.autocomplete("", limit)

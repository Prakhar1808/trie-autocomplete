import pytest
from trie import Trie

@pytest.fixture
def trie():
    t = Trie()
    for w in ["apple", "app", "application", "banana", "band", "bandana", "cat"]:
        t.insert(w)
    return t

def test_insert_and_search(trie):
    assert trie.search("apple") is True
    assert trie.search("app") is True
    assert trie.search("appl") is False

def test_search_missing(trie):
    assert trie.search("apricot") is False

def test_startswith(trie):
    assert trie.startswith("app") is True
    assert trie.startswith("ban") is True
    assert trie.startswith("xyz") is False

def test_autocomplete_basic(trie):
    results = trie.autocomplete("app", limit = 5)
    assert "app" in results
    assert "apple" in results
    assert "application" in results
    assert len(results) <= 5

def test_autocomplete_limit(trie):
    results = trie.autocomplete("app", limit = 2)
    assert len(results) == 2

def test_autocomplete_no_matches(trie):
    assert trie.autocomplete("xyz") == []

def test_autocomplete_empty_prefix(trie):
    results = trie.autocomplete("", limit=3)
    assert len(results) <= 3

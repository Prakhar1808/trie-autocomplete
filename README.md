# Trie Autocomplete

A fast, lightweight, in-memory prefix autocomplete engine built with a **Trie (Prefix Tree)** data structure in Python, populated with real-world vocabulary frequencies from `wordfreq`, and served via an asynchronous **FastAPI** REST API.

---

[![Python Version](https://img.shields.io/badge/python-3.12%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Package Manager](https://img.shields.io/badge/uv-%20python-blueviolet.svg)](https://github.com/astral-sh/uv)
[![Tests](https://img.shields.io/badge/tests-7%20+-brightgreen.svg)](tests/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Features

- **Fast Lookups:** Prefix searches run in O(P + K × L) time where P is prefix length, K is suggestion count, and L is word length—independent of dataset size.
- **28,000+ Word Vocabulary:** Automatically preloads common natural-language English words using `wordfreq` based on real-world frequency distributions.
- **Async REST API:** High-throughput async endpoints built on **FastAPI** and **Uvicorn**, complete with OpenAPI docs and Swagger UI.
- **Decoupled Core Library:** The `trie` module has zero external dependencies and can be used directly as a standalone Python library.
- **CORS Ready:** Configured with CORS middleware for immediate consumption by frontend web apps.
- **Thoroughly Tested:** Full test suite verifying insertion, exact search, prefix matching, limits, and edge cases.


## How It Works

A **Trie** (derived from "re**trie**val") is a tree-like data structure where each node represents a character of a string. All descendants of a node share a common prefix associated with that node.

```
                  (root)
                 /      \
               'a'      'b'
                |        |
               'p'      'a'
              /   \      |
            'p'   'r'   'n'
           (EOW)   |    /  \
           /   \  'o' 'd'  'a'
         'l'   's' | (EOW)  |
          |     | 'n'      'n'
         'e'  (EOW)|        |
        (EOW)    (EOW)     'a'
                          (EOW)

Words stored: ["app", "apple", "apps", "apron", "band", "banana"]
```

### Autocomplete Walkthrough

When querying suggestions for prefix `"app"`:
1. **Prefix Traversal:** Traverse from `root` down `'a'` to `'p'` to `'p'`.
2. **Subtree Collection:** Run Depth-First Search (DFS) starting at the `'p'` node.
3. **Yield Matches:** Collect matching words where `eow == True` (`"app"`, `"apple"`, `"apps"`) until the requested `limit` is reached.


### Algorithmic Complexity

| Operation | Time Complexity | Auxiliary Space | Description |
| :--- | :---: | :---: | :--- |
| `insert(word)` | `O(L)` | `O(L)` | Inserts word of length L into Trie (worst case: all new nodes) |
| `search(word)` | `O(L)` | `O(1)` | Checks if exact word exists |
| `startsWith(prefix)` | `O(P)` | `O(1)` | Checks if any word begins with prefix of length P |
| `autocomplete(prefix, limit)` | `O(P + K × L)` | `O(K × L)` | Traverses prefix node and performs DFS to collect up to K words |

## Project Structure

```text
trie-autocomplete/
├── api/
│   ├── __init__.py
│   ├── main.py          # FastAPI application, CORS, and endpoint handlers
│   └── data_loader.py   # Vocabulary loader using wordfreq
├── trie/
│   ├── __init__.py      # Exports Trie and TrieNode
│   ├── node.py          # TrieNode class definition
│   └── trie.py          # Trie logic (insert, search, startswith, autocomplete)
├── tests/
│   └── test_trie.py     # Pytest unit and integration tests
├── pyproject.toml       # Build configuration and dependency definitions
└── uv.lock              # Lockfile for reproducible installs
```

---

## Quick Start
### Prerequisites

- **Python:** 3.12 or newer
- **Package Manager:** [`uv`](https://github.com/astral-sh/uv) (recommended) or standard `pip`

### Option 1: Using `uv` (Fastest)

1. **Clone the repository:**
   ```bash
   git clone git@github.com:Prakhar1808/trie-autocomplete.git
   cd trie-autocomplete
   ```

2. **Run tests:**
   ```bash
   uv run pytest
   ```

3. **Start the API server:**
   ```bash
   uv run python -m api.main
   ```
   *Or with Uvicorn CLI:*
   ```bash
   uv run uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Option 2: Using standard `pip` & virtual environment

1. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   # fish users:
   # source .venv/bin/activate.fish
   ```

2. **Install dependencies:**
   ```bash
   pip install -e ".[dev]"
   ```

3. **Run tests:**
   ```bash
   pytest
   ```

4. **Start the server:**
   ```bash
   python -m api.main
   ```
The server will initialize, load **~28,000+ words** into memory during startup, and listen on `http://localhost:8000`.

---

## API Reference
When the server is running, visit **`http://localhost:8000/docs`** for interactive Swagger documentation.

### 1. Health Check
Verifies server status and the number of vocabulary words loaded into memory.

- **URL:** `/health`
- **Method:** `GET`
- **Example Request:**
  ```bash
  curl http://localhost:8000/health
  ```
- **Example Response:**
  ```json
  {
    "status": "ok",
    "words_loaded": 28367
  }
  ```

---

### 2. Autocomplete Suggestions

Retrieves autocomplete suggestions matching a given prefix.

- **URL:** `/autocomplete`
- **Method:** `GET`
- **Query Parameters:**
  | Parameter | Type | Required | Default | Description |
  | :--- | :---: | :---: | :---: | :--- |
  | `prefix` | `string` | No | `""` | Search prefix (case-insensitive, trimmed) |
  | `limit` | `integer` | No | `10` | Maximum results to return |

- **Example Request:**
  ```bash
  curl "http://localhost:8000/autocomplete?prefix=mach&limit=5"
  ```

- **Example Response:**
  ```json
  {
    "suggestions": [
      "mach",
      "machine",
      "machines",
      "machinery",
      "machining"
    ]
  }
  ```

- **Empty Prefix Query:**
  Passing an empty prefix returns top default words:
  ```bash
  curl "http://localhost:8000/autocomplete?prefix=&limit=3"
  ```

---

## Using as a Python Library

The `Trie` module can be used independently in any Python script or project without starting the web API:

```python
from trie import Trie

# Initialize the Trie
trie = Trie()

# Insert words
words = ["apple", "application", "applet", "apron", "banana", "bandana"]
for word in words:
    trie.insert(word)

# Exact search
print(trie.search("apple"))       # True
print(trie.search("appl"))        # False

# Prefix check
print(trie.startswith("app"))     # True
print(trie.startswith("cat"))     # False

# Autocomplete
print(trie.autocomplete("app", limit=2))
# Output: ['apple', 'application']
```

---

## Configuration

Vocabulary loading settings can be customized in [`api/data_loader.py`](api/data_loader.py):

| Variable | Default | Description |
| :--- | :---: | :--- |
| `DEFAULT_LANG` | `"en"` | Language code for `wordfreq` dictionary |
| `MIN_FREQUENCY` | `1e-6` | Minimum word frequency threshold for inclusion |
| `DEFAULT_LIMIT` | `10` | Default number of autocomplete suggestions returned |


## Testing

The test suite covers:
- Word insertion and exact word search
- Prefix existence checking (`startswith`)
- Autocomplete with custom limits
- Non-matching prefix handling
- Empty prefix edge cases

To execute all tests with coverage:

```bash
uv run pytest -v
```

## Future Work

- [ ] **Frequency-Weighted Ranking:** Prioritize suggestions by word usage frequency (Max-Heap / top-$k$ tracking at nodes).
- [ ] **Fuzzy Search:** Typo tolerance and Levenshtein distance matching.
- [ ] **Multi-Language Support:** Dynamic language switching via API parameter.
- [ ] **Containerization:** Dockerfile and Docker Compose setup for one-click deployment.

## 📄 License
This project is licensed under the [MIT License](LICENSE).

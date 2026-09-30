from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from trie import Trie
from .data_loader import load_words, DEFAULT_LIMIT

# Global to store word count for health check
word_count: int = 0

trie: Trie = Trie()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    - Startup: Load wordfreq data into Trie
    - Shutdown: Cleanup (if needed)
    """
    global word_count
    # Startup
    print("Loading wordfreq data into Trie...")
    word_count = load_words(trie)
    print(f"Loaded {word_count} words")
    yield
    # Shutdown (optional cleanup here)
    print("Shutting down...")


# Create FastAPI app with lifespan
app = FastAPI(
    title="Trie Autocomplete API",
    description="Prefix-based autocomplete using Trie data structure",
    version="0.1.0",
    lifespan=lifespan
)

# CORS: Allow frontend to call API from browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # All origins for demo
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "ok", "words_loaded": word_count}


@app.get("/autocomplete")
async def autocomplete(
    prefix: str = Query(default="", description="Prefix to autocomplete"),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=50, description="Max suggestions")
):
    # Get autocomplete suggestions for a prefix.
    # Normalize input
    clean_prefix = prefix.lower().strip()

    # Get suggestions from Trie (O(prefix_len + limit) time)
    suggestions = trie.autocomplete(clean_prefix, limit)

    return {"suggestions": suggestions}


@app.get("/trie-path")
async def trie_path(
    prefix: str = Query(default="", description="Prefix to trace through the Trie")
):
    """
    Returns the path taken through the Trie for a given prefix.

    Each step contains:
    - 'char': the character at this node
    - 'depth': how deep in the tree this node is (root = 0)
    - 'children_count': how many branches (child edges) this node has
    - 'is_word': whether this node marks the end of a complete word
    - 'valid': True if the prefix could be traced without hitting a dead end

    This is used by the frontend visualizer to animate the traversal.
    """
    clean_prefix = prefix.lower().strip()
    path = []
    cur = trie.root
    valid = True

    for depth, char in enumerate(clean_prefix):
        if char not in cur.children:
            valid = False
            break
        cur = cur.children[char]
        path.append({
            "char": char,
            "depth": depth + 1,           # root is depth 0; first char is depth 1
            "children_count": len(cur.children),
            "is_word": cur.eow,
        })

    return {
        "prefix": clean_prefix,
        "valid": valid,
        "path": path,
    }


# ── Static file serving ──────────────────────────────────────────────────────
# Mount the frontend from api/static/. This MUST come after all API route
# definitions, because FastAPI matches routes in registration order, so API
# endpoints registered above will always take priority over the static catch-all.
_static_dir = Path(__file__).parent / "static"
_static_dir.mkdir(exist_ok=True)
app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")


# Entry point for `python -m api.main`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)

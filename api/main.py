from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
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


# Entry point for `python -m api.main`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)

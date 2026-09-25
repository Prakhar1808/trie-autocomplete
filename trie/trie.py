from node import TrieNode

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        cur = self.root

        for c in word:
            if c not in cur.children:
                cur.children[c] = TrieNode()
            cur = cur.children[c]
        cur.eow = True

    def search(self, word: str) -> bool:
        cur = self.root

        for c in word:
            if c not in cur.children:
                return False
            cur = cur.children[c]
        return cur.eow

    def startswith(self, prefix: str) -> bool:
        cur = self.root

        for c in prefix:
            if c not in cur.children:
                return False
            cur = cur.children[c]
        return True

    def autocomplete(self, prefix: str, limit: int = 10) -> list[str]:
        cur = self.root
        for c in prefix:
            if c not in cur.children:
                return []
            cur = cur.children[c]

        words = []
        def dfs(node: TrieNode, current_prefix: str):
            if len(words) >= limit:
                return
            if node.eow:
                words.append(current_prefix)
            for char, child in node.children.items():
                dfs(child, current_prefix + char)

        dfs(cur, prefix)
        return words

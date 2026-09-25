class TrieNode:
    def __init__(self):
        self.children = {} # char : next Nodes
        self.eow = False   # is end of a word?
        #TODO: add frequency for ranking

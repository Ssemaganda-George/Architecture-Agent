#!/usr/bin/env python3
"""
Word Cloud Generator for Architect Agent Corpus
Usage:
  python3 generate_wordcloud.py [corpus_file] [output_file]

If no arguments provided, uses default paths.
"""

import sys
import os
import re
from pathlib import Path

# Check if wordcloud is installed
try:
    from wordcloud import WordCloud
except ImportError:
    print("Installing wordcloud...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "wordcloud"])
    from wordcloud import WordCloud

# Default paths
DEFAULT_CORPUS = "/Users/sgeorge/Desktop/julie/architect_training_data/corpus.txt"
DEFAULT_OUTPUT = "/Users/sgeorge/Desktop/julie/architect_training_data/wordcloud.png"

def get_stopwords():
    """Return comprehensive stopwords for architectural corpus."""
    return {
        # Common English stopwords
        'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'been',
        'were', 'was', 'are', 'has', 'had', 'not', 'but', 'they', 'their',
        'would', 'could', 'should', 'can', 'will', 'may', 'might', 'must',
        'shall', 'following', 'also', 'other', 'more', 'most', 'some', 'any',
        'each', 'every', 'both', 'few', 'many', 'much', 'such', 'only', 'own',
        'same', 'than', 'then', 'these', 'those', 'very', 'just', 'because',
        'about', 'into', 'through', 'during', 'before', 'after', 'above',
        'below', 'between', 'under', 'again', 'further', 'once', 'here',
        'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few',
        'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
        'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will',
        'just', 'don', 'should', 'now',
        
        # File/corpus-specific noise
        'file', 'page', 'pdf', 'text', 'content', 'section', 'file', 'name',
        'data', 'information', 'extracted', 'characters', 'words', 'total',
        'found', 'error', 'reading', 'processing', ' consolidating', 'saved',
        'directory', 'folder', 'path', 'drive', 'architect', 'agent',
        
        # ArchiCAD specific noise
        'pln', 'pla', 'archicad', 'plan', 'floor', 'view', 'element',
        'project', 'model', 'version', 'building', 'story', 'level',
        
        # Common filler
        'like', 'get', 'make', 'used', 'using', 'use', 'based', 'however',
        'therefore', 'thus', 'hence', 'yet', 'still', 'even', 'much', 'well',
        'back', 'way', 'thing', 'things', 'something', 'anything', 'everything',
        'nothing', 'someone', 'anyone', 'everyone'
    }

def load_corpus(filepath):
    """Load and return corpus text."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Corpus file not found: {filepath}")
    
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Split sections and extract just the text content
    sections = []
    for section in content.split('='*60):
        section = section.strip()
        if not section:
            continue
        lines = section.split('\n')
        # Skip the first line which is the filename
        text = '\n'.join(lines[1:]) if len(lines) > 1 else ''
        if text:
            sections.append(text)
    
    full_text = ' '.join(sections)
    print(f"Loaded {len(sections)} sections, {len(full_text):,} characters")
    return full_text

def generate_wordcloud(text, output_path, stopwords=None):
    """Generate and save word cloud image."""
    
    # Default stopwords
    if stopwords is None:
        stopwords = get_stopwords()
    
    print("Generating word cloud...")
    
    # Create wordcloud
    wc = WordCloud(
        width=1600,
        height=900,
        background_color='white',
        max_words=200,
        stopwords=stopwords,
        relative_scaling=0.5,
        min_font_size=12,
        max_font_size=150,
        prefer_horizontal=0.7,
        regexp=r'\b[a-zA-Z]{3,}\b',  # Only words with 3+ letters
        collocations=False,  # Treat bigrams as separate words
        colormap='viridis',
        contour_width=0,
        contour_color='steelblue'
    )
    
    wc.generate(text)
    
    # Save image
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    wc.to_file(str(output))
    
    print(f"\n✅ Word cloud saved to: {output}")
    print(f"   File size: {output.stat().st_size / 1024:.1f} KB")
    
    # Print top words
    print(f"\nTop 20 words:")
    for word, count in wc.words_.most_common(20):
        print(f"  {word:<15} {count:>6.1f}")
    
    return wc

def print_word_ranking(text, stopwords=None, top_n=50):
    """Print word frequency ranking (no image generation)."""
    if stopwords is None:
        stopwords = get_stopwords()
    
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    word_freq = Counter(w for w in words if w not in stopwords)
    
    print(f"\nTop {top_n} words:")
    print("=" * 40)
    for word, count in word_freq.most_common(top_n):
        bar = '█' * (count // 10)
        print(f"{word:<15} {count:>6}  {bar}")

# Main
if __name__ == "__main__":
    corpus_file = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CORPUS
    output_file = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT
    
    try:
        text = load_corpus(corpus_file)
        generate_wordcloud(text, output_file)
        print_word_ranking(text)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

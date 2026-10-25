from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def calculate_similarity(code_a: str, code_b: str) -> float:
    """
    Calculate character-pattern similarity between two code files.
    Returns a score from 0 to 100.
    """

    if not code_a.strip() or not code_b.strip():
        raise ValueError("Both code files must contain text.")

    if code_a == code_b:
        return 100.0

    vectorizer = TfidfVectorizer(
        analyzer="char",
        ngram_range=(3, 5),
        lowercase=False,
        sublinear_tf=True
    )

    vectors = vectorizer.fit_transform([code_a, code_b])

    score = cosine_similarity(vectors[0], vectors[1])[0, 0]

    return round(float(score) * 100, 2)
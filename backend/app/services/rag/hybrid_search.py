"""
하이브리드 RAG 검색 서비스
- BM25(키워드 30%) + Vector 유사도(70%) 병합 (Reciprocal Rank Fusion)
- confidence: 최상위 결과의 vector_similarity (cosine, 0~1 스케일) 사용
  → RRF combined_score는 순위 결정용, threshold 비교는 vector_similarity로 수행
- "김치찌개" / "김치 찌개" / "김칫국" 혼동 방지
"""
from dataclasses import dataclass
from typing import Optional
from rank_bm25 import BM25Okapi
import chromadb
from app.core.config import get_settings

settings = get_settings()

BM25_WEIGHT = 0.3
VECTOR_WEIGHT = 0.7
SIMILARITY_THRESHOLD = settings.RAG_SIMILARITY_THRESHOLD  # 0.78 (cosine similarity 기준)


@dataclass
class SearchResult:
    food_name: str
    combined_score: float
    nutrient_data: dict
    rank: int


class HybridFoodSearch:

    def __init__(self):
        self._chroma_client: Optional[chromadb.HttpClient] = None
        self._collection = None
        self._bm25: Optional[BM25Okapi] = None
        self._corpus: list[dict] = []   # [{food_name, text, nutrient_data}]

    def _get_collection(self):
        if self._chroma_client is None:
            self._chroma_client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
            )
        if self._collection is None:
            self._collection = self._chroma_client.get_or_create_collection(
                name=settings.CHROMA_COLLECTION,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def _get_bm25(self) -> Optional[BM25Okapi]:
        """BM25 인덱스 초기화 (최초 1회). 코퍼스가 비어있으면 None 반환."""
        if self._bm25 is None:
            collection = self._get_collection()
            results = collection.get(include=["documents", "metadatas"])
            self._corpus = [
                {
                    "food_name": meta.get("food_name", ""),
                    "text": doc,
                    "nutrient_data": meta,
                }
                for doc, meta in zip(results["documents"], results["metadatas"])
            ]
            if not self._corpus:
                return None
            tokenized = [item["text"].split() for item in self._corpus]
            self._bm25 = BM25Okapi(tokenized)
        return self._bm25

    async def search(self, query: str, top_k: int = 5) -> dict:
        """
        하이브리드 검색 수행
        Returns:
            results: 상위 top_k 결과
            needs_hitl: 임계값 미달 여부
            confidence: 최상위 결과 점수
        """
        collection = self._get_collection()
        bm25 = self._get_bm25()

        # BM25 검색 (코퍼스가 비어있으면 건너뜀)
        if bm25 is not None:
            bm25_scores = bm25.get_scores(query.split())
            bm25_top_idx = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:top_k * 2]
        else:
            bm25_top_idx = []

        # Vector 검색
        vector_results = collection.query(
            query_texts=[query],
            n_results=min(top_k * 2, collection.count() or 1),
            include=["documents", "metadatas", "distances"],
        )

        # RRF 병합
        combined = self._rrf_merge(
            bm25_top_idx,
            vector_results, top_k * 2
        )

        top_results = combined[:top_k]
        # threshold 비교는 RRF combined_score가 아닌 vector_similarity(cosine, 0~1)로 수행
        top_vector_sim = top_results[0]["vector_similarity"] if top_results else 0.0

        return {
            "results": top_results,
            "needs_hitl": top_vector_sim < SIMILARITY_THRESHOLD,
            "confidence": round(top_vector_sim, 4),
            "query": query,
        }

    def _rrf_merge(
        self,
        bm25_top_idx: list[int],
        vector_results: dict,
        top_k: int,
        k: int = 60,
    ) -> list[dict]:
        """Reciprocal Rank Fusion으로 BM25 + Vector 결과 병합"""
        rrf_scores: dict[str, float] = {}
        food_data: dict[str, dict] = {}

        # BM25 점수 반영
        for rank, idx in enumerate(bm25_top_idx):
            if idx >= len(self._corpus):
                continue
            item = self._corpus[idx]
            key = item["food_name"]
            rrf_scores[key] = rrf_scores.get(key, 0) + BM25_WEIGHT * (1 / (k + rank + 1))
            food_data[key] = item["nutrient_data"]

        # Vector 점수 반영 (distance → similarity 변환)
        ids = vector_results.get("ids", [[]])[0]
        distances = vector_results.get("distances", [[]])[0]
        metadatas = vector_results.get("metadatas", [[]])[0]

        for rank, (doc_id, dist, meta) in enumerate(zip(ids, distances, metadatas)):
            key = meta.get("food_name", doc_id)
            similarity = 1.0 - dist   # cosine distance → similarity
            rrf_scores[key] = rrf_scores.get(key, 0) + VECTOR_WEIGHT * (1 / (k + rank + 1))
            # 최고 벡터 유사도를 combined_score 기준으로 사용
            food_data.setdefault(key, meta)
            food_data[key]["_vector_similarity"] = similarity

        # 정렬 + 결과 구성
        sorted_items = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        return [
            {
                "food_name": name,
                "combined_score": round(score, 4),
                "vector_similarity": food_data.get(name, {}).get("_vector_similarity", 0.0),
                "nutrient_data": food_data.get(name, {}),
                "rank": rank + 1,
            }
            for rank, (name, score) in enumerate(sorted_items)
        ]

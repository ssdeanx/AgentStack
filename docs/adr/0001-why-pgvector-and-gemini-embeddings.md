# ADR 0001: Why PostgreSQL + PgVector and Gemini Embeddings

Status: Accepted
Date: 2025-11-15

## Context

Mastra handles high-dimensional semantic data and time-series message storage. The system requires a reliable, auditable storage for messages and metadata as well as a fast similarity search for RAG retrieval.

## Decision

Use PostgreSQL for message/thread storage (via `@mastra/pg` PostgresStore) and `pgvector` for vector similarity. Gemini embedding models (via `@ai-sdk/google`) are used for embedding generation.

## Consequences

- PostgreSQL + PgVector gives low operational overhead and consolidates relational and vector data in one place.
- Using Gemini embeddings yields high-quality vectors and is integrated with `embed` and `embedMany`. This simplifies instrumentation and model changes.
- Dimensions are high (1568/3072), requiring flat indexes for larger dims and the system documents `indexConfig: type: 'flat'` to prevent HNSW dimension limits.

## Short-term mitigation

- Provide re-index scripts for updating stored vectors when switching embedding models or dimensions.
- Document index size and resource requirements in `docs/architecture/Project_Architecture_Blueprint.md`.

## Alternatives considered

- Pinecone / Qdrant / Chroma — considered for managed or local solutions. PgVector wins because of co-located relational & vector store and simple local dev experience.

## Notes

- Add reindex scripts and reindex process to CI/CD to make migrations safer.
- Monitor vector query performance and add rate limiting or batched re-embedding jobs when needed.

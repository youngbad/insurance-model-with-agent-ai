"""
RAG Pipeline: Document ingestion, embedding, and retrieval using FAISS.
"""
import os
import logging
from pathlib import Path
from typing import List, Optional

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_vector_store: Optional[FAISS] = None

def _get_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        openai_api_key=settings.openai_api_key,
        model="text-embedding-3-small",
    )


def load_knowledge_base() -> List[Document]:
    """Load all markdown documents from the knowledge base directory."""
    kb_path = Path(settings.knowledge_base_path)
    if not kb_path.exists():
        logger.warning(f"Knowledge base path does not exist: {kb_path}")
        return []

    loader = DirectoryLoader(
        str(kb_path),
        glob="**/*.md",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
    )
    docs = loader.load()
    logger.info(f"Loaded {len(docs)} documents from knowledge base")
    return docs


def split_documents(docs: List[Document]) -> List[Document]:
    """Split documents into chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(docs)
    logger.info(f"Split into {len(chunks)} chunks")
    return chunks


def build_vector_store(force_rebuild: bool = False) -> FAISS:
    """Build or load the FAISS vector store."""
    global _vector_store

    vector_store_path = Path(settings.vector_db_path)

    if not force_rebuild and (vector_store_path / "index.faiss").exists():
        logger.info("Loading existing FAISS vector store")
        try:
            _vector_store = FAISS.load_local(
                str(vector_store_path),
                _get_embeddings(),
                allow_dangerous_deserialization=True,
            )
            return _vector_store
        except Exception as e:
            logger.warning(f"Failed to load existing vector store: {e}. Rebuilding.")

    logger.info("Building FAISS vector store from knowledge base")
    docs = load_knowledge_base()
    if not docs:
        logger.warning(
            "No knowledge base documents found at %s. RAG features will be degraded. "
            "Place Markdown files in the knowledge_base directory to enable full RAG.",
            kb_path,
        )
        docs = [Document(
            page_content="Insurance risk assessment placeholder document.",
            metadata={"source": "placeholder"}
        )]

    chunks = split_documents(docs)

    embeddings = _get_embeddings()
    _vector_store = FAISS.from_documents(chunks, embeddings)

    vector_store_path.mkdir(parents=True, exist_ok=True)
    _vector_store.save_local(str(vector_store_path))
    logger.info(f"Vector store saved to {vector_store_path}")

    return _vector_store


def get_vector_store() -> Optional[FAISS]:
    """Get the current vector store instance."""
    return _vector_store


def retrieve_context(query: str, k: int = 4) -> List[Document]:
    """Retrieve relevant documents for a query."""
    store = get_vector_store()
    if store is None:
        logger.warning("Vector store not initialized")
        return []
    try:
        docs = store.similarity_search(query, k=k)
        return docs
    except Exception as e:
        logger.error(f"Error retrieving context: {e}")
        return []


def format_retrieved_context(docs: List[Document]) -> str:
    """Format retrieved documents into a single context string."""
    if not docs:
        return ""
    parts = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "unknown")
        parts.append(f"[Source {i}: {Path(source).name}]\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)

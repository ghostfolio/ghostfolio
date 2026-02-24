---
name: langchain-architecture
description: Design LLM applications using LangChain 1.x and LangGraph for agents, memory, and tool integration. Use when building LangChain applications, implementing AI agents, creating complex LLM workflows, or working with LangGraph state management.
---

# LangChain & LangGraph Architecture

Modern LangChain 1.x and LangGraph patterns for building production-grade LLM applications with agents, state management, memory, and tool integration.

## When to Use This Skill

- Building autonomous AI agents with tool access
- Implementing complex multi-step LLM workflows
- Managing conversation memory and state
- Integrating LLMs with external data sources and APIs
- Creating modular, reusable LLM application components
- Implementing document processing pipelines

## Package Structure (LangChain 1.x)

```
langchain (1.2.x)         # High-level orchestration
langchain-core (1.2.x)    # Core abstractions (messages, prompts, tools)
langchain-community       # Third-party integrations
langgraph                 # Agent orchestration and state management
langchain-openai          # OpenAI integrations
langchain-anthropic       # Anthropic/Claude integrations
langchain-voyageai        # Voyage AI embeddings
langchain-pinecone        # Pinecone vector store
```

## Core Concepts

### LangGraph Agents

LangGraph is the standard for building agents. Key features:

- **StateGraph**: Explicit state management with typed state
- **Durable Execution**: Agents persist through failures
- **Human-in-the-Loop**: Inspect and modify state at any point
- **Memory**: Short-term and long-term memory across sessions
- **Checkpointing**: Save and resume agent state

Agent patterns: **ReAct** (`create_react_agent`), **Plan-and-Execute**, **Multi-Agent** (supervisor routing), **Tool-Calling** (Pydantic schemas).

### State Management

LangGraph uses TypedDict for explicit state:

```python
from typing import Annotated, TypedDict
from langgraph.graph import MessagesState

class AgentState(MessagesState):
    context: Annotated[list, "retrieved documents"]

class CustomState(TypedDict):
    messages: Annotated[list, "conversation history"]
    context: Annotated[dict, "retrieved context"]
    current_step: str
    results: list
```

### Memory Systems

- **MemorySaver**: In-memory checkpointer (development)
- **PostgresSaver**: Production checkpointer with PostgreSQL
- **VectorStore Memory**: Semantic similarity retrieval for long-term context
- Each `thread_id` maintains separate conversation state

### Document Processing

Components: **Document Loaders** (various sources), **Text Splitters** (intelligent chunking), **Vector Stores** (embeddings storage), **Retrievers** (relevant document fetching).

### Callbacks & Tracing

LangSmith is the standard for observability — request/response logging, token tracking, latency monitoring, error tracking, trace visualization.

```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-api-key"
os.environ["LANGCHAIN_PROJECT"] = "my-project"
```

## Quick Start: ReAct Agent

```python
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_anthropic import ChatAnthropic
from langchain_core.tools import tool

llm = ChatAnthropic(model="claude-sonnet-4-6", temperature=0)

@tool
def search_database(query: str) -> str:
    """Search internal database for information."""
    return f"Results for: {query}"

checkpointer = MemorySaver()
agent = create_react_agent(llm, [search_database], checkpointer=checkpointer)

config = {"configurable": {"thread_id": "user-123"}}
result = await agent.ainvoke(
    {"messages": [("user", "Search for Python tutorials")]},
    config=config
)
```

## Architecture Patterns

Four key patterns (full code in [reference.md](reference.md)):

1. **RAG with LangGraph**: StateGraph with retrieve → generate nodes, VoyageAI embeddings + Pinecone vector store
2. **Custom Agent with Structured Tools**: Pydantic schemas via `StructuredTool.from_function`
3. **Multi-Step Workflow**: StateGraph with conditional routing between extract → analyze → summarize nodes
4. **Multi-Agent Orchestration**: Supervisor pattern routing between specialized agents (researcher, writer, reviewer)

## Performance Optimization

- **Caching**: Redis-backed LLM cache via `langchain_community.cache.RedisCache`
- **Async Batch Processing**: `asyncio.gather` for parallel document processing
- **Connection Pooling**: Reuse Pinecone/database clients across requests
- **Streaming**: Use `astream_events` for real-time token streaming

## Common Pitfalls

1. **Using Deprecated APIs**: Use LangGraph for agents, not `initialize_agent`
2. **Memory Overflow**: Use checkpointers with TTL for long-running agents
3. **Poor Tool Descriptions**: Clear descriptions help LLM select correct tools
4. **Context Window Exceeded**: Use summarization or sliding window memory
5. **No Error Handling**: Wrap tool functions with try/except
6. **Blocking Operations**: Use async methods (`ainvoke`, `astream`)
7. **Missing Observability**: Always enable LangSmith tracing in production

## Production Checklist

- [ ] Use LangGraph StateGraph for agent orchestration
- [ ] Implement async patterns throughout (`ainvoke`, `astream`)
- [ ] Add production checkpointer (PostgreSQL, Redis)
- [ ] Enable LangSmith tracing
- [ ] Implement structured tools with Pydantic schemas
- [ ] Add timeout limits for agent execution
- [ ] Implement rate limiting
- [ ] Add comprehensive error handling
- [ ] Write integration tests for agent workflows

## Additional Resources

- For complete code examples of all patterns, see [reference.md](reference.md)
- [LangChain Docs](https://python.langchain.com/docs/) | [LangGraph Docs](https://langchain-ai.github.io/langgraph/) | [LangSmith](https://smith.langchain.com/)

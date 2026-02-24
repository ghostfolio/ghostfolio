# LangChain Architecture — Full Code Examples

## Pattern 1: RAG with LangGraph

```python
from langgraph.graph import StateGraph, START, END
from langchain_anthropic import ChatAnthropic
from langchain_voyageai import VoyageAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from typing import TypedDict, Annotated

class RAGState(TypedDict):
    question: str
    context: Annotated[list[Document], "retrieved documents"]
    answer: str

llm = ChatAnthropic(model="claude-sonnet-4-6")
embeddings = VoyageAIEmbeddings(model="voyage-3-large")
vectorstore = PineconeVectorStore(index_name="docs", embedding=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

async def retrieve(state: RAGState) -> RAGState:
    docs = await retriever.ainvoke(state["question"])
    return {"context": docs}

async def generate(state: RAGState) -> RAGState:
    prompt = ChatPromptTemplate.from_template(
        """Answer based on the context below. If you cannot answer, say so.

        Context: {context}
        Question: {question}
        Answer:"""
    )
    context_text = "\n\n".join(doc.page_content for doc in state["context"])
    response = await llm.ainvoke(
        prompt.format(context=context_text, question=state["question"])
    )
    return {"answer": response.content}

builder = StateGraph(RAGState)
builder.add_node("retrieve", retrieve)
builder.add_node("generate", generate)
builder.add_edge(START, "retrieve")
builder.add_edge("retrieve", "generate")
builder.add_edge("generate", END)

rag_chain = builder.compile()
result = await rag_chain.ainvoke({"question": "What is the main topic?"})
```

## Pattern 2: Custom Agent with Structured Tools

```python
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    query: str = Field(description="Search query")
    filters: dict = Field(default={}, description="Optional filters")

class EmailInput(BaseModel):
    recipient: str = Field(description="Email recipient")
    subject: str = Field(description="Email subject")
    content: str = Field(description="Email body")

async def search_database(query: str, filters: dict = {}) -> str:
    return f"Results for '{query}' with filters {filters}"

async def send_email(recipient: str, subject: str, content: str) -> str:
    return f"Email sent to {recipient}"

tools = [
    StructuredTool.from_function(
        coroutine=search_database,
        name="search_database",
        description="Search internal database",
        args_schema=SearchInput
    ),
    StructuredTool.from_function(
        coroutine=send_email,
        name="send_email",
        description="Send an email",
        args_schema=EmailInput
    )
]

agent = create_react_agent(llm, tools)
```

## Pattern 3: Multi-Step Workflow with StateGraph

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Literal

class WorkflowState(TypedDict):
    text: str
    entities: list
    analysis: str
    summary: str
    current_step: str

async def extract_entities(state: WorkflowState) -> WorkflowState:
    prompt = f"Extract key entities from: {state['text']}\n\nReturn as JSON list."
    response = await llm.ainvoke(prompt)
    return {"entities": response.content, "current_step": "analyze"}

async def analyze_entities(state: WorkflowState) -> WorkflowState:
    prompt = f"Analyze these entities: {state['entities']}\n\nProvide insights."
    response = await llm.ainvoke(prompt)
    return {"analysis": response.content, "current_step": "summarize"}

async def generate_summary(state: WorkflowState) -> WorkflowState:
    prompt = f"""Summarize:
    Entities: {state['entities']}
    Analysis: {state['analysis']}
    Provide a concise summary."""
    response = await llm.ainvoke(prompt)
    return {"summary": response.content, "current_step": "complete"}

def route_step(state: WorkflowState) -> Literal["analyze", "summarize", "end"]:
    step = state.get("current_step", "extract")
    if step == "analyze":
        return "analyze"
    elif step == "summarize":
        return "summarize"
    return "end"

builder = StateGraph(WorkflowState)
builder.add_node("extract", extract_entities)
builder.add_node("analyze", analyze_entities)
builder.add_node("summarize", generate_summary)

builder.add_edge(START, "extract")
builder.add_conditional_edges("extract", route_step, {
    "analyze": "analyze", "summarize": "summarize", "end": END
})
builder.add_conditional_edges("analyze", route_step, {
    "summarize": "summarize", "end": END
})
builder.add_edge("summarize", END)

workflow = builder.compile()
```

## Pattern 4: Multi-Agent Orchestration

```python
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import create_react_agent
from typing import Literal

class MultiAgentState(TypedDict):
    messages: list
    next_agent: str

researcher = create_react_agent(llm, research_tools)
writer = create_react_agent(llm, writing_tools)
reviewer = create_react_agent(llm, review_tools)

async def supervisor(state: MultiAgentState) -> MultiAgentState:
    prompt = f"""Based on the conversation, which agent should handle this?
    Options: researcher, writer, reviewer, FINISH
    Messages: {state['messages']}
    Respond with just the agent name."""
    response = await llm.ainvoke(prompt)
    return {"next_agent": response.content.strip().lower()}

def route_to_agent(state: MultiAgentState) -> Literal["researcher", "writer", "reviewer", "end"]:
    next_agent = state.get("next_agent", "").lower()
    if next_agent == "finish":
        return "end"
    return next_agent if next_agent in ["researcher", "writer", "reviewer"] else "end"

builder = StateGraph(MultiAgentState)
builder.add_node("supervisor", supervisor)
builder.add_node("researcher", researcher)
builder.add_node("writer", writer)
builder.add_node("reviewer", reviewer)

builder.add_edge(START, "supervisor")
builder.add_conditional_edges("supervisor", route_to_agent, {
    "researcher": "researcher", "writer": "writer",
    "reviewer": "reviewer", "end": END
})
for agent in ["researcher", "writer", "reviewer"]:
    builder.add_edge(agent, "supervisor")

multi_agent = builder.compile()
```

## Memory: Token-Based with LangGraph

```python
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
agent = create_react_agent(llm, tools, checkpointer=checkpointer)

config = {"configurable": {"thread_id": "session-abc123"}}
result1 = await agent.ainvoke({"messages": [("user", "My name is Alice")]}, config)
result2 = await agent.ainvoke({"messages": [("user", "What's my name?")]}, config)
```

## Memory: Production PostgreSQL

```python
from langgraph.checkpoint.postgres import PostgresSaver

checkpointer = PostgresSaver.from_conn_string(
    "postgresql://user:pass@localhost/langgraph"
)
agent = create_react_agent(llm, tools, checkpointer=checkpointer)
```

## Memory: Vector Store for Long-Term Context

```python
from langchain_community.vectorstores import Chroma
from langchain_voyageai import VoyageAIEmbeddings

embeddings = VoyageAIEmbeddings(model="voyage-3-large")
memory_store = Chroma(
    collection_name="conversation_memory",
    embedding_function=embeddings,
    persist_directory="./memory_db"
)

async def retrieve_relevant_memory(query: str, k: int = 5) -> list:
    docs = await memory_store.asimilarity_search(query, k=k)
    return [doc.page_content for doc in docs]

async def store_memory(content: str, metadata: dict = {}):
    await memory_store.aadd_texts([content], metadatas=[metadata])
```

## Custom Callback Handler

```python
from langchain_core.callbacks import BaseCallbackHandler
from typing import Any, Dict, List

class CustomCallbackHandler(BaseCallbackHandler):
    def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs) -> None:
        print(f"LLM started with {len(prompts)} prompts")

    def on_llm_end(self, response, **kwargs) -> None:
        print(f"LLM completed: {len(response.generations)} generations")

    def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs) -> None:
        print(f"Tool started: {serialized.get('name')}")

    def on_tool_end(self, output: str, **kwargs) -> None:
        print(f"Tool completed: {output[:100]}...")

result = await agent.ainvoke(
    {"messages": [("user", "query")]},
    config={"callbacks": [CustomCallbackHandler()]}
)
```

## Streaming Responses

```python
llm = ChatAnthropic(model="claude-sonnet-4-6", streaming=True)

async for chunk in llm.astream("Tell me a story"):
    print(chunk.content, end="", flush=True)

async for event in agent.astream_events(
    {"messages": [("user", "Search and summarize")]},
    version="v2"
):
    if event["event"] == "on_chat_model_stream":
        print(event["data"]["chunk"].content, end="")
    elif event["event"] == "on_tool_start":
        print(f"\n[Using tool: {event['name']}]")
```

## Performance: Redis Caching

```python
from langchain_community.cache import RedisCache
from langchain_core.globals import set_llm_cache
import redis

redis_client = redis.Redis.from_url("redis://localhost:6379")
set_llm_cache(RedisCache(redis_client))
```

## Performance: Async Batch Processing

```python
import asyncio
from langchain_core.documents import Document

async def process_documents(documents: list[Document]) -> list:
    tasks = [process_single(doc) for doc in documents]
    return await asyncio.gather(*tasks)

async def process_single(doc: Document) -> dict:
    chunks = text_splitter.split_documents([doc])
    embeddings = await embeddings_model.aembed_documents(
        [c.page_content for c in chunks]
    )
    return {"doc_id": doc.metadata.get("id"), "embeddings": embeddings}
```

## Testing Strategies

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_agent_tool_selection():
    with patch.object(llm, 'ainvoke') as mock_llm:
        mock_llm.return_value = AsyncMock(content="Using search_database")
        result = await agent.ainvoke({
            "messages": [("user", "search for documents")]
        })
        assert "search_database" in str(result)

@pytest.mark.asyncio
async def test_memory_persistence():
    config = {"configurable": {"thread_id": "test-thread"}}
    await agent.ainvoke(
        {"messages": [("user", "Remember: the code is 12345")]}, config
    )
    result = await agent.ainvoke(
        {"messages": [("user", "What was the code?")]}, config
    )
    assert "12345" in result["messages"][-1].content
```

import asyncio
from openai import AsyncOpenAI

BASE_URL = "https://y08jn5hewzi5si-11434.proxy.runpod.net/v1"
MODEL    = "llama3.1:8b"

async def main():
    client = AsyncOpenAI(base_url=BASE_URL, api_key="ollama")
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": "Say hello in one sentence."}],
        stream=True,
    )
    async for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            print(content, end="", flush=True)
    print()

asyncio.run(main())
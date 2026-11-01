"""Write Edge TTS MP3 bytes to stdout; diagnostics stay on stderr."""
import asyncio
import sys

import edge_tts


async def main():
    communicate = edge_tts.Communicate(sys.argv[1], sys.argv[2])
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            sys.stdout.buffer.write(chunk["data"])
    sys.stdout.buffer.flush()


if __name__ == "__main__":
    asyncio.run(main())

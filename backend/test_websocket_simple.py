#!/usr/bin/env python3
"""Simple WebSocket connection test"""
import asyncio
import websockets

async def test_connection():
    uri = "ws://localhost:8000/ws/optimize/plate-girder/"
    print(f"Testing connection to {uri}...")
    try:
        async with websockets.connect(uri, ping_interval=None) as ws:
            print("✅ WebSocket connection successful!")
            return True
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ Connection failed: Status {e.status_code}")
        if hasattr(e, 'headers'):
            print(f"   Headers: {e.headers}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())


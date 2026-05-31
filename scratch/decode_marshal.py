import base64
import marshal
import dis

# Base64 string from lambda layer config
code_b64 = "4wEAAAAAAAAAAQAAAAMAAABDAAAAcxAAAAB8AGQBGQB8AGQCGQAbAFMAKQNO6QAAAADpAQAAAKkAKgHaAXhyAwAAAHIDAAAA+h88aXB5dGhvbi1pbnB1dC0xMi0wNzc4YjAxMGY0Mzc+2gg8bGFtYmRhPiIAAABzAAAAAA=="

print("Decoding base64...")
code_bytes = base64.b64decode(code_b64)
print(f"Bytes length: {len(code_bytes)}")

# Let's inspect the python version magic number
# Python 3.11 magic number starts with something else, let's see what is inside code_bytes
print("First 16 bytes:", list(code_bytes[:16]))

try:
    # Marshal code objects have a header in older Python versions:
    # In Python 3.3+, it is: 4 bytes magic, 4 bytes moddate (or 4 bytes size since 3.7), 4 bytes size
    # Let's try loading from different offsets to bypass the header!
    for offset in [0, 4, 8, 12, 16]:
        try:
            code_obj = marshal.loads(code_bytes[offset:])
            print(f"\nSUCCESS at offset {offset}!")
            print(f"Code object: {code_obj}")
            print("Disassembly:")
            dis.dis(code_obj)
            break
        except Exception as e:
            print(f"Failed at offset {offset}: {e}")
            
except Exception as ge:
    print(f"Global error: {ge}")

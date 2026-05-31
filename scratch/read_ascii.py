import base64

code_b64 = "4wEAAAAAAAAAAQAAAAMAAABDAAAAcxAAAAB8AGQBGQB8AGQCGQAbAFMAKQNO6QAAAADpAQAAAKkAKgHaAXhyAwAAAHIDAAAA+h88aXB5dGhvbi1pbnB1dC0xMi0wNzc4YjAxMGY0Mzc+2gg8bGFtYmRhPiIAAABzAAAAAA=="
code_bytes = base64.b64decode(code_b64)

print("ASCII strings in bytecode:")
ascii_str = ""
for b in code_bytes:
    if 32 <= b <= 126:
        ascii_str += chr(b)
    else:
        if len(ascii_str) > 1:
            print(f"  {ascii_str}")
        ascii_str = ""
if len(ascii_str) > 1:
    print(f"  {ascii_str}")

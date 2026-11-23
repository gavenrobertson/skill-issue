---
title: C-Style Strings
summary: Text as a char array ending in a null terminator. What string literals really are, the <cstring> functions and their dangers, and converting to and from std::string.
---

## Strings before `std::string`

C has no string type. Text is stored as an **array of `char`** with a special **null terminator**
character `'\0'` (code 0) marking where the text ends. This is a **C-style string** (or *C string*,
or *null-terminated string*). C++ inherited them, and you'll still meet them: string literals are C
strings, `argv` holds C strings, and many libraries and operating-system APIs take them.

```cpp run
#include <iostream>

int main() {
    char name[] = "Ada";            // 4 chars: 'A', 'd', 'a', '\0'
    char same[] = {'A', 'd', 'a', '\0'};
    char buffer[10] = "hi";         // 'h', 'i', then eight '\0's

    std::cout << name << ' ' << same << ' ' << buffer << '\n';
    std::cout << sizeof(name) << '\n';    // 4: the terminator takes a byte

    name[0] = 'E';                        // a char array is modifiable
    std::cout << name << '\n';

    buffer[1] = '\0';                     // cut the string short
    std::cout << buffer << '\n';
}
```

```output
Ada Ada hi
4
Eda
h
```

When you print a `char` array (or a `char*`), `std::cout` prints characters **until it finds a
`'\0'`**. The array's actual size doesn't matter; only the terminator does. That's the central idea,
and the source of most C-string bugs.

> **Pitfall:** `char bad[] = {'A', 'd', 'a'};` is an array of 3 chars, **not** a string: there's no
> terminator. Printing it reads past the end looking for a `'\0'`: undefined behavior.

## What a string literal really is

The literal `"hello"` is an array of **`const char[6]`**: five letters plus the terminator, stored in
read-only memory for the whole program. Like any array, it decays to a pointer to its first
character, a `const char*`:

```cpp run
#include <iostream>

int main() {
    std::cout << sizeof("hello") << '\n';   // 6: includes the '\0'

    const char* greeting = "hello";         // pointer to the literal's first char
    std::cout << greeting << ' ' << greeting[1] << '\n';

    const char* names[] = {"Ada", "Grace", "Linus"};   // array of pointers to literals
    for (const char* n : names) {
        std::cout << n << ' ';
    }
    std::cout << '\n';
}
```

```output
6
hello e
Ada Grace Linus
```

Since the literal is `const`, you must not modify it. Pointing a non-const `char*` at it is not
allowed in modern C++ (GCC warns: `ISO C++ forbids converting a string constant to 'char*'`), and
writing through such a pointer is undefined behavior, often a crash. If you need a modifiable copy,
use `char s[] = "hello";` (which copies the literal into your own array) or, better, `std::string`.

```cpp
char* p = "hello";        // ill-formed in C++11 and later
p[0] = 'j';               // UB: modifying a string literal

char s[] = "hello";       // fine: s is your own array, initialized from the literal
s[0] = 'j';               // fine: "jello"
```

## The `<cstring>` functions

C strings can't use `=`, `+` or `==` meaningfully (they're arrays), so C provides functions in
`<cstring>`:

| Function | Does |
| --- | --- |
| `std::strlen(s)` | number of chars before the `'\0'` (counts by walking the string) |
| `std::strcpy(dest, src)` | copies `src` (with terminator) into `dest` |
| `std::strcat(dest, src)` | appends `src` to the end of `dest` |
| `std::strcmp(a, b)` | compares: negative if `a < b`, `0` if equal, positive if `a > b` |
| `std::strchr(s, c)` | pointer to the first `c` in `s`, or null |
| `std::strstr(s, sub)` | pointer to the first occurrence of `sub` in `s`, or null |

```cpp run
#include <cstring>
#include <iostream>

int main() {
    char buffer[32];                           // must be big enough for everything below!
    std::strcpy(buffer, "Hello");
    std::strcat(buffer, ", ");
    std::strcat(buffer, "World");
    std::cout << buffer << " (" << std::strlen(buffer) << " chars)\n";

    std::cout << std::strcmp("apple", "apple") << '\n';     // 0: equal
    std::cout << (std::strcmp("apple", "banana") < 0) << '\n';   // 1: "apple" comes first

    if (std::strcmp(buffer, "Hello, World") == 0) {
        std::cout << "match\n";
    }
}
```

```output
Hello, World (12 chars)
0
1
match
```

### Why they're dangerous

- **No bounds checking.** `strcpy` and `strcat` write as many characters as the source has. If the
  destination is too small, they write past its end: a **buffer overflow**, undefined behavior, and
  historically one of the most exploited security bugs in software.
- **`strcmp` doesn't return a bool.** `if (std::strcmp(a, b))` is true when the strings are
  **different**. Always compare the result with `0`.
- **`strlen` is slow on long strings**: it walks every character each time you call it. Calling it in
  a loop condition can turn a linear loop quadratic.
- **A missing terminator** makes every one of these functions run off the end of the array.
- "Safer" variants like `strncpy` have their own traps (it may leave the result unterminated).

### `==` doesn't compare text

Comparing two C strings with `==` compares **addresses**, not characters:

```cpp
char a[] = "hi";
char b[] = "hi";
if (a == b) { }              // false: two different arrays (and deprecated in C++20)

const char* p = "hi";
if (p == "hi") { }           // unspecified: depends on whether the compiler merged the literals
if (std::strcmp(p, "hi") == 0) { }   // correct for C strings
```

With `std::string`, `==` just works, which is one of many reasons to prefer it.

## Converting between `std::string` and C strings

**C string to `std::string`**: just initialize or assign. `std::string` copies the characters up to
the terminator. Mixing them with `+` and `==` works as long as one side is a `std::string`.

**`std::string` to C string**: `.c_str()` returns a `const char*` to a null-terminated copy of the
contents, for passing to functions that expect C strings. (`.data()` does the same since C++11.)

```cpp run
#include <cstring>
#include <iostream>
#include <string>

void printC(const char* text) {          // a C-style API
    std::cout << "[" << text << "] length " << std::strlen(text) << '\n';
}

int main() {
    const char* raw = "from C";
    std::string s = raw;                 // C string -> std::string
    s += " to C++";
    std::cout << s << '\n';

    printC(s.c_str());                   // std::string -> const char*

    char buffer[] = "array";
    std::string t(buffer);               // works for char arrays too
    std::cout << std::boolalpha << (t == "array") << '\n';   // std::string == C string compares text
}
```

```output
from C to C++
[from C to C++] length 13
true
```

> **Warning:** The pointer from `.c_str()` belongs to the string. It becomes **dangling** when the
> string is destroyed or modified. `const char* p = (a + b).c_str();` is a bug: the temporary string
> `a + b` dies at the end of that line, leaving `p` pointing at freed memory.

## When to use C strings

Mostly: **don't**, except when an API requires them (`.c_str()` covers that) or for string
literals and `argv`. Use `std::string` for text you build, store or modify, and `std::string_view`
(next lesson) to accept text without copying it.

:::quiz
How many bytes does `char word[] = "code";` occupy?

- [ ] 4
- [x] 5
- [ ] 8
- [ ] It depends on the compiler

Four letters plus the null terminator `'\0'`.
:::

:::quiz
`std::strcmp(a, b)` returns `0`. What does that mean?

- [ ] `a` is less than `b`
- [x] The strings are equal
- [ ] The comparison failed
- [ ] `a` is empty

`strcmp` returns 0 for equal, negative if `a` sorts first, positive if `b` sorts first. So `if (strcmp(a, b))` means "if different".
:::

:::exercise Write your own strlen
Write `std::size_t myStrlen(const char* s)` that counts the characters before the null terminator, by
walking the string until `s[i] == '\0'`. Read words until the end of input and, for each, call
`myStrlen(word.c_str())` and print `word: LENGTH`. Don't use `std::strlen` or `.size()`.

**Input:** zero or more words.
**Output:** one line per word.

```cpp starter
#include <iostream>
#include <string>

std::size_t myStrlen(const char* s) {
    return 0;
}

int main() {
    std::string word;
    while (std::cin >> word) {
        std::cout << word << ": " << myStrlen(word.c_str()) << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <string>

std::size_t myStrlen(const char* s) {
    std::size_t n = 0;
    while (s[n] != '\0') {
        ++n;
    }
    return n;
}

int main() {
    std::string word;
    while (std::cin >> word) {
        std::cout << word << ": " << myStrlen(word.c_str()) << '\n';
    }
}
```

```hint
Start a counter at 0 and keep incrementing it while `s[n] != '\0'`.
```

```stdin
hello C++ a
```

```expected
hello: 5
C++: 3
a: 1
```

```stdin
supercalifragilisticexpialidocious
```

```expected hidden
supercalifragilisticexpialidocious: 34
```

```checks
must '\\0' :: Stop at the null terminator '\0'.
mustnot \bstrlen\s*\(|\.size\s*\(|\.length\s*\( :: Count the characters yourself.
must c_str\s*\(\s*\) :: Pass the word as a C string with .c_str().
```
:::

:::exercise Compare like strcmp
Write `int compareC(const char* a, const char* b)` that compares two C strings character by
character and returns `-1` if `a` comes first, `0` if they're equal, or `1` if `b` comes first
(compare character codes; a string that is a prefix of the other comes first). Read pairs of words
until the end of input and print the result for each pair.

**Input:** pairs of words.
**Output:** one number per pair: `-1`, `0` or `1`.

```cpp starter
#include <iostream>
#include <string>

int compareC(const char* a, const char* b) {
    return 0;
}

int main() {
    std::string x, y;
    while (std::cin >> x >> y) {
        std::cout << compareC(x.c_str(), y.c_str()) << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <string>

int compareC(const char* a, const char* b) {
    std::size_t i = 0;
    while (a[i] != '\0' && a[i] == b[i]) {
        ++i;
    }
    if (a[i] == b[i]) return 0;          // both reached '\0' together
    return (static_cast<unsigned char>(a[i]) < static_cast<unsigned char>(b[i])) ? -1 : 1;
}

int main() {
    std::string x, y;
    while (std::cin >> x >> y) {
        std::cout << compareC(x.c_str(), y.c_str()) << '\n';
    }
}
```

```hint
Advance while the characters match and you haven't hit `'\0'`. Then the first differing characters decide.
```

```hint
A prefix works out naturally: its `'\0'` (code 0) is smaller than any letter.
```

```stdin
apple banana
same same
zoo apple
```

```expected
-1
0
1
```

```stdin
app apple
apple app
Zebra apple
```

```expected hidden
-1
1
-1
```

```checks
mustnot strcmp|compare\s*\( :: Compare the characters yourself.
```
:::

:::exercise Reverse in a buffer
Read one word (at most 30 characters). Copy it **character by character** into a C array
`char buffer[32]`, add the null terminator yourself, then reverse the characters in place inside the
buffer and print it with `std::cout << buffer`.

**Input:** one word.
**Output:** the reversed word.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string word;
    std::cin >> word;
    char buffer[32];
    buffer[0] = '\0';
    std::cout << buffer << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string word;
    std::cin >> word;
    char buffer[32];
    std::size_t n = word.size();
    for (std::size_t i = 0; i < n; ++i) {
        buffer[i] = word[i];
    }
    buffer[n] = '\0';

    for (std::size_t i = 0; i < n / 2; ++i) {
        char tmp = buffer[i];
        buffer[i] = buffer[n - 1 - i];
        buffer[n - 1 - i] = tmp;
    }
    std::cout << buffer << '\n';
}
```

```hint
After copying `n` characters, set `buffer[n] = '\0';` so `std::cout` knows where to stop.
```

```hint
Swap `buffer[i]` with `buffer[n - 1 - i]` for the first half.
```

```stdin
stressed
```

```expected
desserts
```

```stdin
x
```

```expected hidden
x
```

```stdin
abcdefghijklmnopqrstuvwxyz1234
```

```expected hidden
4321zyxwvutsrqponmlkjihgfedcba
```

```checks
must char\s+buffer\s*\[\s*32\s*\] :: Use the C array char buffer[32].
must '\\0' :: Add the null terminator '\0' yourself.
mustnot strcpy|reverse :: Copy and reverse the characters yourself.
```
:::

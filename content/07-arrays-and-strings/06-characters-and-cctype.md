---
title: Characters & <cctype>
summary: A char is a small integer. Character codes, ASCII arithmetic tricks, classifying and converting characters with <cctype>, and the unsigned char gotcha.
---

## A `char` is a number

A `char` is a 1-byte integer type. What makes it a *character* is how it's printed: `std::cout`
shows the symbol whose **character code** it holds. Almost every system uses **ASCII** codes for the
basic characters (and UTF-8, which extends ASCII, for everything else).

```cpp run
#include <iostream>

int main() {
    char c = 'A';
    std::cout << c << '\n';                     // printed as a character: A
    std::cout << static_cast<int>(c) << '\n';   // the code: 65
    std::cout << +c << '\n';                    // unary + promotes to int too: 65

    char d = 97;                                // a char can be set from a number
    std::cout << d << '\n';                     // a
}
```

```output
A
65
65
a
```

The parts of the ASCII table worth remembering:

| Characters | Codes | Notes |
| --- | --- | --- |
| `'0'` to `'9'` | 48 to 57 | consecutive |
| `'A'` to `'Z'` | 65 to 90 | consecutive |
| `'a'` to `'z'` | 97 to 122 | consecutive, 32 more than uppercase |
| `' '` (space) | 32 | |
| `'\n'` (newline) | 10 | |
| `'\0'` (null) | 0 | ends C strings |

You never need to memorize the numbers. What matters is that digits and letters are **consecutive**,
which enables some very handy arithmetic.

> **Note:** `'A'` (single quotes) is a `char`. `"A"` (double quotes) is a string literal: an array of
> two chars, `'A'` and `'\0'`. They're not interchangeable.

## Character arithmetic

When you do arithmetic on a `char`, it's promoted to `int` first, so the result is an `int`. Cast or
assign it back to `char` to get a character again:

```cpp run
#include <iostream>

int main() {
    char c = 'a';
    std::cout << c + 1 << '\n';                     // int: 98
    std::cout << static_cast<char>(c + 1) << '\n';  // char: b

    // digit character <-> digit value
    char digit = '7';
    int value = digit - '0';                        // '7' - '0' == 55 - 48 == 7
    char back = static_cast<char>('0' + 4);         // 48 + 4 == 52 == '4'
    std::cout << value * 2 << ' ' << back << '\n';

    // letter <-> position in the alphabet (0-based)
    char letter = 'e';
    int pos = letter - 'a';                         // 4
    char upper = static_cast<char>('A' + pos);      // 'E'
    std::cout << pos << ' ' << upper << '\n';

    // ranges and comparisons work because codes are ordered
    char x = 'q';
    if (x >= 'a' && x <= 'z') {
        std::cout << x << " is a lowercase letter\n";
    }

    // looping over characters
    for (char ch = 'a'; ch <= 'e'; ++ch) {
        std::cout << ch;
    }
    std::cout << '\n';
}
```

```output
98
b
14 4
4 E
q is a lowercase letter
abcde
```

The idioms `c - '0'` (digit char to its value) and `c - 'a'` (letter to its index 0 to 25) are used
constantly. Note `'7' - '0'` is the *number* 7, while `'7'` itself is the code 55.

> **Pitfall:** `int n = '7';` makes `n` equal to 55, not 7. Reading a digit character as a number
> needs the `- '0'`.

## `<cctype>`: classifying characters

Writing `c >= 'a' && c <= 'z'` everywhere gets tedious. The `<cctype>` header has ready-made tests:

| Function | True for |
| --- | --- |
| `std::isalpha(c)` | letters `a-z`, `A-Z` |
| `std::isdigit(c)` | digits `0-9` |
| `std::isalnum(c)` | letters or digits |
| `std::isspace(c)` | whitespace: space, `\t`, `\n`, `\r`, `\v`, `\f` |
| `std::isupper(c)` / `std::islower(c)` | uppercase / lowercase letters |
| `std::ispunct(c)` | punctuation: `!`, `,`, `.`, `?`, `@`, ... |
| `std::isxdigit(c)` | hex digits `0-9`, `a-f`, `A-F` |

And two converters:

| Function | Returns |
| --- | --- |
| `std::toupper(c)` | the uppercase version if `c` is a lowercase letter, otherwise `c` unchanged |
| `std::tolower(c)` | the lowercase version if `c` is an uppercase letter, otherwise `c` unchanged |

```cpp run
#include <cctype>
#include <iostream>
#include <string>

int main() {
    std::string text = "Hi there, R2-D2! 42";
    int letters = 0, digits = 0, spaces = 0, punct = 0;

    for (char c : text) {
        unsigned char uc = static_cast<unsigned char>(c);   // see the gotcha below
        if (std::isalpha(uc)) ++letters;
        else if (std::isdigit(uc)) ++digits;
        else if (std::isspace(uc)) ++spaces;
        else if (std::ispunct(uc)) ++punct;
    }
    std::cout << letters << " letters, " << digits << " digits, "
              << spaces << " spaces, " << punct << " punctuation\n";

    std::string shout = text;
    for (char& c : shout) {
        c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
    }
    std::cout << shout << '\n';
}
```

```output
9 letters, 4 digits, 3 spaces, 3 punctuation
HI THERE, R2-D2! 42
```

### Two quirks of the C heritage

These functions come from C, and it shows:

1. **The `is...` functions return an `int`, not a `bool`**: zero for false, and *some* non-zero value
   for true (not necessarily 1). Use them in conditions, and don't compare with `== 1` or print them
   expecting `1`.
2. **`toupper`/`tolower` take and return `int`**, so printing the result directly prints a number.
   Cast back to `char`:

```cpp run
#include <cctype>
#include <iostream>

int main() {
    char c = 'g';
    std::cout << std::toupper(c) << '\n';                      // 71: an int!
    std::cout << static_cast<char>(std::toupper(c)) << '\n';   // G
    std::cout << std::boolalpha << static_cast<bool>(std::isdigit('5')) << '\n';
}
```

```output
71
G
true
```

## The `unsigned char` gotcha

Whether plain `char` is signed or unsigned depends on the platform. On x86 (most PCs) it's
**signed**, from -128 to 127. Characters outside ASCII, like the bytes of `é` in UTF-8, have codes
above 127, so they're stored as **negative** numbers.

The `<cctype>` functions require their argument to be representable as an `unsigned char` (or be
`EOF`). Passing a negative `char` is **undefined behavior**; some implementations crash. The safe
pattern is to cast first:

```cpp
std::isalpha(static_cast<unsigned char>(c))     // correct for any char
std::isalpha(c)                                 // UB if c is negative (non-ASCII text)
```

Pure-ASCII input (like this site's exercises) works either way, but the cast is the habit to build.

> **Note:** `std::string` stores **bytes**, not "letters". In UTF-8, `é` is two bytes and an emoji is
> four, so `size()` counts bytes and `<cctype>` only understands ASCII. Proper Unicode text processing
> needs a library such as ICU.

## Case-insensitive comparison

There's no built-in case-insensitive `==` for strings. Compare lowercase versions character by
character:

```cpp run
#include <cctype>
#include <iostream>
#include <string>

bool equalsIgnoreCase(const std::string& a, const std::string& b) {
    if (a.size() != b.size()) {
        return false;
    }
    for (std::size_t i = 0; i < a.size(); ++i) {
        if (std::tolower(static_cast<unsigned char>(a[i])) !=
            std::tolower(static_cast<unsigned char>(b[i]))) {
            return false;
        }
    }
    return true;
}

int main() {
    std::cout << std::boolalpha << equalsIgnoreCase("Hello", "hELLO") << ' '
              << equalsIgnoreCase("Hello", "Help!") << '\n';
}
```

```output
true false
```

:::quiz
What does `std::cout << '5' - '0' + 1;` print?

- [ ] `51`
- [x] `6`
- [ ] `'6'`
- [ ] `54`

`'5' - '0'` is the int 5, plus 1 is 6. The result is an `int`, so it prints as a number.
:::

:::quiz
Why write `std::isalpha(static_cast<unsigned char>(c))` instead of `std::isalpha(c)`?

- [ ] It's faster
- [x] Passing a negative `char` value (e.g. a non-ASCII byte) to `<cctype>` functions is undefined behavior
- [ ] `std::isalpha` only accepts `unsigned char` parameters, so the other version doesn't compile
- [ ] It makes the result a `bool`

On platforms where `char` is signed, bytes above 127 become negative. The functions take an `int`
that must be an `unsigned char` value or `EOF`.
:::

:::exercise Digit sum in text {easy}
Read one line of text and print the sum of all the digit characters in it. Use `std::isdigit` to find
them and `c - '0'` to get each digit's value.

**Input:** one line of text (may be empty).
**Output:** the sum of its digits, then a newline.

```cpp starter
#include <cctype>
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::cout << 0 << '\n';
}
```

```cpp solution
#include <cctype>
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    int sum = 0;
    for (char c : line) {
        if (std::isdigit(static_cast<unsigned char>(c))) {
            sum += c - '0';
        }
    }
    std::cout << sum << '\n';
}
```

```hint
`'7' - '0'` is the number 7.
```

```stdin
a1b2c3
```

```expected
6
```

```stdin
no digits here
```

```expected hidden
0
```

```stdin
R2-D2 and C-3PO, 1977
```

```expected hidden
31
```

```stdin
```

```expected hidden
0
```

```stdin
9999999999
```

```expected hidden
90
```

```checks
must isdigit :: Use std::isdigit to find the digits.
must -\s*'0' :: Convert each digit character with c - '0'.
```
:::

:::exercise Title case {medium}
Read one line and convert it to title case: the first letter of every word becomes uppercase and all
other letters become lowercase. A word starts at the beginning of the line or right after a space.
Everything else stays as it is.

**Input:** one line of text.
**Output:** the converted line.

```cpp starter
#include <cctype>
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::cout << line << '\n';
}
```

```cpp solution
#include <cctype>
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    bool startOfWord = true;
    for (char& c : line) {
        unsigned char uc = static_cast<unsigned char>(c);
        if (startOfWord) {
            c = static_cast<char>(std::toupper(uc));
        } else {
            c = static_cast<char>(std::tolower(uc));
        }
        startOfWord = (c == ' ');
    }
    std::cout << line << '\n';
}
```

```hint
Loop with `for (char& c : line)` and keep a `bool` that says whether the previous character was a space.
```

```hint
`std::toupper` returns an `int`; cast it back with `static_cast<char>(...)`.
```

```stdin
hello wORLD from c++
```

```expected
Hello World From C++
```

```stdin
ALREADY  Two  spaces
```

```expected hidden
Already  Two  Spaces
```

```stdin
x
```

```expected hidden
X
```

```stdin
  3RD place, ok?  yES
```

```expected hidden
  3rd Place, Ok?  Yes
```

```checks
must toupper :: Use std::toupper.
must tolower :: Use std::tolower.
```
:::

:::exercise Caesar cipher {hard}
Read a shift `k` and then a line of text (on the next line). Shift every letter `k` places through the
alphabet, wrapping around between `z` and `a`, and keep its case. Non-letters stay unchanged. A
**negative** `k` shifts backwards (that's how you decrypt), and `|k|` can be as large as 10^9.

For example, with `k = 3`, `xyz` becomes `abc` and `Hi!` becomes `Kl!`; with `k = -1`, `abc` becomes `zab`.

**Input:** an integer `k`, then a line of text.
**Output:** the shifted line.

```cpp starter
#include <cctype>
#include <iostream>
#include <string>

int main() {
    int k;
    std::cin >> k;
    // read the line of text, shift its letters, print it
}
```

```cpp solution
#include <cctype>
#include <iostream>
#include <string>

// k must already be in 0..25
char shift(char c, int k) {
    unsigned char uc = static_cast<unsigned char>(c);
    if (std::islower(uc)) {
        return static_cast<char>('a' + (c - 'a' + k) % 26);
    }
    if (std::isupper(uc)) {
        return static_cast<char>('A' + (c - 'A' + k) % 26);
    }
    return c;
}

int main() {
    int k;
    std::cin >> k;
    std::string line;
    std::getline(std::cin >> std::ws, line);
    k %= 26;             // now -25..25
    if (k < 0) {
        k += 26;         // shifting back by 1 is shifting forward by 25
    }
    for (char& c : line) {
        c = shift(c, k);
    }
    std::cout << line << '\n';
}
```

```hint
After `std::cin >> k;` the newline is still waiting. Read the text with
`std::getline(std::cin >> std::ws, line);`.
```

```hint
For a lowercase letter: its index is `c - 'a'`; add `k`, wrap with `% 26`, and add `'a'` back.
```

```hint
Normalize `k` once before the loop: `k %= 26;` leaves a value from -25 to 25 (C++'s `%` keeps the sign),
so add 26 if it's negative. Then every shift is forward by 0 to 25.
```

```stdin
3
Hello, World! xyz
```

```expected
Khoor, Zruog! abc
```

```stdin
-1
abc XYZ
```

```expected
zab WXY
```

```stdin
26
Same Text 123
```

```expected hidden
Same Text 123
```

```stdin
53
Zz
```

```expected hidden
Aa
```

```stdin
-27
Hello
```

```expected hidden
Gdkkn
```

```stdin
1000000000
Az
```

```expected hidden
Ml
```

```stdin
-1000000000
Ml, 42!
```

```expected hidden
Az, 42!
```

```checks
must islower|isupper|isalpha :: Use the <cctype> functions to classify letters.
```
:::

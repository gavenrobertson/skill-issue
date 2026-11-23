---
title: Literals
summary: Values written directly in code. Integer literals in four bases with suffixes and digit separators, floating literals, characters and escapes, string literals of every kind, bool and nullptr.
---

A **literal** is a value written directly in your source code: `42`, `3.14`, `'x'`, `"hello"`, `true`.
Every literal has a **type**, decided by how you write it. This lesson covers every form.

## Integer literals: four bases

You can write a whole number in four number systems. They all produce the **same kind of value**; only
the spelling differs:

| Form | Prefix | Digits | Example | Value |
| --- | --- | --- | --- | --- |
| Decimal | none | 0-9 | `42` | 42 |
| Hexadecimal | `0x` or `0X` | 0-9, a-f (or A-F) | `0x2A` | 42 |
| Octal | `0` | 0-7 | `052` | 42 |
| Binary (C++14) | `0b` or `0B` | 0-1 | `0b101010` | 42 |

```cpp run
#include <iostream>

int main() {
    int dec = 42;
    int hex = 0x2A;
    int oct = 052;
    int bin = 0b101010;
    std::cout << dec << ' ' << hex << ' ' << oct << ' ' << bin << '\n';

    std::cout << 0xFF << ' ' << 0xff << ' ' << 0b1111'1111 << '\n';
}
```

```output
42 42 42 42
255 255 255
```

`std::cout` always prints in decimal unless you tell it otherwise with the manipulators `std::hex`,
`std::oct` and `std::dec`. `std::showbase` adds the `0x`/`0` prefix:

```cpp run
#include <iostream>

int main() {
    int n = 255;
    std::cout << std::hex << n << '\n';                    // ff
    std::cout << std::oct << n << '\n';                    // 377
    std::cout << std::showbase << std::hex << n << '\n';   // 0xff
    std::cout << std::dec << n << '\n';                    // back to decimal (showbase has no effect)
}
```

```output
ff
377
0xff
255
```

These manipulators are **sticky**: they stay in effect until you change them.

> **Pitfall:** A leading zero means **octal**. `int zip = 01234;` is 668, not 1234, and `09` doesn't
> compile at all (9 is not an octal digit). Never pad decimal numbers with zeros.

```cpp compile-error
int main() {
    int month = 09;   // error: invalid digit "9" in octal constant
}
```

## Digit separators

Long numbers are hard to read. Since C++14 you can put a single quote `'` **between digits** anywhere
you like. The compiler ignores it:

```cpp run
#include <iostream>

int main() {
    long long population = 8'100'000'000;
    int mask = 0b1010'0101;
    int color = 0xFF'80'00;
    std::cout << population << ' ' << mask << ' ' << color << '\n';
}
```

```output
8100000000 165 16744448
```

The separator can't start or end the number, and two can't be adjacent (`1''000` is an error).

## Integer suffixes and literal types

An unsuffixed decimal literal has type `int` if it fits, otherwise `long`, otherwise `long long`.
**Suffixes** request a specific type (upper or lower case, in any order):

| Suffix | Type | Example |
| --- | --- | --- |
| none | `int` (or bigger if needed) | `42` |
| `u` / `U` | `unsigned int` | `42u` |
| `l` / `L` | `long` | `42L` |
| `ll` / `LL` | `long long` | `42LL` |
| `ul`, `lu` / `UL` | `unsigned long` | `42UL` |
| `ull` / `ULL` | `unsigned long long` | `42ULL` |
| `z` / `Z` (C++23) | signed version of `std::size_t` | `42z` |
| `uz` / `UZ` (C++23) | `std::size_t` | `42uz` |

```cpp run
#include <iostream>

int main() {
    std::cout << sizeof(42) << ' ' << sizeof(42L) << ' ' << sizeof(42LL) << '\n';
    std::cout << 4'000'000'000u << '\n';
    std::cout << 3'000'000'000LL * 3 << '\n';   // long long math: no overflow
}
```

```output
4 8 8
4000000000
9000000000
```

> **Tip:** Prefer uppercase `L`: `10l` looks a lot like `101`. The `z`/`uz` suffixes are C++23, so
> GCC accepts them in C++20 mode only with a warning.

There are **no negative literals**. `-5` is the unary minus operator applied to the literal `5`.

## Floating-point literals

A number with a decimal point or an exponent is a floating-point literal, of type **`double`** by default:

```cpp run
#include <iostream>

int main() {
    std::cout << 1.5 << ' ' << .5 << ' ' << 5. << '\n';           // point forms
    std::cout << 1e9 << ' ' << 1.5e-3 << ' ' << 2.5E2 << '\n';    // scientific: e means "times 10 to the"
    std::cout << sizeof(1.5f) << ' ' << sizeof(1.5) << ' ' << sizeof(1.5L) << '\n';  // float, double, long double
    std::cout << 0x1.8p1 << '\n';                                 // hexadecimal float
    std::cout << 1'000.000'1 << '\n';                             // separators work here too
}
```

```output
1.5 0.5 5
1e+09 0.0015 250
4 8 16
3
1000
```

| Form | Meaning | Type |
| --- | --- | --- |
| `3.14`, `.5`, `5.` | decimal point | `double` |
| `1e9`, `6.02e23`, `1.5E-3` | `e` exponent: × 10ⁿ | `double` |
| `1.5f`, `1.5F` | `f` suffix | `float` |
| `1.5L` | `L` suffix | `long double` |
| `0x1.8p1` (C++17) | hex digits, `p` exponent: × 2ⁿ | `double` |

`0x1.8p1` is (1 + 8/16) × 2¹ = 3. Hex floats let you write an exact binary value; you'll rarely need them.
Note the last line printed `1000`: `1000.0001` has 8 significant digits, and `std::cout` shows only 6 by default.

> **Pitfall:** `1e9` is a `double`, not an `int`. And `5` is an `int` while `5.0` is a `double`.
> That difference decides whether `/` does integer or floating division (see **Operators**).

Without the `f`, `float f = 0.1;` creates a `double` first and then converts it to `float`. That
works, but say what you mean: `float f = 0.1f;`.

## Character literals

A character literal is **one character in single quotes**. Special characters use **escape sequences**:

| Escape | Meaning | Escape | Meaning |
| --- | --- | --- | --- |
| `\n` | newline | `\\` | backslash |
| `\t` | tab | `\'` | single quote |
| `\r` | carriage return | `\"` | double quote |
| `\0` | null character (code 0) | `\a` | alert (beep) |
| `\x41` | hex code (here 0x41 = `A`) | `\101` | octal code (here 65 = `A`) |

```cpp run
#include <iostream>

int main() {
    char a = 'A';
    char hexA = '\x41';
    char octA = '\101';
    char quote = '\'';
    char dquote = '"';          // a double quote needs no escape inside single quotes
    std::cout << a << hexA << octA << ' ' << quote << dquote << '\n';
    std::cout << "tab:[\t]\n";
}
```

```output
AAA '"
tab:[	]
```

Prefixes select other character types: `u8'a'` (`char8_t`, C++20), `u'a'` (`char16_t`),
`U'a'` (`char32_t`), `L'a'` (`wchar_t`).

> **Pitfall:** `'ab'` (two characters in single quotes) is a *multicharacter literal*: an `int` with
> an implementation-defined value. GCC warns about it. You almost certainly meant `"ab"`.

```cpp compile-error
int main() {
    char c = '';   // error: empty character constant
}
```

## String literals

A string literal is **text in double quotes**. Its type is an array of `const char` with an extra
hidden `'\0'` at the end marking where it stops. So `"hi"` occupies **3** bytes: `h`, `i`, `\0`.

```cpp run
#include <iostream>

int main() {
    std::cout << sizeof("hi") << '\n';            // 3: two letters + the '\0' terminator

    // Adjacent literals are concatenated by the compiler
    std::cout << "Hello, " "World" "!\n";

    // Useful to split long text across lines
    std::cout << "This is a long sentence that we split "
                 "over two lines in the source code.\n";

    // Raw string: backslashes and quotes are NOT special
    std::cout << R"(C:\new\folder "quoted")" << '\n';

    // Raw string with a custom delimiter, for text that contains )"
    std::cout << R"xyz(a raw string with )" inside)xyz" << '\n';

    // Raw strings can span lines; the newline is part of the string
    std::cout << R"(line one
line two)" << '\n';
}
```

```output
3
Hello, World!
This is a long sentence that we split over two lines in the source code.
C:\new\folder "quoted"
a raw string with )" inside
line one
line two
```

| Form | Meaning |
| --- | --- |
| `"text"` | ordinary string: array of `const char` |
| `"a" "b"` | concatenated to `"ab"` at compile time |
| `R"(text)"` | raw string: no escapes are processed |
| `R"delim(text)delim"` | raw string with a custom delimiter (up to 16 characters) |
| `u8"text"` | UTF-8 string: array of `const char8_t` (C++20) |
| `u"text"`, `U"text"`, `L"text"` | UTF-16, UTF-32, wide strings |
| `"text"s` | a `std::string` object (needs `using namespace std::string_literals;`) |
| `"text"sv` | a `std::string_view` (needs `using namespace std::string_view_literals;`) |

Since C++20, `u8"..."` has type `const char8_t[]`, and `std::cout` refuses to print it:

```cpp compile-error
#include <iostream>

int main() {
    std::cout << u8"hello";   // error: use of deleted function 'operator<<(..., const char8_t*)'
}
```

Plain `"..."` literals in GCC are already UTF-8 encoded, so `std::cout << "café"` works fine.

> **Pitfall:** `'A'` and `"A"` are different things. `'A'` is a single `char`; `"A"` is an array of two
> `char`s (`A` and `\0`). `char c = "A";` doesn't compile.

```cpp compile-error
int main() {
    char c = "A";   // error: invalid conversion from 'const char*' to 'char'
}
```

## Boolean literals and nullptr

`true` and `false` are the two literals of type `bool`. `nullptr` (C++11) is the literal for a
**null pointer**: a pointer that points at nothing. Its type is `std::nullptr_t`. You'll use it in the
pointers module; older code uses `NULL` or `0` instead, which is error-prone.

```cpp run
#include <iostream>

int main() {
    bool yes = true;
    bool no = false;
    int* nowhere = nullptr;     // a pointer to int that points at nothing
    std::cout << yes << no << ' ' << std::boolalpha << yes << ' ' << no << '\n';
    std::cout << (nowhere == nullptr) << '\n';
}
```

```output
10 true false
true
```

:::quiz
Which of these literals equal the number 10? (select all that apply)

- [x] `0xA`
- [x] `012`
- [x] `0b1010`
- [ ] `010`
- [x] `1'0`

`0xA` is hex 10, `012` is octal 10 (8 + 2), `0b1010` is binary 10, and `1'0` is just `10` with a digit
separator. `010` is octal, which is 8.
:::

:::quiz
What is the type of the literal `2.5`?

- [ ] `float`
- [x] `double`
- [ ] `long double`
- [ ] `int`

Floating literals are `double` unless suffixed: `2.5f` is a `float`, `2.5L` a `long double`.
:::

:::quiz
What does `sizeof("abc")` evaluate to?

- [ ] `3`
- [x] `4`
- [ ] `8`
- [ ] `1`

A string literal has a hidden null terminator `'\0'`, so `"abc"` is an array of 4 `char`s.
:::

:::exercise Three bases {easy}
Read a non-negative integer and print it in decimal, hexadecimal and octal, using the stream
manipulators `std::dec`, `std::hex` and `std::oct` (no `0x` prefix, lowercase hex digits).

**Input:** one integer `n` (0 ≤ n ≤ 2,000,000,000).
**Output:** three lines:

```
dec: <n in decimal>
hex: <n in hexadecimal>
oct: <n in octal>
```

For `255` that's `dec: 255`, `hex: ff`, `oct: 377`.

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << "dec: " << n << '\n';
    std::cout << "hex: " << n << '\n';
    std::cout << "oct: " << n << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << "dec: " << std::dec << n << '\n';
    std::cout << "hex: " << std::hex << n << '\n';
    std::cout << "oct: " << std::oct << n << '\n';
}
```

```hint
Put the manipulator into the stream right before the number: `std::cout << std::hex << n;`
```

```stdin
255
```

```expected
dec: 255
hex: ff
oct: 377
```

```stdin
0
```

```expected hidden
dec: 0
hex: 0
oct: 0
```

```stdin
2000000000
```

```expected hidden
dec: 2000000000
hex: 77359400
oct: 16715312000
```

```stdin
8
```

```expected hidden
dec: 8
hex: 8
oct: 10
```

```stdin
4095
```

```expected hidden
dec: 4095
hex: fff
oct: 7777
```

```checks
must std::hex :: Use std::hex.
must std::oct :: Use std::oct.
```
:::

:::exercise Millions {medium}
Read a number of millions `m` and print the full number. Write the constant one million **with
digit separators** (`1'000'000`), and make sure large answers don't overflow an `int` (use a suffix
or a 64-bit variable).

**Input:** one integer `m` (0 ≤ m ≤ 1,000,000).
**Output:** `m * 1000000`, newline. For `3` print `3000000`.

```cpp starter
#include <iostream>

int main() {
    int m = 0;
    std::cin >> m;
    std::cout << m << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int m = 0;
    std::cin >> m;
    std::cout << m * 1'000'000LL << '\n';
}
```

```hint
`1'000'000` is the same number as `1000000`, just easier to read.
```

```hint
`m * 1'000'000` is computed in `int` and overflows for `m = 5000`. The suffix `LL` makes the literal a `long long`, so the multiplication happens in `long long`.
```

```stdin
3
```

```expected
3000000
```

```stdin
0
```

```expected hidden
0
```

```stdin
5000
```

```expected hidden
5000000000
```

```stdin
1000000
```

```expected hidden
1000000000000
```

```checks
must 1'000'000 :: Write one million with digit separators: 1'000'000
```
:::

:::exercise Raw path {easy}
Read a user name (a single word) and print that user's Documents folder as a Windows path:

**Input:** a single word `name`.
**Output:** `C:\Users\<name>\Documents`, newline. For `ada` print `C:\Users\ada\Documents`.

Write the fixed parts of the path as **raw string literals** (`R"(...)"`), so you don't have to escape
the backslashes. (Read the name with `std::string name; std::cin >> name;`, which needs `#include <string>`.)

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string name;
    std::cin >> name;
    std::cout << "C:Users" << name << "Documents" << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string name;
    std::cin >> name;
    std::cout << R"(C:\Users\)" << name << R"(\Documents)" << '\n';
}
```

```hint
Inside `R"( ... )"` a backslash is just a backslash: `R"(C:\Users\)"`.
```

```stdin
ada
```

```expected
C:\Users\ada\Documents
```

```stdin
x
```

```expected hidden
C:\Users\x\Documents
```

```checks
must R" :: Use raw string literals for the path parts.
```
:::

:::exercise Mixed bases {hard}
A log file stores three counters in three different bases. Read them, convert them, and report their sum
in several bases.

The manipulators you used for output also work on **input**: `std::cin >> std::hex >> x;` reads `x`
as a hexadecimal number. And they are sticky on `std::cin` too.

**Input:** one line with three numbers: the first in **hexadecimal** (digits `0`-`9`, `a`-`f` or
`A`-`F`, no `0x` prefix), the second in **octal**, the third in **decimal**. Each value is between 0 and
2,147,483,647.
**Output:** four lines:

```
<first> <second> <third>
sum: <sum in decimal>
hex: 0x<sum in lowercase hexadecimal>
oct: 0<sum in octal>
```

The three values on the first line are printed in decimal. The `0x` and `0` prefixes are always
printed, even when the sum is 0. For `ff 17 10`:

```
255 15 10
sum: 280
hex: 0x118
oct: 0430
```

```cpp starter
#include <iostream>

int main() {
    long long first{}, second{}, third{};
    std::cin >> first >> second >> third;
    std::cout << first << ' ' << second << ' ' << third << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    long long first{}, second{}, third{};
    std::cin >> std::hex >> first >> std::oct >> second >> std::dec >> third;
    long long sum = first + second + third;
    std::cout << first << ' ' << second << ' ' << third << '\n';
    std::cout << "sum: " << sum << '\n';
    std::cout << "hex: 0x" << std::hex << sum << '\n';
    std::cout << "oct: 0" << std::oct << sum << '\n';
}
```

```hint
Switch the base right before each number: `std::cin >> std::hex >> first >> std::oct >> second ...`.
Because the manipulators are sticky, the third number is read in octal unless you switch back with `std::dec`.
```

```hint
The sum of three values up to 2,147,483,647 doesn't fit in an `int`. And `std::showbase` prints a zero
as plain `0`, without `0x`, so write the prefixes yourself.
```

```stdin
ff 17 10
```

```expected
255 15 10
sum: 280
hex: 0x118
oct: 0430
```

```stdin
10 10 10
```

```expected
16 8 10
sum: 34
hex: 0x22
oct: 042
```

```stdin
0 0 0
```

```expected hidden
0 0 0
sum: 0
hex: 0x0
oct: 00
```

```stdin
7FFFFFFF 17777777777 2147483647
```

```expected hidden
2147483647 2147483647 2147483647
sum: 6442450941
hex: 0x17ffffffd
oct: 057777777775
```

```stdin
aBc 0777 019
```

```expected hidden
2748 511 19
sum: 3278
hex: 0xcce
oct: 06316
```

```stdin
1 1 1
```

```expected hidden
1 1 1
sum: 3
hex: 0x3
oct: 03
```

```checks
must std::hex :: Read and print hexadecimal with std::hex.
must std::oct :: Read and print octal with std::oct.
```
:::

---
title: Fundamental Types
summary: The built-in types (integers, characters, bool, floating point, void), how big they are, their limits, fixed-width integers, and what happens on overflow.
---

C++ has a small set of **fundamental** (built-in) types. Everything else (strings, vectors, your own
classes) is built from them. Choosing the right type decides **how much memory** a value takes and
**which values** it can hold.

## Integer types

Integers are whole numbers: `-3`, `0`, `42`. There are four sizes:

| Type | Typical size | Typical range |
| --- | --- | --- |
| `short` | 2 bytes | -32,768 to 32,767 |
| `int` | 4 bytes | about ±2.1 billion |
| `long` | 8 bytes (Linux/macOS), 4 bytes (Windows) | |
| `long long` | 8 bytes | about ±9.2 × 10¹⁸ |

The standard only guarantees **minimum** sizes (`short` and `int` at least 16 bits, `long` at least 32,
`long long` at least 64) and that each is at least as big as the one before. Real sizes depend on
the platform. `int` is the "natural" size for the machine and the default choice for everyday numbers.

The full names are longer, and all of these spellings mean the same types:

```cpp
short s1;        short int s2;        signed short s3;      // all 'short'
int i1;          signed i2;           signed int i3;        // all 'int'
long l1;         long int l2;                               // all 'long'
long long ll1;   long long int ll2;                         // all 'long long'
```

### signed and unsigned

By default integers are **signed**: they can be negative. Put `unsigned` in front to get a type that
holds **only non-negative values** but goes twice as high:

```cpp
unsigned int u = 4000000000;   // fits: unsigned int goes up to 4,294,967,295
unsigned u2 = 7;               // 'unsigned' alone means 'unsigned int'
unsigned long long big = 18000000000000000000ULL;
```

| Type (4 bytes) | Range |
| --- | --- |
| `int` | -2,147,483,648 to 2,147,483,647 |
| `unsigned int` | 0 to 4,294,967,295 |

> **Tip:** Use plain (signed) `int` for ordinary arithmetic, even for things that "can't be negative"
> like ages. `unsigned` is for bit manipulation and sizes. Mixing signed and unsigned causes nasty
> surprises (see **Type Conversions**).

## Character types

`char` holds a **single character** like `'A'`, written in **single quotes**. Under the hood a `char`
is a tiny integer (1 byte) holding the character's code: in ASCII, `'A'` is 65, `'a'` is 97, `'0'` is 48.

```cpp run
#include <iostream>

int main() {
    char letter = 'A';
    char fromNumber = 66;           // the code for 'B'
    std::cout << letter << fromNumber << '\n';
    std::cout << letter + 0 << '\n';   // arithmetic turns it into an int: prints the code
}
```

```output
AB
65
```

`std::cout` prints a `char` as a character, not a number. The family of character types:

| Type | Size | Used for |
| --- | --- | --- |
| `char` | 1 | ordinary text. May be signed or unsigned, depending on the platform |
| `signed char`, `unsigned char` | 1 | tiny integers / raw bytes (distinct types from `char`!) |
| `char8_t` (C++20) | 1 | UTF-8 code units |
| `char16_t`, `char32_t` | 2, 4 | UTF-16 / UTF-32 code units |
| `wchar_t` | 4 on Linux, 2 on Windows | "wide" characters, mostly for Windows APIs |

You'll use plain `char` 99% of the time. The others matter when you deal with Unicode text.

## bool

`bool` has exactly two values: `true` and `false`. It's the result of comparisons like `x < 10`, and
it drives `if` and loops. By default `std::cout` prints them as `1` and `0`; the `std::boolalpha`
manipulator switches to words:

```cpp run
#include <iostream>

int main() {
    bool isRaining = true;
    bool isSunny = false;
    std::cout << isRaining << ' ' << isSunny << '\n';
    std::cout << std::boolalpha << isRaining << ' ' << isSunny << '\n';
}
```

```output
1 0
true false
```

## Floating-point types

For numbers with a fractional part, use **floating-point** types. They store a number in scientific
notation (a significand and an exponent, in binary), so they cover huge and tiny magnitudes, but with
**limited precision**:

| Type | Typical size | Precision | Max |
| --- | --- | --- | --- |
| `float` | 4 bytes | ~7 significant digits | ~3.4 × 10³⁸ |
| `double` | 8 bytes | ~15-16 significant digits | ~1.8 × 10³⁰⁸ |
| `long double` | 8, 12 or 16 bytes | ≥ `double` (18-19 digits on x86 Linux) | |

**`double` is the default choice.** Use `float` only to save memory in big arrays (graphics, games).

```cpp run
#include <iomanip>
#include <iostream>

int main() {
    float f = 1.0f / 3.0f;
    double d = 1.0 / 3.0;
    long double ld = 1.0L / 3.0L;

    std::cout << d << '\n';                      // default: 6 significant digits
    std::cout << std::setprecision(20);          // show more digits (from <iomanip>)
    std::cout << f << '\n' << d << '\n' << ld << '\n';
}
```

```output
0.333333
0.3333333432674407959
0.33333333333333331483
0.33333333333333333334
```

Notice the garbage digits after the 7th (`float`) or 16th (`double`) digit: that's where precision
runs out. Floating-point numbers are binary, so most decimal fractions (like `0.1`) **cannot be stored
exactly**. That is why `0.1 + 0.2` is not exactly `0.3`:

```cpp run
#include <iomanip>
#include <iostream>

int main() {
    std::cout << 0.1 + 0.2 << '\n';                           // rounded to 6 digits: looks fine
    std::cout << std::setprecision(17) << 0.1 + 0.2 << '\n';  // the truth
}
```

```output
0.3
0.30000000000000004
```

> **Warning:** Never use floating point for money. Store cents in an integer instead.

## void

`void` means **"no type"** / "nothing". You'll use it as the return type of functions that don't return
a value. You **cannot** create a variable of type `void`:

```cpp compile-error
int main() {
    void nothing;   // error: variable or field 'nothing' declared void
}
```

## sizeof: how many bytes?

The `sizeof` operator gives the size of a type or a variable **in bytes**. Its result has type
`std::size_t`. Parentheses are required around a type, optional around a variable:

```cpp run
#include <iostream>

int main() {
    int x = 0;
    std::cout << "char:        " << sizeof(char) << '\n';
    std::cout << "bool:        " << sizeof(bool) << '\n';
    std::cout << "short:       " << sizeof(short) << '\n';
    std::cout << "int:         " << sizeof(int) << '\n';
    std::cout << "long:        " << sizeof(long) << '\n';
    std::cout << "long long:   " << sizeof(long long) << '\n';
    std::cout << "float:       " << sizeof(float) << '\n';
    std::cout << "double:      " << sizeof(double) << '\n';
    std::cout << "long double: " << sizeof(long double) << '\n';
    std::cout << "wchar_t:     " << sizeof(wchar_t) << '\n';
    std::cout << "x:           " << sizeof x << '\n';     // no parentheses needed for a variable
}
```

```output
char:        1
bool:        1
short:       2
int:         4
long:        8
long long:   8
float:       4
double:      8
long double: 16
wchar_t:     4
x:           4
```

That's the output on 64-bit Linux with GCC (what this site uses). `sizeof(char)` is **always** 1;
everything else can differ on other platforms.

## Limits: std::numeric_limits and <climits>

Don't memorize ranges. Ask the compiler. The modern way is `std::numeric_limits<T>` from `<limits>`,
which works for every arithmetic type:

```cpp run
#include <iostream>
#include <limits>

int main() {
    std::cout << "int:       " << std::numeric_limits<int>::min() << " to "
              << std::numeric_limits<int>::max() << '\n';
    std::cout << "unsigned:  " << std::numeric_limits<unsigned int>::min() << " to "
              << std::numeric_limits<unsigned int>::max() << '\n';
    std::cout << "long long: " << std::numeric_limits<long long>::max() << '\n';
    std::cout << "short:     " << std::numeric_limits<short>::min() << '\n';
    std::cout << "double:    " << std::numeric_limits<double>::max() << '\n';
    std::cout << "smallest positive double: " << std::numeric_limits<double>::min() << '\n';
    std::cout << "most negative double:     " << std::numeric_limits<double>::lowest() << '\n';
    std::cout << "double digits: " << std::numeric_limits<double>::digits10 << '\n';
}
```

```output
int:       -2147483648 to 2147483647
unsigned:  0 to 4294967295
long long: 9223372036854775807
short:     -32768
double:    1.79769e+308
smallest positive double: 2.22507e-308
most negative double:     -1.79769e+308
double digits: 15
```

> **Pitfall:** For floating-point types, `min()` is the smallest **positive** value, not the most
> negative one. Use `lowest()` for that.

The older C way uses macros from `<climits>` (and `<cfloat>` for floating point):

```cpp run
#include <climits>
#include <iostream>

int main() {
    std::cout << INT_MIN << ' ' << INT_MAX << '\n';
    std::cout << UINT_MAX << '\n';
    std::cout << LLONG_MAX << '\n';
    std::cout << CHAR_BIT << " bits in a byte\n";
}
```

```output
-2147483648 2147483647
4294967295
9223372036854775807
8 bits in a byte
```

## Fixed-width integers: <cstdint>

Because `int` and `long` vary between platforms, `<cstdint>` provides types with an **exact** size,
which you should use when the size really matters (file formats, network protocols, hashing):

| Type | Meaning |
| --- | --- |
| `std::int8_t`, `std::int16_t`, `std::int32_t`, `std::int64_t` | signed, exactly 8/16/32/64 bits |
| `std::uint8_t`, `std::uint16_t`, `std::uint32_t`, `std::uint64_t` | unsigned, exactly 8/16/32/64 bits |
| `std::int_fast32_t`, `std::int_least32_t`, ... | "fastest" / "smallest" type with at least that many bits |
| `std::size_t` | unsigned type for sizes and counts (the type of `sizeof`) |

```cpp run
#include <cstddef>
#include <cstdint>
#include <iostream>

int main() {
    std::int32_t temperature = -40;
    std::uint64_t bigCount = 18'000'000'000'000'000'000u;
    std::size_t bytes = sizeof(bigCount);
    std::cout << temperature << ' ' << bigCount << ' ' << bytes << '\n';

    std::int8_t tiny = 65;
    std::cout << tiny << '\n';        // surprise!
    std::cout << tiny + 0 << '\n';
}
```

```output
-40 18000000000000000000 8
A
65
```

> **Pitfall:** `std::int8_t` and `std::uint8_t` are (on every common platform) just other names for
> `signed char` and `unsigned char`, so `std::cout` prints them **as characters**. Add `0` or cast to
> `int` to print the number.

## Integer overflow

Every integer type has a limited range. What happens if you go past it?

**Unsigned integers wrap around** (modular arithmetic). This is well-defined: going below 0 jumps to
the maximum, going past the maximum jumps to 0.

```cpp run
#include <iostream>
#include <limits>

int main() {
    unsigned int zero = 0;
    unsigned int below = zero - 1;                // wraps to the max
    std::cout << below << '\n';

    unsigned int top = std::numeric_limits<unsigned int>::max();
    unsigned int above = top + 1;                 // wraps to 0
    std::cout << above << '\n';
}
```

```output
4294967295
0
```

**Signed integer overflow is undefined behavior.** The program is broken, with no guarantees at all:

```cpp
int big = 2147483647;   // INT_MAX
big = big + 1;          // UNDEFINED BEHAVIOR: not "wraps to -2147483648"
```

You might see `-2147483648`, but the optimizer is allowed to assume overflow **never happens** and
can turn your code into something completely unexpected. If a value can get large, use a bigger type
(`long long`, `std::int64_t`) **before** the calculation overflows.

:::quiz
What does `sizeof(char)` always equal?

- [x] `1`
- [ ] `2`
- [ ] `8`
- [ ] It depends on the platform

`sizeof` counts in units of `char`, so `sizeof(char)` is 1 by definition. (A byte has `CHAR_BIT` bits,
which is 8 on every platform you'll meet.)
:::

:::quiz
An `unsigned int` holds `0`. You subtract `1`. What happens?

- [ ] Undefined behavior
- [ ] It becomes `-1`
- [x] It wraps around to the largest `unsigned int` (4294967295 with 32 bits)
- [ ] Compile error

Unsigned arithmetic is modular: it wraps around and that is well-defined. Signed overflow, in
contrast, is undefined behavior.
:::

:::quiz
Which type should you use by default for a number with a fractional part?

- [ ] `float`
- [x] `double`
- [ ] `long double`
- [ ] `int`

`double` has about 15-16 significant digits and is what floating literals like `3.14` default to.
`float` only has about 7.
:::

:::exercise Byte counter
An array of `n` integers takes `n * sizeof(int)` bytes. Read `n` and print how many bytes `n` ints
take, **using `sizeof`** (don't hard-code `4`).

**Input:** one integer `n` (0 ≤ n ≤ 1,000,000).
**Output:** `<n> ints = <bytes> bytes` followed by a newline. For `10` print `10 ints = 40 bytes`.

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << n << " ints = " << n << " bytes\n";
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << n << " ints = " << n * sizeof(int) << " bytes\n";
}
```

```hint
`sizeof(int)` is the number of bytes in one `int`. Multiply.
```

```stdin
10
```

```expected
10 ints = 40 bytes
```

```stdin
0
```

```expected hidden
0 ints = 0 bytes
```

```stdin
1000000
```

```expected hidden
1000000 ints = 4000000 bytes
```

```checks
must sizeof\s*\(\s*int\s*\) :: Use sizeof(int) instead of hard-coding the size.
```
:::

:::exercise Unsigned wraparound
Read two non-negative numbers `a` and `b` and print `a - b` computed with **`unsigned int`**
arithmetic, so that a "negative" result wraps around.

**Input:** two integers `a b` (both between 0 and 4,000,000,000).
**Output:** the result of `a - b` as an `unsigned int`, newline. For `3 10` print `4294967289`.

```cpp starter
#include <iostream>

int main() {
    long long a = 0;
    long long b = 0;
    std::cin >> a >> b;
    std::cout << a - b << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    unsigned int a = 0;
    unsigned int b = 0;
    std::cin >> a >> b;
    unsigned int result = a - b;
    std::cout << result << '\n';
}
```

```hint
Change the variables' type to `unsigned int`. Unsigned subtraction wraps modulo 2³².
```

```stdin
10 3
```

```expected
7
```

```stdin
3 10
```

```expected
4294967289
```

```stdin
0 1
```

```expected hidden
4294967295
```

```checks
must \bunsigned\b|uint32_t :: Use an unsigned type.
```
:::

:::exercise Big multiplication
Read two integers and print their product. The numbers can be as large as two billion in size, so the
product does **not** fit in an `int` (and signed overflow is undefined behavior!). Use a 64-bit type.

**Input:** two integers `a b` (each between -2,000,000,000 and 2,000,000,000).
**Output:** `a * b`, newline. For `2000000000 3` print `6000000000`.

```cpp starter
#include <iostream>

int main() {
    // read two numbers and print their product
}
```

```cpp solution
#include <cstdint>
#include <iostream>

int main() {
    std::int64_t a = 0;
    std::int64_t b = 0;
    std::cin >> a >> b;
    std::cout << a * b << '\n';
}
```

```hint
`long long` (or `std::int64_t` from `<cstdint>`) holds values up to about 9.2 × 10¹⁸.
```

```hint
Both variables must be 64-bit **before** you multiply. If they are `int`, the multiplication happens in `int` and overflows.
```

```stdin
2000000000 3
```

```expected
6000000000
```

```stdin
-50000 50000
```

```expected hidden
-2500000000
```

```stdin
2000000000 2000000000
```

```expected hidden
4000000000000000000
```

```checks
must long\s+long|int64_t :: Use a 64-bit integer type (long long or std::int64_t).
```
:::

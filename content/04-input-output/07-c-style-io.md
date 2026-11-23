---
title: C-Style I/O: printf and scanf
summary: Reading and writing with printf and scanf from <cstdio>, the format specifiers you'll see in real code, why they're dangerous, and the rules for mixing them with iostreams.
---

Before C++ had streams, C programs used `printf` and `scanf`. They're still part of C++ (through
`<cstdio>`), and you will see them constantly in older code, C libraries, tutorials, and competitive
programming. You should be able to **read** them, and know why modern C++ prefers `std::cout` and
`std::format`.

## `printf`

```cpp run
#include <cstdio>

int main() {
    int apples = 3;
    double price = 0.5;
    std::printf("Hello from printf!\n");
    std::printf("%d apples at $%.2f each = $%.2f\n", apples, price, apples * price);
}
```

```output
Hello from printf!
3 apples at $0.50 each = $1.50
```

`std::printf` takes a **format string** and then the values. Every `%` in the format string starts a
**conversion specifier** that says how to print the next argument. If you've just read the
`std::format` lesson, it's the same idea with `%d` instead of `{}`, except that **nothing checks that
the specifier matches the argument's type**. You have to get it right yourself.

> **Note:** In C++, include `<cstdio>` and write `std::printf`. Plain `printf` (no `std::`) usually works
> too, since the C names are also put in the global namespace, and you'll see that style everywhere.

### The common specifiers

| Specifier | Type of the argument | Example | Output |
| --- | --- | --- | --- |
| `%d` or `%i` | `int` | `printf("%d", -42)` | `-42` |
| `%u` | `unsigned int` | `printf("%u", 42u)` | `42` |
| `%ld` / `%lld` | `long` / `long long` | `printf("%lld", 9000000000LL)` | `9000000000` |
| `%zu` | `std::size_t` | `printf("%zu", sizeof(int))` | `4` |
| `%f` | `double` (or `float`) | `printf("%f", 3.5)` | `3.500000` |
| `%.2f` | `double`, 2 decimals | `printf("%.2f", 3.14159)` | `3.14` |
| `%e` | `double`, scientific | `printf("%e", 1234.5)` | `1.234500e+03` |
| `%g` | `double`, shorter of `%f`/`%e` | `printf("%g", 0.0001)` | `0.0001` |
| `%c` | `char` | `printf("%c", 'z')` | `z` |
| `%s` | C string (`const char*`), e.g. a string literal | `printf("%s", "hi")` | `hi` |
| `%x` / `%X` | `unsigned`/`int` in hex | `printf("%x", 255)` | `ff` |
| `%o` | `unsigned`/`int` in octal | `printf("%o", 8)` | `10` |
| `%p` | a pointer (address) | `printf("%p", ptr)` | e.g. `0x7ffd...` |
| `%%` | (no argument) a literal `%` | `printf("100%%")` | `100%` |

Note that `%f` means **6 digits after the decimal point**, which is different from `std::cout`'s
default of 6 *significant* digits.

### Width, flags, and precision

Between `%` and the letter you can add flags, a width, and a precision:
`%[flags][width][.precision]letter`.

```cpp run
#include <cstdio>

int main() {
    std::printf("[%5d]\n", 42);       // width 5, right-aligned
    std::printf("[%-5d]\n", 42);      // '-' flag: left-align
    std::printf("[%05d]\n", 42);      // '0' flag: zero-pad
    std::printf("[%+d]\n", 42);       // '+' flag: always show the sign
    std::printf("[%#x] [%#o]\n", 255, 8);  // '#' flag: base prefix
    std::printf("[%8.3f]\n", 3.14159);     // width 8, 3 decimals
    std::printf("[%.3s]\n", "abcdef");     // at most 3 characters of a string
    std::printf("[%*d]\n", 6, 42);         // '*': width taken from an argument
    std::printf("[%-8s|%8s]\n", "left", "right");
    std::printf("%d%% done\n", 75);
}
```

```output
[   42]
[42   ]
[00042]
[+42]
[0xff] [010]
[   3.142]
[abc]
[    42]
[left    |   right]
75% done
```

### Printing a `std::string`

`%s` expects a C-style string (a `const char*`), not a `std::string`. Use the `.c_str()` member function
to get one:

```cpp run
#include <cstdio>
#include <string>

int main() {
    std::string name = "Ada";
    std::printf("Hello, %s!\n", name.c_str());
}
```

```output
Hello, Ada!
```

## The dangers of `printf`

`printf` is a **variadic** function: it accepts any number of arguments of any type, and it trusts the
format string completely. If the two disagree, the behavior is **undefined**:

```cpp
std::printf("%d\n", 3.5);         // a double where an int is expected: garbage (UB)
std::printf("%f\n", 3);           // an int where a double is expected: garbage (UB)
std::printf("%d %d\n", 1);        // missing argument: reads whatever is lying around (UB)
std::printf("%s\n", name);        // a std::string where a C string is expected: UB, often a crash
```

GCC knows how `printf` works and warns about these with `-Wall` (the IDE has it on):

```
warning: format '%d' expects argument of type 'int', but argument 2 has type 'double' [-Wformat=]
```

Treat that warning as an error. But the compiler can only check when the format string is a literal it
can see.

> **Warning:** Never pass text that came from the user as the format string: `std::printf(text)`. If the
> text contains `%s` or `%n`, `printf` goes looking for arguments that don't exist. This is a real
> class of security hole ("format string attack"). Always write `std::printf("%s", text)`.

## `scanf`

`std::scanf` is the input counterpart. It uses similar specifiers, but you pass the **address** of each
variable with `&`, so `scanf` can store into it (you'll learn about addresses and pointers later; for
now, "put `&` before each variable" is the rule).

```cpp run
#include <cstdio>

int main() {
    int a = 0, b = 0;
    int got = std::scanf("%d %d", &a, &b);
    if (got == 2) {
        std::printf("sum = %d\n", a + b);
    } else {
        std::printf("expected two integers (got %d)\n", got);
    }
}
```

With input `3 4` it prints `sum = 7`. With input `3 x` it prints `expected two integers (got 1)`.
With an empty stdin box, `scanf` returns `EOF` (which is `-1`) and it prints `expected two integers (got -1)`.

`scanf` **returns the number of values it successfully stored**, or `EOF` if the input ended before
anything could be read. Always check it. (GCC even warns `ignoring return value of 'scanf'` in some
configurations.) The loop-until-end idiom becomes:

```cpp
int x = 0;
while (std::scanf("%d", &x) == 1) {
    // use x
}
```

Specifiers for `scanf` differ from `printf` in a few traps:

| To read a... | `scanf` specifier | Note |
| --- | --- | --- |
| `int` | `%d` | |
| `long long` | `%lld` | |
| `double` | `%lf` | **not** `%f`, which is for `float` in `scanf` |
| `float` | `%f` | |
| `char` | `" %c"` | `%c` does **not** skip whitespace; the space before it does |
| word into a `char` array | `%19s` | **always** give a maximum width, see below |

### Why `scanf` is dangerous

- **Forgetting `&`.** `std::scanf("%d", x);` passes the *value* of `x` where an address is expected:
  undefined behavior, typically a crash. (GCC warns with `-Wformat`.)
- **Buffer overflows.** `%s` reads a word of *any* length into a fixed-size character array. A long
  enough input writes past the end of the array and corrupts memory. This has caused countless security
  bugs. `%19s` (for a 20-character array) limits it, but it's easy to forget, and `scanf` can't read
  into a `std::string` at all.
- **Wrong specifier.** `%f` with a `double` (instead of `%lf`) stores garbage. No error at runtime.
- **Error recovery is awkward.** Like `std::cin`, a failed `%d` leaves the bad characters in the input.

## Why C++ prefers streams and `std::format`

| | `printf` / `scanf` | `std::cout` / `std::cin` | `std::format` |
| --- | --- | --- | --- |
| Type-safe | no, UB on mismatch | yes | yes, checked at compile time |
| Works with `std::string` | via `.c_str()` | yes | yes |
| Works with your own types | never | yes (you'll learn how) | yes (you'll learn how) |
| Can overflow a buffer | yes (`%s`) | no (with `std::string`) | no |
| Concise formatting | yes | verbose | yes |

`std::format` gives you `printf`'s compact format strings **and** full type safety. That's why it was
added. Use `printf` only when you must (C libraries, existing code).

## Mixing C and C++ I/O

By default, the C++ streams are **synchronized** with C's stdio: `std::cout` and `printf` write to the
same place in the order you call them, so mixing them is safe:

```cpp run
#include <cstdio>
#include <iostream>

int main() {
    std::cout << "one\n";
    std::printf("two\n");
    std::cout << "three\n";
    std::printf("four\n");
}
```

```output
one
two
three
four
```

You'll often see this line at the top of competitive-programming solutions:

```cpp
std::ios::sync_with_stdio(false);   // turn off synchronization with C stdio (faster streams)
std::cin.tie(nullptr);              // don't flush cout before every cin read
```

It makes `std::cin`/`std::cout` noticeably faster for huge amounts of data, but afterwards the C++ streams
and C stdio use separate buffers, so **mixing them can print things out of order**. If you turn off
synchronization, use only one style in that program.

:::quiz
What does `std::printf("%5.1f|%-4d|%%\n", 3.14159, 7);` print? (`_` marks a space)

- [x] `__3.1|7___|%`
- [ ] `3.1__|___7|%%`
- [ ] `3.14159|7|%`
- [ ] `__3.1|___7|`

`%5.1f` is width 5 with 1 decimal (`  3.1`), `%-4d` left-aligns in width 4 (`7   `), and `%%` is a literal `%`.
:::

:::quiz
Which `scanf` call correctly reads a `double d`?

- [ ] `std::scanf("%f", &d);`
- [x] `std::scanf("%lf", &d);`
- [ ] `std::scanf("%lf", d);`
- [ ] `std::scanf("%d", &d);`

`scanf` needs `%lf` for `double` (`%f` is for `float`) and the address `&d`.
:::

:::quiz
Why is `std::format` generally preferred over `printf` in modern C++? (select all that apply)

- [x] A type mismatch is a compile error instead of undefined behavior
- [x] It works directly with `std::string` and other C++ types
- [ ] It's the only way to print with a fixed number of decimals
- [ ] `printf` was removed in C++20

`printf` still exists and can format decimals, but it isn't type-safe and only understands built-in C types.
:::

:::exercise printf receipt {easy}
Read a quantity and a unit price, and print a receipt line **using `std::printf`** (not `std::cout`).

**Input:** an integer `qty` and a number `price`.
**Output:** `<qty> items at $<price> each = $<total>`, with both money values printed with exactly
2 decimals. For `3 0.5`: `3 items at $0.50 each = $1.50`

```cpp starter
#include <cstdio>
#include <iostream>

int main() {
    int qty = 0;
    double price = 0.0;
    std::cin >> qty >> price;
    std::printf("%d items at $%f each = $%f\n", qty, price, qty * price);
}
```

```cpp solution
#include <cstdio>
#include <iostream>

int main() {
    int qty = 0;
    double price = 0.0;
    std::cin >> qty >> price;
    std::printf("%d items at $%.2f each = $%.2f\n", qty, price, qty * price);
}
```

```hint
`%f` prints 6 decimals. `%.2f` prints 2.
```

```stdin
3 0.5
```

```expected
3 items at $0.50 each = $1.50
```

```stdin
12 19.99
```

```expected
12 items at $19.99 each = $239.88
```

```stdin
0 5
```

```expected hidden
0 items at $5.00 each = $0.00
```

```stdin
7 0.1
```

```expected hidden
7 items at $0.10 each = $0.70
```

```checks
must printf\s*\( :: Print with std::printf.
mustnot cout :: Don't use std::cout in this exercise.
```
:::

:::exercise Percent score {easy}
Read the number of correct answers and the total number of questions, and print the score as a
percentage with one decimal place, using `std::printf`.

**Input:** two integers `correct` and `total` (`total > 0`).
**Output:** `Score: <correct>/<total> (<percent>%)` with the percentage to 1 decimal.
For `8 10`: `Score: 8/10 (80.0%)`

```cpp starter
#include <cstdio>
#include <iostream>

int main() {
    int correct = 0, total = 0;
    std::cin >> correct >> total;
    std::printf("Score: %d/%d\n", correct, total);
}
```

```cpp solution
#include <cstdio>
#include <iostream>

int main() {
    int correct = 0, total = 0;
    std::cin >> correct >> total;
    double percent = 100.0 * correct / total;
    std::printf("Score: %d/%d (%.1f%%)\n", correct, total, percent);
}
```

```hint
A literal `%` is written `%%` inside a `printf` format string.
```

```hint
Compute the percentage as a `double`: `100.0 * correct / total`.
```

```stdin
8 10
```

```expected
Score: 8/10 (80.0%)
```

```stdin
1 3
```

```expected
Score: 1/3 (33.3%)
```

```stdin
0 7
```

```expected hidden
Score: 0/7 (0.0%)
```

```stdin
7 7
```

```expected hidden
Score: 7/7 (100.0%)
```

```stdin
2 3
```

```expected hidden
Score: 2/3 (66.7%)
```

```checks
must printf\s*\( :: Print with std::printf.
mustnot cout :: Don't use std::cout in this exercise.
```
:::

:::exercise Checked scanf {medium}
Read two integers **with `std::scanf`** and check that it worked.

**Input:** a line that should contain two integers.
**Output:** `sum = <a + b>` if two integers were read, otherwise `error: expected two integers`.

```cpp starter
#include <cstdio>

int main() {
    int a = 0, b = 0;
    if (std::scanf("%d", &a) == 1) {
        std::printf("sum = %d\n", a + b);
    }
}
```

```cpp solution
#include <cstdio>

int main() {
    int a = 0, b = 0;
    if (std::scanf("%d %d", &a, &b) == 2) {
        std::printf("sum = %d\n", a + b);
    } else {
        std::printf("error: expected two integers\n");
    }
}
```

```hint
`scanf` returns how many values it stored. With two `%d` specifiers you want it to return `2`.
```

```hint
Remember the `&` in front of each variable.
```

```stdin
3 4
```

```expected
sum = 7
```

```stdin
5 x
```

```expected
error: expected two integers
```

```stdin
-10
10
```

```expected hidden
sum = 0
```

```stdin
```

```expected hidden
error: expected two integers
```

```stdin
3
```

```expected hidden
error: expected two integers
```

```stdin
+5 -5
```

```expected hidden
sum = 0
```

```checks
must scanf\s*\( :: Read with std::scanf.
mustnot \bcin\b :: Don't use std::cin in this exercise.
```
:::

:::exercise printf columns {medium}
Read names and scores until the end of input (use `std::cin` for reading) and print them in two columns
**with `std::printf`**.

**Input:** lines with a name (one word) and an integer score.
**Output:** for each line, the name left-aligned in a field of 10, a `|`, then the score right-aligned
in a field of 5. For the input

```
Ada 95
Linus 100
```

the output is

```
Ada       |   95
Linus     |  100
```

```cpp starter
#include <cstdio>
#include <iostream>
#include <string>

int main() {
    std::string name;
    int score = 0;
    while (std::cin >> name >> score) {
        std::printf("%s|%d\n", name.c_str(), score);
    }
}
```

```cpp solution
#include <cstdio>
#include <iostream>
#include <string>

int main() {
    std::string name;
    int score = 0;
    while (std::cin >> name >> score) {
        std::printf("%-10s|%5d\n", name.c_str(), score);
    }
}
```

```hint
Width and alignment go between `%` and the letter: `%-10s` is left-aligned in 10, `%5d` is right-aligned in 5.
```

```stdin
Ada 95
Linus 100
```

```expected
Ada       |   95
Linus     |  100
```

```stdin
Bartholomew 7
Al -3
```

```expected hidden
Bartholomew|    7
Al        |   -3
```

```stdin
```

```expected hidden
```

```stdin
Zero 0
Tenletters 10
```

```expected hidden
Zero      |    0
Tenletters|   10
```

```checks
must printf\s*\( :: Print with std::printf.
must c_str\s*\( :: Pass the std::string to printf with .c_str().
mustnot cout :: Don't use std::cout for the output.
```
:::

:::exercise Path length {hard}
A path is given as a list of points written like `(3,4)`. Read the points **with `std::scanf`**, add up
the lengths of the straight segments between consecutive points, and report the result **with
`std::printf`**.

**Input:** zero or more points `(x,y)` with integer coordinates, separated by whitespace (spaces or
newlines). Reading stops at the end of the input, or at the first thing that isn't a well-formed point.
**Output:**

- If reading stopped at a malformed point, first print `Error: bad point #K`, where `K` is its position
  in the list (counting from 1).
- Then `Points: N`, the number of valid points read before that.
- Then `Length: L`, the total length with exactly 3 decimals. With fewer than two points it's `0.000`.

The length of a segment from `(x1,y1)` to `(x2,y2)` is `std::sqrt(dx * dx + dy * dy)` (from `<cmath>`).

For `(0,0) (3,4) (3,0)`:

```
Points: 3
Length: 9.000
```

```cpp starter
#include <cstdio>

int main() {
    int x = 0, y = 0;
    if (std::scanf(" (%d,%d)", &x, &y) == 2) {
        std::printf("Points: 1\n");
    }
}
```

```cpp solution
#include <cmath>
#include <cstdio>

int main() {
    int x = 0, y = 0;
    int prevX = 0, prevY = 0;
    int count = 0;
    double length = 0.0;

    int got = 0;
    while ((got = std::scanf(" (%d,%d)", &x, &y)) == 2) {
        if (count > 0) {
            double dx = x - prevX;
            double dy = y - prevY;
            length += std::sqrt(dx * dx + dy * dy);
        }
        prevX = x;
        prevY = y;
        ++count;
    }

    if (got != EOF) {
        std::printf("Error: bad point #%d\n", count + 1);
    }
    std::printf("Points: %d\n", count);
    std::printf("Length: %.3f\n", length);
}
```

```hint
Literal characters in a `scanf` format must match the input exactly, and a **space** in the format
skips any amount of whitespace. So `" (%d,%d)"` skips the whitespace before each point.
```

```hint
`scanf` returns `2` when both numbers were stored, `EOF` when the input ended before anything matched,
and `0` or `1` when it hit something malformed. Remember the last return value after the loop.
```

```stdin
(0,0) (3,4) (3,0)
```

```expected
Points: 3
Length: 9.000
```

```stdin
(1,1)
```

```expected
Points: 1
Length: 0.000
```

```stdin
```

```expected hidden
Points: 0
Length: 0.000
```

```stdin
(0,0) (1,1) (1,x) (5,5)
```

```expected hidden
Error: bad point #3
Points: 2
Length: 1.414
```

```stdin
(-2,-3)
(1,1)
(1,-3)
```

```expected hidden
Points: 3
Length: 9.000
```

```stdin
[0,0] (1,1)
```

```expected hidden
Error: bad point #1
Points: 0
Length: 0.000
```

```stdin
(0,0)   (1,2)
  (2,4)
```

```expected hidden
Points: 3
Length: 4.472
```

```checks
must scanf\s*\( :: Read the points with std::scanf.
must printf\s*\( :: Print with std::printf.
mustnot \bcin\b|\bcout\b :: Use C-style I/O only in this exercise.
```
:::

---
title: std::format (C++20)
summary: Modern, type-safe formatting with {} placeholders, positional arguments, and format specs for width, alignment, fill, sign, precision, and number bases. Plus a look at C++23's std::print.
---

`<iomanip>` works, but long chains like `std::left << std::setw(10) << name << std::right << ...` are
hard to read, and the sticky settings leak into later output. C++20 added **`std::format`**, which
uses a small **format string** with placeholders, in the style of Python's `str.format`.

```cpp run
#include <format>
#include <iostream>
#include <string>

int main() {
    std::string name = "Ada";
    int age = 36;
    std::string s = std::format("{} is {} years old.", name, age);
    std::cout << s << '\n';

    // usually you print the result directly:
    std::cout << std::format("Next year {} will be {}.\n", name, age + 1);
}
```

```output
Ada is 36 years old.
Next year Ada will be 37.
```

- `#include <format>`.
- `std::format(format_string, args...)` **returns a `std::string`**. It doesn't print anything by
  itself, so you send the result to `std::cout`.
- Each `{}` in the format string is a **replacement field**, filled with the next argument, in order.
- Every argument is formatted according to its **type**, so you can't accidentally print a `double` as
  an `int` (a classic C bug you'll see in the next lesson).
- Nothing is sticky: each `{}` is formatted on its own.

## Replacement fields

### Automatic and positional arguments

Empty braces take the arguments in order. A number inside the braces picks an argument by position,
starting at 0, and lets you reuse or reorder them:

```cpp run
#include <format>
#include <iostream>

int main() {
    std::cout << std::format("{} + {} = {}\n", 2, 3, 2 + 3);
    std::cout << std::format("{1} comes after {0}\n", "first", "second");
    std::cout << std::format("{0}-{0}-{0}! {1}\n", "ha", "Very funny.");
}
```

```output
2 + 3 = 5
second comes after first
ha-ha-ha! Very funny.
```

You can't mix the two styles in one format string:

```cpp compile-error
#include <format>
#include <iostream>

int main() {
    std::cout << std::format("{} and {1}\n", "a", "b");   // error: conflicting indexing
}
```

### Literal braces

To print a real `{` or `}`, double it: `{{` and `}}`.

```cpp run
#include <format>
#include <iostream>

int main() {
    std::cout << std::format("{{}} is a placeholder; the set is {{{}, {}}}\n", 1, 2);
}
```

```output
{} is a placeholder; the set is {1, 2}
```

### Checked at compile time

In C++20, the format string must be a compile-time constant (normally a string literal), and the
compiler **checks it**. Too few arguments, an unmatched brace, or a spec that doesn't fit the type is a
compile error, not a runtime surprise:

```cpp compile-error
#include <format>
#include <iostream>

int main() {
    std::cout << std::format("{} and {}\n", 1);     // error: only one argument for two fields
}
```

GCC's message for these is cryptic, something like `call to non-'constexpr' function ...
__invalid_arg_id_in_format_string()`. The name of that function tells you what's wrong. (Extra
arguments that no field uses are allowed and ignored.)

## Format specs

After an optional argument number, a **colon** starts the **format spec**, which says *how* to
format the value:

```
{ arg-id : fill align sign # 0 width .precision type }
```

Every part is optional, but they must appear **in this order**. Let's go through them.

### Width and alignment

A number is the **minimum width**. Alignment is `<` (left), `>` (right), or `^` (center).

```cpp run
#include <format>
#include <iostream>

int main() {
    std::cout << std::format("[{:8}]\n", 42);        // numbers: right-aligned by default
    std::cout << std::format("[{:8}]\n", "text");    // strings: LEFT-aligned by default
    std::cout << std::format("[{:<8}]\n", 42);
    std::cout << std::format("[{:>8}]\n", "text");
    std::cout << std::format("[{:^8}]\n", "mid");    // odd padding: the extra space goes right
    std::cout << std::format("[{:3}]\n", 123456);    // too wide: never truncated
}
```

```output
[      42]
[text    ]
[42      ]
[    text]
[  mid   ]
[123456]
```

> **Note:** The defaults differ from `std::setw`: with `std::format`, strings are **left**-aligned
> and numbers right-aligned by default. With `setw`, everything is right-aligned.

### Fill character

Put any character **before** the alignment to pad with it instead of spaces (the alignment is
required when you give a fill):

```cpp run
#include <format>
#include <iostream>

int main() {
    std::cout << std::format("[{:*^11}]\n", "title");
    std::cout << std::format("[{:->8}]\n", 7);
    std::cout << std::format("[{:.<12}]{}\n", "Chapter 1", 3);
    std::cout << std::format("{:=<20}\n", "");      // a line of 20 '='
}
```

```output
[***title***]
[-------7]
[Chapter 1...]3
====================
```

### Zero padding

A `0` before the width pads numbers with zeros, **after** the sign:

```cpp run
#include <format>
#include <iostream>

int main() {
    std::cout << std::format("{:05}|{:05}|{:02}:{:02}\n", 42, -42, 7, 5);
}
```

```output
00042|-0042|07:05
```

### Sign

| Spec | Positive | Negative |
| --- | --- | --- |
| `-` (default) | `5` | `-5` |
| `+` | `+5` | `-5` |
| space | ` 5` (leading space) | `-5` |

```cpp run
#include <format>
#include <iostream>

int main() {
    std::cout << std::format("[{}] [{:+}] [{:+}] [{: }] [{:+.1f}]\n", 5, 5, 0, 5, -2.25);
}
```

```output
[5] [+5] [+0] [ 5] [-2.2]
```

(`-2.25` rounds to `-2.2` because the binary `double` closest to 2.25 is exactly 2.25 and ties round
to even; that's the same rounding `printf` uses.)

### Precision and floating-point types

For floating-point numbers, the **type** letter picks the notation and `.precision` picks the digits:

| Spec | Meaning | `1234.5678` |
| --- | --- | --- |
| `{}` | shortest form that reads back exactly | `1234.5678` |
| `{:.2f}` | fixed, 2 digits after the point | `1234.57` |
| `{:.3e}` | scientific, 3 digits after the point | `1.235e+03` |
| `{:.3}` or `{:.3g}` | 3 significant digits | `1.23e+03` |
| `{:10.2f}` | fixed, 2 decimals, width 10 | `   1234.57` |

```cpp run
#include <format>
#include <iostream>

int main() {
    double x = 1234.5678;
    std::cout << std::format("{} | {:.2f} | {:.3e} | {:.3} | [{:10.2f}]\n", x, x, x, x, x);
    std::cout << std::format("{:.2f} {:.0f} {:.1f}\n", 3.14159, 2.7, 0.05);
    std::cout << std::format("{}\n", 0.1 + 0.2);    // shortest exact form, no hidden rounding
    std::cout << 0.1 + 0.2 << '\n';                 // cout rounds to 6 significant digits
}
```

```output
1234.5678 | 1234.57 | 1.235e+03 | 1.23e+03 | [   1234.57]
3.14 3 0.1
0.30000000000000004
0.3
```

On a **string**, precision means "at most this many characters": `std::format("{:.3}", "abcdef")` gives
`abc`. Precision is not allowed on integers:

```cpp compile-error
#include <format>
#include <iostream>

int main() {
    std::cout << std::format("{:.2f}\n", 42);   // error: 42 is an int, not a floating-point value
}
```

Write `42.0`, or convert: `static_cast<double>(n)`.

### Integer types: bases and `#`

| Spec | Meaning | `255` |
| --- | --- | --- |
| `{}` or `{:d}` | decimal | `255` |
| `{:x}` / `{:X}` | hexadecimal, lower/upper case | `ff` / `FF` |
| `{:o}` | octal | `377` |
| `{:b}` / `{:B}` | **binary** (iostreams can't do this) | `11111111` |
| `{:#x}` `{:#X}` `{:#o}` `{:#b}` | with a prefix | `0xff` `0XFF` `0377` `0b11111111` |
| `{:c}` | the character with that code | (`{:c}` of `65` is `A`) |

```cpp run
#include <format>
#include <iostream>

int main() {
    int n = 42;
    std::cout << std::format("{} {:x} {:X} {:o} {:b}\n", n, n, n, n, n);
    std::cout << std::format("{:#x} {:#o} {:#b}\n", n, n, n);
    std::cout << std::format("{:08b} {:#010x}\n", 5, 255);   // zero-padded, prefix included in width
    std::cout << std::format("{:c}{:c}\n", 72, 105);
}
```

```output
42 2a 2A 52 101010
0x2a 052 0b101010
00000101 0x000000ff
Hi
```

### Other types

`bool` prints as `true`/`false` (use `{:d}` for `1`/`0`). `char` prints as a character (use `{:d}` for its
code). `std::string` and string literals print as text.

```cpp run
#include <format>
#include <iostream>
#include <string>

int main() {
    bool ok = true;
    char c = 'A';
    std::string word = "format";
    std::cout << std::format("{} {:d} | {} {:d} | {:>8}|\n", ok, ok, c, c, word);
}
```

```output
true 1 | A 65 |   format|
```

### Width and precision from variables

Use a nested `{}` in place of the number to take the width or precision from an argument:

```cpp run
#include <format>
#include <iostream>

int main() {
    int width = 10;
    int decimals = 3;
    std::cout << std::format("[{:>{}}]\n", "hi", width);
    std::cout << std::format("[{:.{}f}]\n", 3.14159265, decimals);
    std::cout << std::format("[{:*^{}}]\n", "mid", width);
}
```

```output
[        hi]
[3.142]
[***mid****]
```

## `std::format` vs `<iomanip>`

The table from the previous lesson, rewritten with `std::format`:

```cpp run
#include <format>
#include <iostream>

int main() {
    std::cout << std::format("{:<10}{:>5}{:>10}\n", "Item", "Qty", "Price");
    std::cout << std::format("{:=<25}\n", "");
    std::cout << std::format("{:<10}{:>5}{:>10.2f}\n", "Apple", 3, 0.5);
    std::cout << std::format("{:<10}{:>5}{:>10.2f}\n", "Truffle", 12, 1234.5);
}
```

```output
Item        Qty     Price
=========================
Apple         3      0.50
Truffle      12   1234.50
```

Both are standard C++ and you'll see both in real code. `std::format` is usually shorter, has no
sticky state, and can do binary.

## C++23: `std::print` and `std::println`

C++23 adds `<print>`, which formats **and** prints in one call:

```cpp
#include <print>

int main() {
    std::print("{} + {} = {}\n", 2, 3, 5);   // like std::cout << std::format(...)
    std::println("Hello, {}!", "world");     // adds the newline for you
}
```

This needs GCC 14 or newer with `-std=c++23`. This guide targets C++20, so exercises use
`std::cout << std::format(...)`.

:::quiz
What does `std::format("[{:>6}]", "ab")` produce?

- [ ] `[ab    ]`
- [x] `[    ab]`
- [ ] `[  ab  ]`
- [ ] `[ab]`

`>` right-aligns in a field of width 6, so 4 spaces go before `ab`.
:::

:::quiz
Which format string prints `255` as `0xff`?

- [ ] `"{:x}"`
- [x] `"{:#x}"`
- [ ] `"{:0x}"`
- [ ] `"{:X}"`

`x` is hexadecimal and `#` adds the `0x` prefix. `{:X}` would give `FF`.
:::

:::quiz
Which of these fail to compile? (select all that apply)

- [x] `std::format("{} {}", 1)`
- [x] `std::format("{:.2f}", 7)`
- [x] `std::format("{0} {}", 1, 2)`
- [ ] `std::format("{} {}", 1, 2, 3)`

Too few arguments, a floating-point precision on an `int`, and mixing positional with automatic
indexing are all compile-time errors. Extra unused arguments are allowed.
:::

:::exercise Braces in the output {easy}
Read two integers `x` and `y` and print them as a point in curly braces, using `std::format`.

**Input:** two integers.
**Output:** `Point {x, y}`, e.g. `Point {3, 4}` for input `3 4`.

```cpp starter
#include <format>
#include <iostream>

int main() {
    int x = 0, y = 0;
    std::cin >> x >> y;
    std::cout << std::format("Point ({}, {})\n", x, y);
}
```

```cpp solution
#include <format>
#include <iostream>

int main() {
    int x = 0, y = 0;
    std::cin >> x >> y;
    std::cout << std::format("Point {{{}, {}}}\n", x, y);
}
```

```hint
A literal `{` is written `{{` inside a format string, and `}` is `}}`.
```

```hint
So `{` followed by a placeholder is `{{{}`.
```

```stdin
3 4
```

```expected
Point {3, 4}
```

```stdin
-10 0
```

```expected hidden
Point {-10, 0}
```

```stdin
0 -2147483648
```

```expected hidden
Point {0, -2147483648}
```

```checks
must std::format :: Use std::format.
```
:::

:::exercise Receipt line {medium}
Read an item name (one word), a quantity, and a unit price, and print one formatted receipt line.

**Input:** a word, an integer, and a number, e.g. `Apples 3 0.5`.
**Output:** one line made of:

- the name, left-aligned in a field of 10,
- `x` and the quantity right-aligned in a field of 3,
- ` @ ` (space, `@`, space),
- the unit price with 2 decimals, right-aligned in a field of 6,
- ` = `,
- the total (quantity × price) with 2 decimals, right-aligned in a field of 8.

For `Apples 3 0.5` the output is:

```
Apples    x  3 @   0.50 =     1.50
```

```cpp starter
#include <format>
#include <iostream>
#include <string>

int main() {
    std::string name;
    int qty = 0;
    double price = 0.0;
    std::cin >> name >> qty >> price;
    std::cout << std::format("{} x{} @ {} = {}\n", name, qty, price, qty * price);
}
```

```cpp solution
#include <format>
#include <iostream>
#include <string>

int main() {
    std::string name;
    int qty = 0;
    double price = 0.0;
    std::cin >> name >> qty >> price;
    std::cout << std::format("{:<10}x{:>3} @ {:>6.2f} = {:>8.2f}\n", name, qty, price, qty * price);
}
```

```hint
Left-align in 10: `{:<10}`. Right-align with 2 decimals in 6: `{:>6.2f}`.
```

```stdin
Apples 3 0.5
```

```expected
Apples    x  3 @   0.50 =     1.50
```

```stdin
Truffle 12 199.99
```

```expected
Truffle   x 12 @ 199.99 =  2399.88
```

```stdin
Air 0 1
```

```expected hidden
Air       x  0 @   1.00 =     0.00
```

```stdin
Caviar 1 12345.678
```

```expected hidden
Caviar    x  1 @ 12345.68 = 12345.68
```

```stdin
Gum 1000 0.25
```

```expected hidden
Gum       x1000 @   0.25 =   250.00
```

```checks
must std::format :: Use std::format.
mustnot setw|setprecision :: Use format specs instead of <iomanip> manipulators.
```
:::

:::exercise Base converter {medium}
Read a non-negative integer and print it in four bases on one line, then its low 8 bits as zero-padded
binary on a second line.

**Input:** one integer `n` with `0 <= n <= 255`.
**Output:** two lines. For `10`:

```
10 0xa 012 0b1010
00001010
```

The first line is decimal, hex with `0x`, octal with its `0` prefix, and binary with `0b`. The second
line is binary, zero-padded to 8 digits, without a prefix.

```cpp starter
#include <format>
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << std::format("{} {} {} {}\n", n, n, n, n);
}
```

```cpp solution
#include <format>
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << std::format("{0} {0:#x} {0:#o} {0:#b}\n", n);
    std::cout << std::format("{:08b}\n", n);
}
```

```hint
The type letters are `x`, `o`, and `b`. A `#` before the type adds the prefix: `{:#x}`.
```

```hint
Zero-padding to width 8 is `{:08b}`. You can also reuse one argument with positions: `{0} {0:#x}`.
```

```stdin
10
```

```expected
10 0xa 012 0b1010
00001010
```

```stdin
255
```

```expected
255 0xff 0377 0b11111111
11111111
```

```stdin
0
```

```expected hidden
0 0x0 0 0b0
00000000
```

```stdin
1
```

```expected hidden
1 0x1 01 0b1
00000001
```

```stdin
128
```

```expected hidden
128 0x80 0200 0b10000000
10000000
```

```checks
must std::format :: Use std::format.
mustnot \bhex\b|\boct\b :: Use format specs, not std::hex/std::oct.
```
:::

:::exercise Centered banner {medium}
Read a word and a width `w`, and print a banner of width `w` with the word centered inside it.

**Input:** a word and an integer `w`.
**Output:** three lines:

1. `w` asterisks,
2. the word centered in a field of width `w`, padded with `*` (when the padding is odd, the extra `*` goes on the right),
3. `w` asterisks again.

For `Ada 10`:

```
**********
***Ada****
**********
```

If the word is longer than `w`, the middle line is just the word (nothing is cut off).

```cpp starter
#include <format>
#include <iostream>
#include <string>

int main() {
    std::string word;
    int w = 0;
    std::cin >> word >> w;
    std::cout << std::format("{}\n", word);
}
```

```cpp solution
#include <format>
#include <iostream>
#include <string>

int main() {
    std::string word;
    int w = 0;
    std::cin >> word >> w;
    std::cout << std::format("{:*<{}}\n", "", w);
    std::cout << std::format("{:*^{}}\n", word, w);
    std::cout << std::format("{:*<{}}\n", "", w);
}
```

```hint
Center with a fill character: `{:*^10}`. To take the width from a variable, replace `10` with a nested `{}`.
```

```hint
An empty string padded to width `w` with `*` is a row of `w` asterisks: `std::format("{:*<{}}", "", w)`.
```

```stdin
Ada 10
```

```expected
**********
***Ada****
**********
```

```stdin
center 8
```

```expected
********
*center*
********
```

```stdin
toolong 3
```

```expected hidden
***
toolong
***
```

```stdin
abc 4
```

```expected hidden
****
abc*
****
```

```stdin
x 1
```

```expected hidden
*
x
*
```

```stdin
mid 5
```

```expected hidden
*****
*mid*
*****
```

```checks
must std::format :: Use std::format.
```
:::

:::exercise Temperature table {hard}
Print a Celsius-to-Fahrenheit conversion table with `std::format`.

**Input:** three integers `from`, `to` and `step`.
**Output:**

- If `step` is `0`, or it points away from `to` (`step > 0` while `from > to`, or `step < 0` while
  `from < to`), print only `Invalid step`.
- Otherwise print a header line, a line of 20 dashes, and one row for each Celsius value `from`,
  `from + step`, `from + 2*step`, ... as long as it hasn't gone past `to` (`to` itself is included if it's
  reached exactly). When `from == to` there is exactly one row.
- Header: `Celsius` right-aligned in 7, ` | `, `Fahrenheit` right-aligned in 10.
- Row: the Celsius value right-aligned in 7, ` | `, the Fahrenheit value `c * 9 / 5 + 32` **computed
  exactly** (no integer division!) with 1 decimal, right-aligned in 10.

For `0 100 25`:

```
Celsius | Fahrenheit
--------------------
      0 |       32.0
     25 |       77.0
     50 |      122.0
     75 |      167.0
    100 |      212.0
```

```cpp starter
#include <format>
#include <iostream>

int main() {
    int from = 0, to = 0, step = 0;
    std::cin >> from >> to >> step;
}
```

```cpp solution
#include <format>
#include <iostream>

int main() {
    int from = 0, to = 0, step = 0;
    std::cin >> from >> to >> step;

    if (step == 0 || (step > 0 && from > to) || (step < 0 && from < to)) {
        std::cout << "Invalid step\n";
        return 0;
    }

    std::cout << std::format("{:>7} | {:>10}\n", "Celsius", "Fahrenheit");
    std::cout << std::format("{:-<20}\n", "");
    int c = from;
    while ((step > 0 && c <= to) || (step < 0 && c >= to)) {
        std::cout << std::format("{:>7} | {:>10.1f}\n", c, c * 9.0 / 5 + 32);
        c += step;
    }
}
```

```hint
`c * 9 / 5` with an `int` `c` truncates (`1 * 9 / 5` is `1`). Use `9.0` so the whole computation is
done in `double`.
```

```hint
The loop condition depends on the direction: keep going while `c <= to` when counting up, and while
`c >= to` when counting down.
```

```hint
A line of 20 dashes: `std::format("{:-<20}", "")`.
```

```stdin
0 100 25
```

```expected
Celsius | Fahrenheit
--------------------
      0 |       32.0
     25 |       77.0
     50 |      122.0
     75 |      167.0
    100 |      212.0
```

```stdin
-40 -50 -5
```

```expected
Celsius | Fahrenheit
--------------------
    -40 |      -40.0
    -45 |      -49.0
    -50 |      -58.0
```

```stdin
10 0 5
```

```expected hidden
Invalid step
```

```stdin
0 0 7
```

```expected hidden
Celsius | Fahrenheit
--------------------
      0 |       32.0
```

```stdin
1 4 2
```

```expected hidden
Celsius | Fahrenheit
--------------------
      1 |       33.8
      3 |       37.4
```

```stdin
5 5 0
```

```expected hidden
Invalid step
```

```stdin
-273 -270 1
```

```expected hidden
Celsius | Fahrenheit
--------------------
   -273 |     -459.4
   -272 |     -457.6
   -271 |     -455.8
   -270 |     -454.0
```

```checks
must std::format :: Use std::format.
mustnot setw|setprecision :: Use format specs instead of <iomanip> manipulators.
```
:::

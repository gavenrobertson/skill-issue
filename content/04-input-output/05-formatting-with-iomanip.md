---
title: Formatting Output with <iomanip>
summary: Field width, alignment, fill characters, floating-point precision, fixed and scientific notation, signs, number bases, which manipulators are sticky and which are one-shot, and printing neat tables.
---

Plain `<<` prints values in a default style: integers in decimal, doubles with 6 significant
digits, nothing lined up. **Manipulators** let you change that. You've already met two
(`std::boolalpha` and `std::endl`). This lesson covers the rest.

## Where manipulators come from

- Manipulators **without arguments** (`std::fixed`, `std::left`, `std::hex`, `std::showpos`, ...) are
  available through `<iostream>`.
- Manipulators **with arguments** (`std::setw(n)`, `std::setfill(c)`, `std::setprecision(n)`) need
  `#include <iomanip>`.

```cpp compile-error
#include <iostream>
// forgot #include <iomanip>

int main() {
    std::cout << std::setw(5) << 42 << '\n';   // error: 'setw' is not a member of 'std'
}
```

## Field width: `std::setw`

`std::setw(n)` says "print the **next** item using **at least** `n` characters". Shorter output is
padded with spaces; by default the padding goes on the left, so the value is right-aligned:

```cpp run
#include <iostream>
#include <iomanip>

int main() {
    std::cout << '[' << std::setw(6) << 42 << "]\n";
    std::cout << '[' << std::setw(6) << -3 << "]\n";
    std::cout << '[' << std::setw(6) << "abc" << "]\n";
    std::cout << '[' << std::setw(6) << 3.5 << "]\n";
    std::cout << '[' << std::setw(2) << 123456 << "]\n";   // too wide: never truncated
}
```

```output
[    42]
[    -3]
[   abc]
[   3.5]
[123456]
```

Two rules to remember:

1. **`setw` is one-shot.** It applies to the very next item only, then the width resets to 0.
2. **It never cuts anything off.** If the value is wider than the field, the whole value is printed.

```cpp run
#include <iostream>
#include <iomanip>

int main() {
    std::cout << std::setw(5) << 1 << 2 << 3 << '\n';                         // only 1 is padded
    std::cout << std::setw(5) << 1 << std::setw(5) << 2 << std::setw(5) << 3 << '\n';
}
```

```output
    123
    1    2    3
```

## Alignment: `std::left`, `std::right`, `std::internal`

These choose where the padding goes. Unlike `setw`, they are **sticky**: they stay in effect until
changed.

```cpp run
#include <iostream>
#include <iomanip>

int main() {
    std::cout << std::left;
    std::cout << '[' << std::setw(8) << "left" << "]\n";
    std::cout << '[' << std::setw(8) << -42 << "]\n";
    std::cout << std::right;
    std::cout << '[' << std::setw(8) << "right" << "]\n";
    std::cout << '[' << std::setw(8) << -42 << "]\n";
    std::cout << std::internal;     // sign on the left, padding between sign and digits
    std::cout << '[' << std::setw(8) << -42 << "]\n";
}
```

```output
[left    ]
[-42     ]
[   right]
[     -42]
[-     42]
```

## Fill character: `std::setfill`

Padding uses spaces unless you pick another character with `std::setfill(c)`. It's **sticky**.

```cpp run
#include <iostream>
#include <iomanip>

int main() {
    std::cout << std::setfill('0') << std::setw(5) << 42 << '\n';     // zero-padding
    std::cout << std::setw(2) << 7 << ':' << std::setw(2) << 5 << '\n';  // still '0'
    std::cout << std::setfill('.') << std::left << std::setw(12) << "Chapter 1" << "page 3\n";
    std::cout << std::setfill('-') << std::setw(20) << "" << '\n';    // a line of 20 dashes
    std::cout << std::setfill(' ');                                     // put it back
}
```

```output
00042
07:05
Chapter 1...page 3
--------------------
```

Printing an empty string `""` with a width and a fill character is a neat trick for drawing lines.

## Floating-point: precision and notation

By default, doubles are printed with **6 significant digits** in whatever style is shorter. Three
manipulators change the notation, and `std::setprecision(n)` changes the digit count. **All of these
are sticky.**

| Mode | Manipulator | What `setprecision(n)` means | `1234.5678` with precision 2 |
| --- | --- | --- | --- |
| default | `std::defaultfloat` | `n` **significant** digits total | `1.2e+03` |
| fixed | `std::fixed` | `n` digits **after the decimal point** | `1234.57` |
| scientific | `std::scientific` | `n` digits after the point, with an exponent | `1.23e+03` |

```cpp run
#include <iostream>
#include <iomanip>

int main() {
    double x = 1234.5678;
    double y = 0.5;

    std::cout << x << ' ' << y << '\n';                     // default: 6 significant digits
    std::cout << std::setprecision(3) << x << ' ' << y << '\n';
    std::cout << std::fixed << x << ' ' << y << '\n';       // precision 3 is still in effect
    std::cout << std::setprecision(2) << x << ' ' << y << '\n';
    std::cout << std::scientific << x << ' ' << y << '\n';
    std::cout << std::defaultfloat << std::setprecision(6) << x << '\n';   // back to normal
}
```

```output
1234.57 0.5
1.23e+03 0.5
1234.568 0.500
1234.57 0.50
1.23e+03 5.00e-01
1234.57
```

Values are **rounded**, not cut off: `1234.5678` with two decimals becomes `1234.57`.

> **Pitfall:** For money and other "N decimal places" output you need **both** `std::fixed` and
> `std::setprecision(n)`. `setprecision(2)` alone means "2 significant digits", so `1234.5` prints as
> `1.2e+03`.

`std::showpoint` (sticky) forces the decimal point and trailing zeros in default mode, so `2.0` prints
as `2.00000` instead of `2`. `std::noshowpoint` turns it off.

## Signs: `std::showpos`

`std::showpos` prints a `+` in front of non-negative numbers (including zero). `std::noshowpos` turns
it off. Sticky.

```cpp run
#include <iostream>

int main() {
    std::cout << std::showpos << 5 << ' ' << -5 << ' ' << 0 << ' ' << 2.5 << '\n';
    std::cout << std::noshowpos << 5 << '\n';
}
```

```output
+5 -5 +0 +2.5
5
```

## Number bases: `std::hex`, `std::oct`, `std::dec`

Integers can be printed in base 16 (`std::hex`), base 8 (`std::oct`), or base 10 (`std::dec`, the
default). These are **sticky**, which surprises people: after `std::hex`, *every* integer is printed in
hex until you switch back with `std::dec`.

- `std::showbase` adds the prefix: `0x` for hex, `0` for octal. (A zero value prints as just `0`.)
- `std::uppercase` uses capital letters: `FF`, `0XFF`, and `E` in scientific notation.

```cpp run
#include <iostream>

int main() {
    int n = 255;
    std::cout << std::dec << n << ' ' << std::hex << n << ' ' << std::oct << n << '\n';
    std::cout << std::showbase;
    std::cout << std::dec << n << ' ' << std::hex << n << ' ' << std::oct << n << '\n';
    std::cout << std::uppercase << std::hex << n << '\n';
    std::cout << 10 << '\n';                         // still hex! sticky
    std::cout << std::dec << std::nouppercase << std::noshowbase << 10 << '\n';
}
```

```output
255 ff 377
255 0xff 0377
0XFF
0XA
10
```

The bases only affect **integers**; doubles are unaffected by `std::hex`. To *read* hex input, use the same
manipulator on `std::cin`: `std::cin >> std::hex >> n;`.

## Sticky vs one-shot: the summary

| Manipulator | Header | Lasts |
| --- | --- | --- |
| `std::setw(n)` | `<iomanip>` | **next item only** |
| `std::setfill(c)` | `<iomanip>` | sticky |
| `std::setprecision(n)` | `<iomanip>` | sticky |
| `std::left` / `std::right` / `std::internal` | `<iostream>` | sticky |
| `std::fixed` / `std::scientific` / `std::defaultfloat` | `<iostream>` | sticky |
| `std::showpos` / `std::noshowpos` | `<iostream>` | sticky |
| `std::showpoint` / `std::noshowpoint` | `<iostream>` | sticky |
| `std::hex` / `std::oct` / `std::dec` | `<iostream>` | sticky |
| `std::showbase` / `std::noshowbase` | `<iostream>` | sticky |
| `std::uppercase` / `std::nouppercase` | `<iostream>` | sticky |
| `std::boolalpha` / `std::noboolalpha` | `<iostream>` | sticky |

Only `setw` resets itself. Everything else changes `std::cout` until you change it back, which can
leak into code that runs later. If a piece of code changes formatting temporarily, you can save and
restore the stream's settings:

```cpp
std::ios_base::fmtflags old_flags = std::cout.flags();    // remember the flags
std::streamsize old_precision = std::cout.precision();    // and the precision

std::cout << std::fixed << std::setprecision(2) << std::hex;
// ... print things ...

std::cout.flags(old_flags);                               // restore both
std::cout.precision(old_precision);
```

## Printing a table

Put it all together: left-align text columns, right-align number columns, fix the decimals.

```cpp run
#include <iostream>
#include <iomanip>

int main() {
    std::cout << std::left << std::setw(10) << "Item"
              << std::right << std::setw(5) << "Qty"
              << std::setw(10) << "Price" << '\n';
    std::cout << std::setfill('=') << std::setw(25) << "" << std::setfill(' ') << '\n';

    std::cout << std::fixed << std::setprecision(2);
    std::cout << std::left << std::setw(10) << "Apple"
              << std::right << std::setw(5) << 3 << std::setw(10) << 0.5 << '\n';
    std::cout << std::left << std::setw(10) << "Melon"
              << std::right << std::setw(5) << 1 << std::setw(10) << 2.99 << '\n';
    std::cout << std::left << std::setw(10) << "Truffle"
              << std::right << std::setw(5) << 12 << std::setw(10) << 1234.5 << '\n';
}
```

```output
Item        Qty     Price
=========================
Apple         3      0.50
Melon         1      2.99
Truffle      12   1234.50
```

> **Tip:** `std::setw` also works on input: `std::cin >> std::setw(10) >> word;` reads at most 10
> characters into a `std::string` (the rest stays in the input for the next read).

:::quiz
What does this print? (`_` marks a space)

```cpp
std::cout << std::setw(4) << 7 << 8 << '\n';
```

- [ ] `___7___8`
- [x] `___78`
- [ ] `7___8`
- [ ] `78__`

`setw` affects only the next item (`7`), which is right-aligned by default. `8` is printed with no padding.
:::

:::quiz
What does `std::cout << std::setprecision(2) << 3.14159;` print (with no other manipulators)?

- [ ] `3.14`
- [x] `3.1`
- [ ] `3.14159`
- [ ] `3`

In the default floating-point mode, precision means significant digits. Add `std::fixed` to get two
digits after the decimal point: `3.14`.
:::

:::quiz
Which of these manipulators stay in effect after the statement they're used in? (select all that apply)

- [x] `std::hex`
- [x] `std::setfill('0')`
- [ ] `std::setw(5)`
- [x] `std::fixed`

Only `setw` is one-shot. All the others are sticky.
:::

:::exercise Price tag
Read a price and print it with exactly two decimal places.

**Input:** one non-negative number, e.g. `3.5`.
**Output:** `Price: $` followed by the number with two decimals, e.g. `Price: $3.50`.

```cpp starter
#include <iostream>
#include <iomanip>

int main() {
    double price = 0.0;
    std::cin >> price;
    std::cout << "Price: $" << std::setprecision(2) << price << '\n';
}
```

```cpp solution
#include <iostream>
#include <iomanip>

int main() {
    double price = 0.0;
    std::cin >> price;
    std::cout << "Price: $" << std::fixed << std::setprecision(2) << price << '\n';
}
```

```hint
`setprecision(2)` on its own means two *significant* digits. What else do you need?
```

```stdin
3.5
```

```expected
Price: $3.50
```

```stdin
1234.5
```

```expected
Price: $1234.50
```

```stdin
0
```

```expected hidden
Price: $0.00
```

```stdin
2.999
```

```expected hidden
Price: $3.00
```

```checks
must \bfixed\b :: Use std::fixed.
must setprecision :: Use std::setprecision.
```
:::

:::exercise Right-aligned column
Read three integers and print each on its own line, right-aligned in a field 6 characters wide,
between `|` characters.

**Input:** three integers.
**Output:** three lines. For input `42 -7 123456`:

```
|    42|
|    -7|
|123456|
```

Numbers wider than 6 characters are printed in full (the field just grows).

```cpp starter
#include <iostream>
#include <iomanip>

int main() {
    int a = 0, b = 0, c = 0;
    std::cin >> a >> b >> c;
    std::cout << '|' << a << "|\n";
    std::cout << '|' << b << "|\n";
    std::cout << '|' << c << "|\n";
}
```

```cpp solution
#include <iostream>
#include <iomanip>

int main() {
    int a = 0, b = 0, c = 0;
    std::cin >> a >> b >> c;
    std::cout << '|' << std::setw(6) << a << "|\n";
    std::cout << '|' << std::setw(6) << b << "|\n";
    std::cout << '|' << std::setw(6) << c << "|\n";
}
```

```hint
`std::setw(6)` only applies to the next item, so you need it before each number.
```

```stdin
42 -7 123456
```

```expected
|    42|
|    -7|
|123456|
```

```stdin
0 1000000 -99999
```

```expected hidden
|     0|
|1000000|
|-99999|
```

```checks
must setw :: Use std::setw.
```
:::

:::exercise Number bases
Read a non-negative integer and print it in decimal, hexadecimal, octal, and uppercase hexadecimal,
with base prefixes.

**Input:** one integer `n >= 0`.
**Output:** four lines. For input `255`:

```
dec: 255
hex: 0xff
oct: 0377
HEX: 0XFF
```

Use `std::showbase` for the prefixes. Note that with `std::showbase`, zero prints as plain `0` in every
base (so for input `0` every line ends in `0`).

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << "dec: " << n << '\n';
    std::cout << "hex: " << n << '\n';
    std::cout << "oct: " << n << '\n';
    std::cout << "HEX: " << n << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << std::showbase;
    std::cout << "dec: " << std::dec << n << '\n';
    std::cout << "hex: " << std::hex << n << '\n';
    std::cout << "oct: " << std::oct << n << '\n';
    std::cout << "HEX: " << std::uppercase << std::hex << n << '\n';
}
```

```hint
Insert `std::showbase` once. Then switch bases with `std::hex`, `std::oct`, and `std::dec` before each value.
```

```hint
`std::uppercase` turns `0xff` into `0XFF`.
```

```stdin
255
```

```expected
dec: 255
hex: 0xff
oct: 0377
HEX: 0XFF
```

```stdin
10
```

```expected
dec: 10
hex: 0xa
oct: 012
HEX: 0XA
```

```stdin
0
```

```expected hidden
dec: 0
hex: 0
oct: 0
HEX: 0
```

```checks
must \bhex\b :: Use std::hex.
must \boct\b :: Use std::oct.
must showbase :: Use std::showbase for the prefixes.
```
:::

:::exercise Score table
Read names and scores until the end of input, and print them as a table followed by the average.

**Input:** one or more lines, each with a name (one word) and an integer score.
**Output:**

- A header: `Name` left-aligned in a field of 10, then `Score` right-aligned in a field of 6.
- A line of 16 `-` characters.
- One row per person: the name left-aligned in 10 characters, the score right-aligned in 6.
- A last row: `Average` left-aligned in 10, then the average right-aligned in 6 with exactly 2 decimals.

For the input

```
Ada 95
Linus 100
Grace 98
```

the output is:

```
Name       Score
----------------
Ada           95
Linus        100
Grace         98
Average    97.67
```

```cpp starter
#include <iostream>
#include <iomanip>
#include <string>

int main() {
    std::string name;
    int score = 0;
    int total = 0;
    int count = 0;

    std::cout << "Name Score\n";
    while (std::cin >> name >> score) {
        std::cout << name << ' ' << score << '\n';
        total += score;
        ++count;
    }
    std::cout << "Average " << static_cast<double>(total) / count << '\n';
}
```

```cpp solution
#include <iostream>
#include <iomanip>
#include <string>

int main() {
    std::string name;
    int score = 0;
    int total = 0;
    int count = 0;

    std::cout << std::left << std::setw(10) << "Name"
              << std::right << std::setw(6) << "Score" << '\n';
    std::cout << std::setfill('-') << std::setw(16) << "" << std::setfill(' ') << '\n';

    while (std::cin >> name >> score) {
        std::cout << std::left << std::setw(10) << name
                  << std::right << std::setw(6) << score << '\n';
        total += score;
        ++count;
    }

    double average = static_cast<double>(total) / count;
    std::cout << std::left << std::setw(10) << "Average"
              << std::right << std::fixed << std::setprecision(2) << std::setw(6) << average << '\n';
}
```

```hint
Each row is `std::left << std::setw(10) << name << std::right << std::setw(6) << score`.
```

```hint
Draw the dashed line with `std::setfill('-') << std::setw(16) << ""`, then set the fill back to `' '`.
```

```hint
For the average: `std::fixed << std::setprecision(2) << std::setw(6) << average`.
```

```stdin
Ada 95
Linus 100
Grace 98
```

```expected
Name       Score
----------------
Ada           95
Linus        100
Grace         98
Average    97.67
```

```stdin
Bjarne 0
```

```expected hidden
Name       Score
----------------
Bjarne         0
Average     0.00
```

```checks
must setw :: Use std::setw for the columns.
must setfill :: Draw the line with std::setfill.
```
:::

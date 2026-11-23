---
title: "Variables & Types: Challenges"
summary: Hard problems that combine types, literals, initialization, const and conversions. Overflow, rounding, signedness and character codes, all in small real programs.
---

These problems are meant to be **hard**. Each one is a small, realistic program where the obvious
solution compiles, looks right, and is wrong for some inputs: a value overflows, a conversion
truncates, a floating-point number is slightly off, or a `char` prints as a number. Read the
constraints carefully, because they tell you which types you need. Try each problem on your own
before opening the hints, and only look at the solution once you've passed (or truly given up).

You only need what this module and the previous one taught: variables, `std::cin` and `std::cout`,
the built-in types, literals, `const`/`constexpr`, `static_cast`, and the four basic operators
`+ - * /`. (The remainder operator `%` arrives in the next module. You won't need it: the remainder of
`a / b` is `a - a / b * b`.)

:::exercise Paint cans {hard}
A paint shop wants a calculator. A wall's width and height are measured in **centimetres**. One litre
of the chosen paint covers a whole number of **square metres**, and paint is sold only in whole cans of
a fixed size. How many cans does the customer need for one coat, and how many litres is that?

**Input:** four integers `width height coverage canLitres`:
- `width`, `height`: the wall in centimetres (1 ≤ width, height ≤ 1,000,000)
- `coverage`: square metres covered by one litre (1 ≤ coverage ≤ 100)
- `canLitres`: litres in one can (1 ≤ canLitres ≤ 20)

**Output:** two lines:

```
cans: <number of cans>
litres: <cans * canLitres>
```

Buy the **smallest** number of whole cans that covers the whole wall (1 m² = 10,000 cm²). For
`400 300 5 2`, the wall is 12 m² and one can covers 5 × 2 = 10 m², so the answer is `cans: 2` and
`litres: 4`.

```cpp starter
#include <iostream>

int main() {
    // read width, height, coverage and canLitres
    // print cans and litres
}
```

```cpp solution
#include <iostream>

int main() {
    constexpr long long cm2PerM2 = 100 * 100;

    long long width{}, height{}, coverage{}, canLitres{};
    std::cin >> width >> height >> coverage >> canLitres;

    long long area = width * height;                     // in cm²
    long long perCan = coverage * canLitres * cm2PerM2;  // cm² covered by one can
    long long cans = (area + perCan - 1) / perCan;       // divide, rounding up

    std::cout << "cans: " << cans << '\n';
    std::cout << "litres: " << cans * canLitres << '\n';
}
```

```hint
Work in whole square centimetres so nothing is ever rounded by floating point. How big can
`width * height` get? Does it fit in an `int`?
```

```hint
Integer division rounds **down**. For positive `a` and `b`, `(a + b - 1) / b` rounds **up**. Check it
on a wall that one can covers exactly: you must not buy an extra can.
```

```stdin
400 300 5 2
```

```expected
cans: 2
litres: 4
```

```stdin
300 250 10 1
```

```expected
cans: 1
litres: 1
```

```stdin
400 250 10 1
```

```expected hidden
cans: 1
litres: 1
```

```stdin
401 250 10 1
```

```expected hidden
cans: 2
litres: 2
```

```stdin
1000000 1000000 1 1
```

```expected hidden
cans: 100000000
litres: 100000000
```

```stdin
1000000 1000000 100 20
```

```expected hidden
cans: 50000
litres: 1000000
```

```stdin
1 1 100 20
```

```expected hidden
cans: 1
litres: 20
```

```stdin
100 100 1 1
```

```expected hidden
cans: 1
litres: 1
```

```stdin
101 100 1 1
```

```expected hidden
cans: 2
litres: 2
```

```checks
must std::cin :: Read the input with std::cin.
```
:::

:::exercise True difference {hard}
A program stores two counters as `unsigned int`, and someone printed their difference with
`a - b`. When `b` is larger, the result wraps around. Show both the wrapped value and the real one.

**Input:** two integers `a b` (0 ≤ a, b ≤ 4,294,967,295), read into `unsigned int` variables.
**Output:** two lines:

```
wrapped: <a - b computed in unsigned int>
actual: <the mathematically correct a - b, which may be negative>
```

For `3 10`:

```
wrapped: 4294967289
actual: -7
```

```cpp starter
#include <iostream>

int main() {
    unsigned int a{}, b{};
    std::cin >> a >> b;
    std::cout << "wrapped: " << a - b << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    unsigned int a{}, b{};
    std::cin >> a >> b;
    unsigned int wrapped = a - b;
    long long actual = static_cast<long long>(a) - static_cast<long long>(b);
    std::cout << "wrapped: " << wrapped << '\n';
    std::cout << "actual: " << actual << '\n';
}
```

```hint
The difference can be anywhere from -4,294,967,295 to 4,294,967,295. Which signed type can hold all of those?
```

```hint
`static_cast<long long>(a - b)` is too late: the subtraction already wrapped in `unsigned int`.
Convert **each operand** before subtracting.
```

```stdin
3 10
```

```expected
wrapped: 4294967289
actual: -7
```

```stdin
10 3
```

```expected
wrapped: 7
actual: 7
```

```stdin
0 4294967295
```

```expected hidden
wrapped: 1
actual: -4294967295
```

```stdin
4294967295 0
```

```expected hidden
wrapped: 4294967295
actual: 4294967295
```

```stdin
5 5
```

```expected hidden
wrapped: 0
actual: 0
```

```stdin
4294967295 4294967295
```

```expected hidden
wrapped: 0
actual: 0
```

```stdin
2147483648 2147483647
```

```expected hidden
wrapped: 1
actual: 1
```

```checks
must \bunsigned\b :: Read the values into unsigned int variables.
must static_cast :: Convert explicitly with static_cast.
```
:::

:::exercise Caesar shift {hard}
The Caesar cipher replaces each letter with the letter `k` places later in the alphabet, wrapping from
`z` back around to `a`. Encrypt a three-letter word.

**Input:** a three-letter lowercase word, then a shift `k` (0 ≤ k ≤ 1,000,000,000). Read the word as
three `char` variables: `std::cin >> c1 >> c2 >> c3 >> k;` works because `>>` into a `char` reads one
character.
**Output:** the encrypted three-letter word, newline. For `xyz 3` print `abc`; for `hal 1` print `ibm`.

```cpp starter
#include <iostream>

int main() {
    char c1{}, c2{}, c3{};
    int k{};
    std::cin >> c1 >> c2 >> c3 >> k;
    std::cout << c1 + k << c2 + k << c3 + k << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    constexpr int letters = 26;

    char c1{}, c2{}, c3{};
    int k{};
    std::cin >> c1 >> c2 >> c3 >> k;

    int p1 = c1 - 'a' + k;    // position 0-25, plus the shift
    int p2 = c2 - 'a' + k;
    int p3 = c3 - 'a' + k;
    p1 = p1 - p1 / letters * letters;   // remainder after dividing by 26
    p2 = p2 - p2 / letters * letters;
    p3 = p3 - p3 / letters * letters;

    std::cout << static_cast<char>('a' + p1) << static_cast<char>('a' + p2)
              << static_cast<char>('a' + p3) << '\n';
}
```

```hint
Turn each letter into a position: `c - 'a'` is 0 for `a` and 25 for `z`. Add `k`, wrap the position
back into 0-25, then turn it back into a letter with `'a' + position`.
```

```hint
"Wrap into 0-25" means "the remainder after dividing by 26": `p - p / 26 * 26`. And `'a' + p` is an
`int`, which prints as a number: cast it with `static_cast<char>`.
```

```stdin
xyz 3
```

```expected
abc
```

```stdin
hal 1
```

```expected
ibm
```

```stdin
zzz 25
```

```expected hidden
yyy
```

```stdin
cat 0
```

```expected hidden
cat
```

```stdin
cat 26
```

```expected hidden
cat
```

```stdin
abc 1000000000
```

```expected hidden
mno
```

```stdin
aaa 1000000000
```

```expected hidden
mmm
```

```stdin
xyz 52
```

```expected hidden
xyz
```

```checks
must static_cast\s*<\s*char\s*> :: Convert the positions back to letters with static_cast<char>.
```
:::

:::exercise Exact total {hard}
A checkout prints the total cost of `q` identical items. Prices have at most two decimal places, but
`double` can't store most of them exactly (`0.29` is really `0.28999999999999998`), and the total must
be **exact to the cent**. Convert the price to a whole number of cents first, then do all the math with
integers.

**Input:** a price `p` (0 ≤ p ≤ 1,000,000, at most two decimal places) and a quantity `q`
(0 ≤ q ≤ 1,000,000).
**Output:** the total as `$<dollars>.<cents>`, where cents is always **exactly two digits**, newline.
For `19.99 3` print `$59.97`; for `4.35 100` print `$435.00`.

```cpp starter
#include <iostream>

int main() {
    double price{};
    int quantity{};
    std::cin >> price >> quantity;
    std::cout << '$' << price * quantity << '\n';
}
```

```cpp solution
#include <cmath>
#include <iostream>

int main() {
    double price{};
    long long quantity{};
    std::cin >> price >> quantity;

    long long priceCents = std::llround(price * 100);
    long long total = priceCents * quantity;
    long long dollars = total / 100;
    long long cents = total - dollars * 100;
    long long tens = cents / 10;
    long long ones = cents - tens * 10;

    std::cout << '$' << dollars << '.' << tens << ones << '\n';
}
```

```hint
`price * 100` might be `434.99999999999994` instead of `435`. Round it to the nearest whole number
(`std::round` or `std::llround` from `<cmath>`) before converting it to an integer type.
```

```hint
The largest total is 10¹⁴ cents: use `long long`. To always print two digits for the cents, print the
tens digit and the ones digit separately.
```

```stdin
19.99 3
```

```expected
$59.97
```

```stdin
4.35 100
```

```expected
$435.00
```

```stdin
0.29 1
```

```expected hidden
$0.29
```

```stdin
0.05 3
```

```expected hidden
$0.15
```

```stdin
0 5
```

```expected hidden
$0.00
```

```stdin
1000000 1000000
```

```expected hidden
$1000000000000.00
```

```stdin
0.01 1000000
```

```expected hidden
$10000.00
```

```stdin
1.1 3
```

```expected hidden
$3.30
```

```stdin
19.99 0
```

```expected hidden
$0.00
```

```stdin
0.07 1
```

```expected hidden
$0.07
```

```checks
must \bround\s*\(|\bllround\s*\(|\blround\s*\( :: Round the price to whole cents.
```
:::

:::exercise Byte reinterpretation {hard}
A sensor sends single bytes, and the same 8 bits mean different numbers depending on whether you
read them as **signed** (`std::int8_t`, −128 to 127, two's complement) or **unsigned**
(`std::uint8_t`, 0 to 255). Converting an integer to an 8-bit type keeps only its value modulo 256
(well-defined since C++20).

**Input:** one integer `n` (−128 ≤ n ≤ 255).
**Output:** two lines, the same 8 bits read both ways:

```
signed: <n converted to std::int8_t>
unsigned: <n converted to std::uint8_t>
```

For `200`:

```
signed: -56
unsigned: 200
```

```cpp starter
#include <cstdint>
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    std::cout << "signed: " << n << '\n';
    std::cout << "unsigned: " << n << '\n';
}
```

```cpp solution
#include <cstdint>
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    std::int8_t asSigned = static_cast<std::int8_t>(n);
    std::uint8_t asUnsigned = static_cast<std::uint8_t>(n);
    std::cout << "signed: " << static_cast<int>(asSigned) << '\n';
    std::cout << "unsigned: " << static_cast<int>(asUnsigned) << '\n';
}
```

```hint
`static_cast<std::int8_t>(n)` and `static_cast<std::uint8_t>(n)` do the conversion: there's no math to
write yourself.
```

```hint
Remember the pitfall from **Fundamental Types**: `std::cout` prints `std::int8_t` and
`std::uint8_t` as **characters**. Convert them to `int` before printing.
```

```stdin
200
```

```expected
signed: -56
unsigned: 200
```

```stdin
-1
```

```expected
signed: -1
unsigned: 255
```

```stdin
127
```

```expected hidden
signed: 127
unsigned: 127
```

```stdin
128
```

```expected hidden
signed: -128
unsigned: 128
```

```stdin
0
```

```expected hidden
signed: 0
unsigned: 0
```

```stdin
-128
```

```expected hidden
signed: -128
unsigned: 128
```

```stdin
255
```

```expected hidden
signed: -1
unsigned: 255
```

```stdin
-56
```

```expected hidden
signed: -56
unsigned: 200
```

```checks
must int8_t :: Use the fixed-width 8-bit types from <cstdint>.
must static_cast :: Convert with static_cast.
```
:::

:::quiz
What does this print? (`int` is 32 bits.)

```cpp
unsigned int u = 1;
int i = -2;
std::cout << u + i << ' ' << (i < u);
```

- [ ] `-1 1`
- [ ] `-1 0`
- [x] `4294967295 0`
- [ ] `4294967295 1`

In both expressions `i` is converted to `unsigned int`, becoming 4294967294. So `u + i` is
4294967295 (it never becomes negative), and `i < u` compares 4294967294 with 1: false, printed as `0`.
:::

:::quiz
What does this print?

```cpp
char c = 'A' + 2;
auto d = c + 1;
std::cout << c << d << sizeof(d);
```

- [ ] `CD1`
- [ ] `CD4`
- [x] `C684`
- [ ] `C681`

`c` is the `char` `'C'` (67), which prints as a letter. But `c + 1` promotes `c` to `int`, so `auto`
deduces `int`: `d` prints as the number 68, and `sizeof(d)` is `sizeof(int)`, 4.
:::

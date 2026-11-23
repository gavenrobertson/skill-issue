---
title: Bitwise Operators
summary: Working with individual bits. Binary representation, & | ^ ~ << >>, masks, setting/clearing/toggling/testing bits, shift caveats, and std::bitset for printing.
---

## Numbers are bits

Every integer is stored in **binary**, as a fixed number of bits (binary digits, 0 or 1). Each bit
position stands for a power of two, counting from **bit 0** on the right:

```
bit:        7    6    5    4    3    2    1    0
value:    128   64   32   16    8    4    2    1

   13  =    0    0    0    0    1    1    0    1     (8 + 4 + 1)
```

So `13` is `0b00001101`. **Bitwise operators** work on these bits directly, one position at a time.
They're used for flags and options packed into one integer, file formats and network protocols,
graphics (colors), hashing, and fast tricks with powers of two.

## Printing bits: std::bitset

To *see* the bits, use `std::bitset<N>` from `<bitset>`. It holds `N` bits and prints them as 0s and 1s:

```cpp run
#include <bitset>
#include <iostream>

int main() {
    int n = 13;
    std::cout << std::bitset<8>(n) << '\n';      // the low 8 bits of 13
    std::cout << std::bitset<16>(300) << '\n';
    std::cout << std::bitset<32>(-5) << '\n';    // negative numbers use two's complement
}
```

```output
00001101
0000000100101100
11111111111111111111111111111011
```

Since C++20, signed integers are guaranteed to use **two's complement**: `-x` is stored as `~x + 1`
(flip all bits, add one), which is why `-5` is all ones except bit 2.

`std::bitset` can do more: `.count()` (number of 1 bits), `.test(i)`, `.set(i)`, `.reset(i)`,
`.flip(i)`, `.to_ulong()`, and it can be built from a string like `std::bitset<8>("10110")`.

## The six bitwise operators

| Operator | Name | Each result bit is 1 when... |
| --- | --- | --- |
| `a & b` | AND | both bits are 1 |
| `a \| b` | OR | at least one bit is 1 |
| `a ^ b` | XOR (exclusive or) | the bits are **different** |
| `~a` | NOT (complement) | the bit of `a` is 0 (flips every bit) |
| `a << n` | left shift | bits move `n` places left; zeros come in on the right |
| `a >> n` | right shift | bits move `n` places right |

```
      a = 1100          a = 1100          a = 1100          a = 1100
      b = 1010          b = 1010          b = 1010
  a & b = 1000      a | b = 1110      a ^ b = 0110      a << 1 = 11000
```

```cpp run
#include <bitset>
#include <iostream>

int main() {
    unsigned int a = 0b1100;   // 12
    unsigned int b = 0b1010;   // 10

    std::cout << "a & b  = " << std::bitset<8>(a & b) << " = " << (a & b) << '\n';
    std::cout << "a | b  = " << std::bitset<8>(a | b) << " = " << (a | b) << '\n';
    std::cout << "a ^ b  = " << std::bitset<8>(a ^ b) << " = " << (a ^ b) << '\n';
    std::cout << "~a     = " << std::bitset<8>(~a) << " (low 8 bits of " << ~a << ")\n";
    std::cout << "a << 2 = " << std::bitset<8>(a << 2) << " = " << (a << 2) << '\n';
    std::cout << "a >> 2 = " << std::bitset<8>(a >> 2) << " = " << (a >> 2) << '\n';
}
```

```output
a & b  = 00001000 = 8
a | b  = 00001110 = 14
a ^ b  = 00000110 = 6
~a     = 11110011 (low 8 bits of 4294967283)
a << 2 = 00110000 = 48
a >> 2 = 00000011 = 3
```

Note that `~a` flips **all 32 bits** of the `unsigned int`, not just the 8 we printed.

**Shifting** by `n` multiplies (`<<`) or divides (`>>`) by 2ⁿ, for non-negative values: `1 << 10` is
1024, `x >> 1` is `x / 2`. And `1u << n` is the number with only bit `n` set, the basis of masks.

> **Pitfall:** Bitwise `&` and `|` are not logical `&&` and `||`. `&` and `|` work on every bit and
> **always evaluate both sides** (no short-circuit). `2 & 1` is `0` (no common bits), while `2 && 1` is `true`.

## Masks: set, clear, toggle, test

A **mask** is a value with 1s in the bit positions you care about. With masks you can manipulate
individual bits:

| Goal | Expression | Why it works |
| --- | --- | --- |
| **set** bit `n` (make it 1) | `x \|= (1u << n)` | OR with 1 forces a 1; OR with 0 keeps the bit |
| **clear** bit `n` (make it 0) | `x &= ~(1u << n)` | the mask has a 0 only at `n`; AND with 0 forces 0 |
| **toggle** bit `n` (flip it) | `x ^= (1u << n)` | XOR with 1 flips; XOR with 0 keeps |
| **test** bit `n` | `(x >> n) & 1u` or `(x & (1u << n)) != 0` | isolate the bit |

```cpp run
#include <bitset>
#include <iostream>

int main() {
    unsigned int x = 0b0000'1010;
    std::cout << "start   " << std::bitset<8>(x) << '\n';

    x |= (1u << 0);
    std::cout << "set 0   " << std::bitset<8>(x) << '\n';

    x &= ~(1u << 3);
    std::cout << "clear 3 " << std::bitset<8>(x) << '\n';

    x ^= (1u << 7);
    std::cout << "flip 7  " << std::bitset<8>(x) << '\n';

    std::cout << "bit 1 is " << ((x >> 1) & 1u) << ", bit 2 is " << ((x >> 2) & 1u) << '\n';

    unsigned int lowNibble = x & 0x0F;       // keep only the low 4 bits
    std::cout << "low 4 bits: " << std::bitset<8>(lowNibble) << '\n';
}
```

```output
start   00001010
set 0   00001011
clear 3 00000011
flip 7  10000011
bit 1 is 1, bit 2 is 0
low 4 bits: 00000011
```

A classic use is a set of **flags** packed into one integer:

```cpp run
#include <iostream>

int main() {
    constexpr unsigned int canRead = 1u << 0;    // 0b001
    constexpr unsigned int canWrite = 1u << 1;   // 0b010
    constexpr unsigned int canExecute = 1u << 2; // 0b100

    unsigned int permissions = canRead | canWrite;    // combine flags with |
    std::cout << std::boolalpha;
    std::cout << "write? " << ((permissions & canWrite) != 0) << '\n';
    std::cout << "exec?  " << ((permissions & canExecute) != 0) << '\n';

    permissions &= ~canWrite;                         // revoke write
    std::cout << "write? " << ((permissions & canWrite) != 0) << '\n';
}
```

```output
write? true
exec?  false
write? false
```

Two more neat tricks: `x & 1` is `1` for odd numbers (the lowest bit), and `x & (x - 1)` clears the
lowest set bit, so it's `0` exactly when `x` is a power of two (or zero).

## Precedence trap: & vs ==

The bitwise operators `&`, `^` and `|` have **lower precedence than `==` and `!=`**, a historical
accident from C. So this doesn't do what it looks like:

```cpp run warns
#include <iostream>

int main() {
    int x = 6;
    std::cout << (x & 1 == 0) << '\n';     // x & (1 == 0)  ->  6 & 0  ->  0
    std::cout << ((x & 1) == 0) << '\n';   // what we meant: is x even? 1 (true)
}
```

```output
0
1
```

GCC warns: `suggest parentheses around comparison in operand of '&'`. **Always parenthesize** bitwise
expressions inside comparisons.

## Shift and signedness caveats

Bitwise operations are cleanest on **unsigned** types. Things to know:

- **Shifting by a negative amount, or by ≥ the number of bits in the (promoted) type, is undefined
  behavior.** `1u << 32` with a 32-bit `unsigned` is UB, not 0. Use `1ull << 40` for big shifts.
- **Left-shifting signed values**: since C++20 it's defined (the bits simply move, modulo 2ⁿ),
  but before C++20, shifting a negative number or shifting a 1 into the sign bit was UB.
- **Right-shifting negative values** is an **arithmetic** shift since C++20: the sign bit is copied in
  from the left, so `-16 >> 2` is `-4` (it rounds toward negative infinity: `-1 >> 10` is `-1`). Before
  C++20 this was implementation-defined.
- Small types are **promoted to `int`** first. `~` on a `std::uint8_t` holding 0 gives the **`int` -1**,
  not 255. Cast back if you need the small type: `static_cast<std::uint8_t>(~small)`.

```cpp run
#include <cstdint>
#include <iostream>

int main() {
    int negative = -16;
    std::cout << (negative >> 2) << ' ' << (negative << 1) << '\n';   // -4 -32 (C++20)

    std::uint8_t small = 0;
    std::cout << ~small << ' ' << +static_cast<std::uint8_t>(~small) << '\n';  // -1 255
}
```

```output
-4 -32
-1 255
```

## C++20 bit utilities: <bit>

The `<bit>` header has ready-made, fast functions for unsigned integers:

```cpp run
#include <bit>
#include <iostream>

int main() {
    unsigned int x = 0b1011'0000;   // 176
    std::cout << std::popcount(x) << '\n';        // number of 1 bits: 3
    std::cout << std::countr_zero(x) << '\n';     // trailing zeros: 4
    std::cout << std::bit_width(x) << '\n';       // bits needed: 8
    std::cout << std::boolalpha << std::has_single_bit(64u) << '\n';   // power of two? true
}
```

```output
3
4
8
true
```

:::quiz
What is `0b0110 ^ 0b0011`?

- [ ] `0b0010`
- [ ] `0b0111`
- [x] `0b0101`
- [ ] `0b1001`

XOR sets a bit where the two inputs differ: bits 0 and 2 differ, bit 1 is 1 in both, so the result is `0101` (5).
:::

:::quiz
Which expression **clears** bit 4 of `unsigned x` and leaves the other bits alone?

- [ ] `x |= (1u << 4);`
- [x] `x &= ~(1u << 4);`
- [ ] `x ^= (1u << 4);`
- [ ] `x &= (1u << 4);`

`~(1u << 4)` has every bit set except bit 4. ANDing with it clears bit 4 and keeps everything else.
`|=` sets, `^=` toggles, and `&= (1u << 4)` would clear everything **except** bit 4.
:::

:::quiz
What does this print?

```cpp
int x = 4;
std::cout << (x & 4 == 4);
```

- [ ] `1`
- [x] `0`
- [ ] `true`
- [ ] It doesn't compile

`==` binds tighter than `&`, so it's `x & (4 == 4)`, which is `4 & 1`, which is `0`, even though bit 2
of `x` is set. Write `(x & 4) == 4`. GCC warns about the missing parentheses.
:::

:::exercise Show the bits
Read a number between 0 and 255 and print its 8-bit binary representation using `std::bitset<8>`.

**Input:** one integer `n` (0 ≤ n ≤ 255).
**Output:** exactly 8 binary digits, newline. For `5` print `00000101`.

```cpp starter
#include <bitset>
#include <iostream>

int main() {
    unsigned int n{};
    std::cin >> n;
    std::cout << n << '\n';
}
```

```cpp solution
#include <bitset>
#include <iostream>

int main() {
    unsigned int n{};
    std::cin >> n;
    std::cout << std::bitset<8>(n) << '\n';
}
```

```hint
`std::bitset<8>(n)` makes an 8-bit bitset from `n`, and `std::cout` prints it as 0s and 1s.
```

```stdin
5
```

```expected
00000101
```

```stdin
0
```

```expected hidden
00000000
```

```stdin
255
```

```expected hidden
11111111
```

```checks
must bitset\s*<\s*8\s*> :: Use std::bitset<8>.
```
:::

:::exercise Bit toolkit
Read an unsigned integer `x` and a bit index `n` (0-31). Print four lines, each computed from the
**original** `x`:

1. `x` with bit `n` **set**
2. `x` with bit `n` **cleared**
3. `x` with bit `n` **toggled**
4. the value of bit `n` (`0` or `1`)

**Input:** two integers `x n`.
**Output:** four lines with decimal numbers. For `10 0` (10 is `1010`) print `11`, `10`, `11`, `0`.

```cpp starter
#include <iostream>

int main() {
    unsigned int x{}, n{};
    std::cin >> x >> n;
    std::cout << x << '\n' << x << '\n' << x << '\n' << 0 << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    unsigned int x{}, n{};
    std::cin >> x >> n;
    unsigned int mask = 1u << n;
    std::cout << (x | mask) << '\n';
    std::cout << (x & ~mask) << '\n';
    std::cout << (x ^ mask) << '\n';
    std::cout << ((x >> n) & 1u) << '\n';
}
```

```hint
Build the mask once: `unsigned int mask = 1u << n;`
```

```hint
set: `x | mask`, clear: `x & ~mask`, toggle: `x ^ mask`, test: `(x >> n) & 1u`. Parenthesize them inside `std::cout <<`.
```

```stdin
10 0
```

```expected
11
10
11
0
```

```stdin
10 1
```

```expected
10
8
8
1
```

```stdin
0 31
```

```expected hidden
2147483648
0
2147483648
0
```

```stdin
4294967295 4
```

```expected hidden
4294967295
4294967279
4294967279
1
```

```checks
must << :: Build the mask with a shift.
must \| :: Use | to set the bit.
must ~ :: Use ~ to build the clear mask.
must \^ :: Use ^ to toggle the bit.
must & :: Use & to clear and test.
```
:::

:::exercise Lowest set bit
Read a non-negative integer `x` and print the value of its **lowest set bit** (the smallest power of
two in its binary representation), or `0` if `x` is 0. Use bitwise operators only (no loops): for an
unsigned `x`, the expression `x & (~x + 1)` does exactly this.

**Input:** one integer `x` (0 ≤ x ≤ 4,000,000,000).
**Output:** the lowest set bit's value, newline. For `12` (`1100`) print `4`.

```cpp starter
#include <iostream>

int main() {
    unsigned int x{};
    std::cin >> x;
    std::cout << x << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    unsigned int x{};
    std::cin >> x;
    std::cout << (x & (~x + 1)) << '\n';
}
```

```hint
`~x + 1` is the two's complement negation of `x`: all bits above the lowest set bit are flipped, and that bit itself stays 1.
```

```hint
ANDing `x` with `~x + 1` keeps only the bit they have in common: the lowest set bit.
```

```stdin
12
```

```expected
4
```

```stdin
7
```

```expected
1
```

```stdin
0
```

```expected hidden
0
```

```stdin
1024
```

```expected hidden
1024
```

```stdin
4000000000
```

```expected hidden
2048
```

```checks
must & :: Use the & operator.
must ~ :: Use the ~ operator.
```
:::

:::exercise Pack a color
Colors are often stored as one integer `0xRRGGBB`: red in bits 16-23, green in bits 8-15, blue in bits
0-7. Read `r`, `g` and `b` (0-255 each) and pack them with shifts and `|`. Print the packed value in
decimal, then in hexadecimal.

**Input:** three integers `r g b`.
**Output:** `<decimal> 0x<hex>` with lowercase hex digits and no leading zeros (use `std::hex`), newline.
For `255 128 0` print `16744448 0xff8000`.

```cpp starter
#include <iostream>

int main() {
    unsigned int r{}, g{}, b{};
    std::cin >> r >> g >> b;
    unsigned int color = r + g + b;
    std::cout << color << " 0x" << color << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    unsigned int r{}, g{}, b{};
    std::cin >> r >> g >> b;
    unsigned int color = (r << 16) | (g << 8) | b;
    std::cout << color << " 0x" << std::hex << color << '\n';
}
```

```hint
Red must move up 16 bits: `r << 16`. Green moves up 8: `g << 8`. Blue stays.
```

```hint
Combine with `|`, then print `std::hex << color` after the `0x`.
```

```stdin
255 128 0
```

```expected
16744448 0xff8000
```

```stdin
0 0 0
```

```expected hidden
0 0x0
```

```stdin
18 52 86
```

```expected hidden
1193046 0x123456
```

```stdin
255 255 255
```

```expected hidden
16777215 0xffffff
```

```checks
must <<\s*16 :: Shift red left by 16.
must <<\s*8 :: Shift green left by 8.
must \| :: Combine the parts with |.
must std::hex :: Print the hex value with std::hex.
```
:::

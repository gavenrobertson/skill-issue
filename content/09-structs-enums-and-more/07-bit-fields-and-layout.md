---
title: Memory Layout & Bit-fields
summary: Why a struct is often bigger than its members, alignment and padding, sizeof and alignof, ordering members to save space, and packing small values with bit-fields.
---

You know how to define structs. This lesson looks at how they're actually laid out in memory. Most of
the time you don't need to care, but when you store millions of objects, send data over a network, or
talk to hardware, the layout matters.

## Surprise: a struct is bigger than its members

```cpp run
#include <iostream>

struct Record {
    char tag;     // 1 byte
    int id;       // 4 bytes
    char flag;    // 1 byte
};

int main() {
    std::cout << "members: " << sizeof(char) + sizeof(int) + sizeof(char) << " bytes\n";
    std::cout << "struct:  " << sizeof(Record) << " bytes\n";
}
```

```output
members: 6 bytes
struct:  12 bytes
```

Six bytes of data in a twelve-byte struct. The other six are **padding**, empty bytes the compiler
inserts on purpose. To see why, you need **alignment**.

## Alignment

CPUs read memory most efficiently (and on some processors, *only*) when a value sits at an address that
is a multiple of its size. A 4-byte `int` wants an address divisible by 4; an 8-byte `double` wants a
multiple of 8. That requirement is the type's **alignment**, and `alignof` reports it:

```cpp run
#include <iostream>

int main() {
    std::cout << "type     size align\n";
    std::cout << "char     " << sizeof(char) << "    " << alignof(char) << '\n';
    std::cout << "short    " << sizeof(short) << "    " << alignof(short) << '\n';
    std::cout << "int      " << sizeof(int) << "    " << alignof(int) << '\n';
    std::cout << "double   " << sizeof(double) << "    " << alignof(double) << '\n';
    std::cout << "int*     " << sizeof(int*) << "    " << alignof(int*) << '\n';
}
```

```output
type     size align
char     1    1
short    2    2
int      4    4
double   8    8
int*     8    8
```

(These are the values on 64-bit Linux; alignment is platform-specific, but for fundamental types it's
usually equal to the size.)

## How the compiler lays out a struct

The rules are simple:

1. Members are stored **in declaration order**. The compiler never reorders them.
2. Each member is placed at the next offset that is a **multiple of its alignment**. Bytes skipped to get
   there are padding.
3. The struct's own alignment is the **largest** alignment of its members, and its total size is rounded
   **up to a multiple of that**, so that in an array, every element is aligned too.

Applied to `Record`:

```
offset:  0     1     2     3     4     5     6     7     8     9    10    11
       +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
       | tag | pad | pad | pad |          id           |flag | pad | pad | pad |
       +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
```

- `tag` at offset 0.
- `id` needs a multiple of 4: offsets 1 to 3 are padding, `id` goes at 4.
- `flag` at offset 8.
- The struct's alignment is 4 (from `int`), so its size rounds up from 9 to **12**.

You can check offsets yourself with the `offsetof` macro from `<cstddef>`:

```cpp run
#include <cstddef>
#include <iostream>

struct Record {
    char tag;
    int id;
    char flag;
};

int main() {
    std::cout << "tag  at " << offsetof(Record, tag) << '\n';
    std::cout << "id   at " << offsetof(Record, id) << '\n';
    std::cout << "flag at " << offsetof(Record, flag) << '\n';
    std::cout << "size    " << sizeof(Record) << ", align " << alignof(Record) << '\n';
}
```

```output
tag  at 0
id   at 4
flag at 8
size    12, align 4
```

## Ordering members to save space

Because padding depends on order, **sorting members from largest to smallest alignment** usually
minimizes it:

```cpp run
#include <iostream>

struct Wasteful {
    char a;      // 1 + 7 padding
    double b;    // 8
    char c;      // 1 + 3 padding
    int d;       // 4
};               // = 24

struct Compact {
    double b;    // 8
    int d;       // 4
    char a;      // 1
    char c;      // 1 + 2 padding at the end
};               // = 16

int main() {
    std::cout << sizeof(Wasteful) << ' ' << sizeof(Compact) << '\n';
}
```

```output
24 16
```

Same data, a third less memory. For one object it doesn't matter; for a `std::vector` of ten million
of them, it's 80 MB saved, and more objects fit in the CPU cache, which makes code faster.

> **Tip:** Don't contort readable code for a few bytes. Order members logically first, and optimize the
> layout only for types you create in large numbers.

A few more facts:

- An **empty struct** (`struct E {};`) has size **1**, not 0, so that two different objects always
  have different addresses.
- Arrays have no padding *between* elements beyond what's already inside each element:
  `sizeof(T[n]) == n * sizeof(T)`.
- Nested structs keep their own padding and alignment.

### Controlling alignment and packing

You can *increase* a type's alignment with `alignas` (useful for SIMD instructions and cache-line tricks):

```cpp
struct alignas(16) Vec4 { float x, y, z, w; };   // alignof(Vec4) == 16
alignas(64) int counter = 0;                      // start on its own 64-byte cache line
```

Compilers also offer non-standard ways to **remove** padding, such as `#pragma pack(1)` or GCC's
`__attribute__((packed))`. Packed structs match byte-exact file or network formats, but accessing
misaligned members can be slower or even crash on some CPUs, and you can't safely take pointers to them.
Avoid them unless you're matching an external format exactly.

## Bit-fields

Sometimes values are so small that even a `char` is wasteful: a day of the month (1 to 31) needs only 5
bits; a boolean flag needs 1. A **bit-field** declares a member that occupies a specific number of
**bits**, written as `type name : width;`:

```cpp run
#include <iostream>

struct Date {
    unsigned day : 5;     // 0..31     (2^5 - 1 = 31)
    unsigned month : 4;   // 0..15
    unsigned year : 12;   // 0..4095
};                        // 21 bits in total: fits in one 4-byte unsigned

struct DateWide {
    unsigned day;
    unsigned month;
    unsigned year;
};

int main() {
    Date d{24, 12, 2025};             // initialize like a normal struct
    std::cout << d.day << '/' << d.month << '/' << d.year << '\n';

    d.month = 1;                      // read and write like normal members
    d.year += 1;
    std::cout << d.day << '/' << d.month << '/' << d.year << '\n';

    std::cout << sizeof(Date) << " vs " << sizeof(DateWide) << " bytes\n";
}
```

```output
24/12/2025
24/1/2026
4 vs 12 bytes
```

Bit-fields are a convenient way to store **flags** too. Use `bool` (or `unsigned`) with width 1:

```cpp run
#include <iostream>

struct TextStyle {
    bool bold : 1 = false;        // C++20: default member initializers for bit-fields
    bool italic : 1 = false;
    bool underline : 1 = false;
    unsigned size : 5 = 12;       // font size 0..31
};

int main() {
    TextStyle s;
    s.bold = true;
    s.size = 20;
    std::cout << s.bold << s.italic << s.underline << ' ' << s.size << '\n';
    std::cout << sizeof(TextStyle) << " byte(s)\n";
}
```

```output
100 20
4 byte(s)
```

(The struct is 4 bytes because `unsigned` bit-fields are allocated inside `unsigned`-sized units. With
`unsigned char size : 5`, the whole struct would fit in a single byte.)

### Bit-field rules and gotchas

**Values that don't fit are cut off.** Assigning 40 to a 5-bit field keeps only the low 5 bits, giving 8.
GCC warns when it can see this at compile time:

```cpp run warns
#include <iostream>

struct Date {
    unsigned day : 5;
    unsigned month : 4;
};

int main() {
    Date d{1, 1};
    d.day = 40;               // warning: conversion changes value from '40' to '8'
    std::cout << d.day << '\n';
}
```

```output
8
```

**Prefer unsigned types.** A signed bit-field of width 3 holds -4 to 3, which surprises people who expect
0 to 7.

**You can't take the address of a bit-field** (it may not start on a byte boundary), and you can't bind a
non-const reference to one:

```cpp compile-error
struct Flags {
    unsigned ready : 1;
};

int main() {
    Flags f{1};
    unsigned* p = &f.ready;   // error: attempt to take address of bit-field
}
```

**The exact layout is implementation-defined.** The order of bits within a unit, and whether a field may
straddle two units, differ between compilers and CPUs. So don't use bit-fields to match a byte-exact file
format or network protocol; use explicit shifting and masking (`(value >> 5) & 0xF`) instead.

**An unnamed bit-field** reserves space without a name (`unsigned : 3;`), and a width of zero
(`unsigned : 0;`) forces the next bit-field to start in a new unit. These are mostly used for hardware
register layouts.

> **Note:** For a fixed-size set of flags that you index by number, `std::bitset<N>` (from `<bitset>`)
> is often more convenient than bit-fields. For flags named by an enum, enum values with explicit powers
> of two and the bitwise operators work well, as in the enums lesson.

:::quiz
On this site's compiler, what is `sizeof(S)`?

```cpp
struct S {
    char a;
    double b;
};
```

- [ ] `9`
- [ ] `10`
- [x] `16`
- [ ] `24`

`b` needs an offset that's a multiple of 8, so 7 padding bytes follow `a`, putting `b` at offset 8. The
total, 16, is already a multiple of the struct's alignment (8).
:::

:::quiz
Which statements about bit-fields are true? (select all that apply)

- [x] `unsigned flag : 1;` can hold 0 or 1
- [ ] You can take a pointer to a bit-field member
- [x] Assigning a value too big for the field keeps only the low bits
- [ ] Their exact memory layout is the same on every compiler

You can't take the address of a bit-field, and bit-field layout is implementation-defined, which is why
they're unsuitable for byte-exact file formats.
:::

:::exercise Reorder for size
The `Record` struct in the starter wastes space on padding. **Reorder its members** (don't remove,
rename, or change their types) so that `sizeof(Record)` is as small as possible: 16 bytes on this
compiler. Don't use packing pragmas or attributes.

The program reads how many records you want to store and prints how many bytes they take.

**Input:** a non-negative integer `n`.
**Output:** `<n> records = <n * sizeof(Record)> bytes`, followed by a newline.

```cpp starter
#include <iostream>

struct Record {
    char tag;
    double value;
    char flag;
    int id;
};

int main() {
    long long n;
    std::cin >> n;
    std::cout << n << " records = " << n * sizeof(Record) << " bytes\n";
}
```

```cpp solution
#include <iostream>

struct Record {
    double value;
    int id;
    char tag;
    char flag;
};

int main() {
    long long n;
    std::cin >> n;
    std::cout << n << " records = " << n * sizeof(Record) << " bytes\n";
}
```

```hint
Put the members with the biggest alignment first: `double`, then `int`, then the two `char`s.
```

```stdin
1
```

```expected
16 records = 16 bytes
```

```stdin
1000
```

```expected
1000 records = 16000 bytes
```

```stdin
0
```

```expected hidden
0 records = 0 bytes
```

```checks
must double\s+value\s*; :: Keep the member double value.
must int\s+id\s*; :: Keep the member int id.
must char\s+tag\s*; :: Keep the member char tag.
must char\s+flag\s*; :: Keep the member char flag.
mustnot pragma|packed|alignas :: Reorder the members instead of packing them.
```
:::

:::exercise Packed date
Define a `Date` struct using **bit-fields**: `day` (5 bits), `month` (4 bits), and `year` (12 bits), all
`unsigned`. Read a date, store it in a `Date`, and print it together with the struct's size.

**Input:** three integers `day month year` (valid: day 1 to 31, month 1 to 12, year 0 to 4095).
**Output:** `<day>/<month>/<year> in <sizeof(Date)> bytes`, followed by a newline.

Example: `24 12 2025` prints `24/12/2025 in 4 bytes`.

```cpp starter
#include <iostream>

struct Date {
    unsigned day;
    unsigned month;
    unsigned year;
};

int main() {
    unsigned d, m, y;
    std::cin >> d >> m >> y;
    Date date{d, m, y};
    std::cout << date.day << '/' << date.month << '/' << date.year
              << " in " << sizeof(Date) << " bytes\n";
}
```

```cpp solution
#include <iostream>

struct Date {
    unsigned day : 5;
    unsigned month : 4;
    unsigned year : 12;
};

int main() {
    unsigned d, m, y;
    std::cin >> d >> m >> y;
    Date date{};
    date.day = d;
    date.month = m;
    date.year = y;
    std::cout << date.day << '/' << date.month << '/' << date.year
              << " in " << sizeof(Date) << " bytes\n";
}
```

```hint
A bit-field member is declared as `unsigned day : 5;`.
```

```hint
Brace-initializing bit-fields from variables is a narrowing conversion (`unsigned` into 5 bits), so assign
the members one by one instead: `date.day = d;`.
```

```stdin
24 12 2025
```

```expected
24/12/2025 in 4 bytes
```

```stdin
1 1 0
```

```expected
1/1/0 in 4 bytes
```

```stdin
31 12 4095
```

```expected hidden
31/12/4095 in 4 bytes
```

```checks
must day\s*:\s*5\s*; :: Declare day as a 5-bit field (unsigned day : 5;).
must month\s*:\s*4\s*; :: Declare month as a 4-bit field.
must year\s*:\s*12\s*; :: Declare year as a 12-bit field.
```
:::

:::exercise Layout calculator
Simulate the compiler's layout rules. Read a list of member types and compute the size of a struct with
those members **in that order**, plus how many of its bytes are padding.

Use `sizeof` and `alignof` to get each type's size and alignment, then apply the rules from the lesson:
place each member at the next offset that's a multiple of its alignment, and round the total up to a
multiple of the largest alignment.

**Input:** `n` (1 or more), then `n` type names, each one of `char`, `short`, `int`, `double`.
**Output:** `size=<size> padding=<padding>`, followed by a newline, where `padding` is the size minus the
sum of the member sizes.

Example: `3` / `char int char` prints `size=12 padding=6`.

```cpp starter
#include <iostream>
#include <string>

int main() {
    int n;
    std::cin >> n;
    std::size_t total = 0;
    for (int i = 0; i < n; ++i) {
        std::string type;
        std::cin >> type;
        if (type == "char") total += 1;
        else if (type == "short") total += 2;
        else if (type == "int") total += 4;
        else total += 8;
    }
    std::cout << "size=" << total << " padding=0\n";
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    int n;
    std::cin >> n;
    std::size_t offset = 0;
    std::size_t maxAlign = 1;
    std::size_t dataBytes = 0;
    for (int i = 0; i < n; ++i) {
        std::string type;
        std::cin >> type;
        std::size_t size = sizeof(double);
        std::size_t align = alignof(double);
        if (type == "char") {
            size = sizeof(char);
            align = alignof(char);
        } else if (type == "short") {
            size = sizeof(short);
            align = alignof(short);
        } else if (type == "int") {
            size = sizeof(int);
            align = alignof(int);
        }

        if (offset % align != 0) {
            offset += align - offset % align;   // pad up to the alignment
        }
        offset += size;
        dataBytes += size;
        if (align > maxAlign) maxAlign = align;
    }
    if (offset % maxAlign != 0) {
        offset += maxAlign - offset % maxAlign; // round the total up
    }
    std::cout << "size=" << offset << " padding=" << offset - dataBytes << '\n';
}
```

```hint
Keep a running `offset`. For each member: if `offset % align != 0`, add `align - offset % align`; then
add the member's size. Remember the largest alignment seen.
```

```hint
At the end, round `offset` up to a multiple of the largest alignment the same way. The padding is that
size minus the sum of all member sizes.
```

```stdin
3
char int char
```

```expected
size=12 padding=6
```

```stdin
1
char
```

```expected
size=1 padding=0
```

```stdin
2
double char
```

```expected hidden
size=16 padding=7
```

```stdin
4
char short char int
```

```expected hidden
size=12 padding=4
```

```stdin
4
char double char int
```

```expected hidden
size=24 padding=10
```

```checks
must alignof :: Use alignof to get each type's alignment.
must sizeof :: Use sizeof to get each type's size.
```
:::

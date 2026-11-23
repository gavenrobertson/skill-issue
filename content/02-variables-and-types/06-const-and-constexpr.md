---
title: const and constexpr
summary: Values that never change. const variables, compile-time constants with constexpr, constinit, replacing magic numbers, and why not to use #define.
---

## const: a variable that can't change

Put `const` in front of (or after) a type to make a variable **read-only**. Once initialized, it can
never be modified. The compiler enforces this:

```cpp run
#include <iostream>

int main() {
    const int daysPerWeek = 7;
    int const hoursPerDay = 24;      // same meaning: 'const' may also go after the type

    std::cout << daysPerWeek * hoursPerDay << " hours in a week\n";
}
```

```output
168 hours in a week
```

```cpp compile-error
int main() {
    const int maxPlayers = 4;
    maxPlayers = 5;              // error: assignment of read-only variable 'maxPlayers'
}
```

Because it can never be assigned later, **a `const` variable must be initialized**:

```cpp compile-error
int main() {
    const int answer;            // error: uninitialized 'const answer'
}
```

The value doesn't have to be known at compile time. A `const` can be initialized from user input or
any calculation; it just can't change **afterwards**:

```cpp run
#include <iostream>

int main() {
    int raw = 21;
    const int doubled = raw * 2;     // computed at run time, then frozen
    std::cout << doubled << '\n';
}
```

```output
42
```

**Why bother?** `const` documents intent ("this never changes"), prevents accidental modification, and
lets the compiler catch bugs. A good habit: **make every variable `const` unless it needs to change.**

## constexpr: a compile-time constant

`constexpr` (C++11) is stronger than `const`: the value must be **known at compile time**. The compiler
computes it while building your program, so it costs nothing at run time, and you can use it where
the language *requires* a compile-time value, like array sizes and `static_assert`.

```cpp run
#include <iostream>

int main() {
    constexpr int boardSize = 8;
    constexpr int squares = boardSize * boardSize;     // computed by the compiler
    constexpr double pi = 3.14159265358979;

    int board[squares] = {};          // array size must be a compile-time constant
    static_assert(squares == 64);     // checked at compile time

    std::cout << squares << ' ' << sizeof(board) / sizeof(board[0]) << ' ' << pi * 2 << '\n';
}
```

```output
64 64 6.28319
```

A `constexpr` variable is automatically `const`. If its initializer can't be computed at compile time,
the program doesn't compile:

```cpp compile-error
#include <iostream>

int main() {
    int input{};
    std::cin >> input;
    constexpr int value = input * 2;   // error: the value of 'input' is not usable in a constant expression
}
```

### const vs. constexpr

| | `const` | `constexpr` |
| --- | --- | --- |
| Can't be changed after initialization | ✓ | ✓ |
| Must be initialized | ✓ | ✓ |
| Value may come from run time (input, calculations) | ✓ | ✗ |
| Usable as an array size / in `static_assert` | only if initialized with a constant | ✓ always |

Rule of thumb: use **`constexpr`** for values you know when writing the program (π, limits, sizes,
conversion factors), and **`const`** for values computed while running that shouldn't change after.

Functions can be `constexpr` too, which lets the compiler call them at compile time. You'll see that in
the functions module:

```cpp
constexpr int square(int x) { return x * x; }
constexpr int area = square(12);    // computed by the compiler: 144
```

## constinit (C++20)

`constinit` is a niche C++20 keyword for **global and `static` variables**. It guarantees the variable
is initialized at compile time (avoiding subtle start-up ordering bugs between files), but unlike
`constexpr`, the variable **is not const**: it can change later.

```cpp run
#include <iostream>

constinit int requestCount = 0;     // initialized at compile time, but modifiable

int main() {
    requestCount = requestCount + 1;
    requestCount = requestCount + 1;
    std::cout << requestCount << '\n';
}
```

```output
2
```

`constinit` can't be used on ordinary local variables. You'll rarely need it; just recognize it.

## Magic numbers

A **magic number** is an unexplained literal buried in code:

```cpp
double price = subtotal * 1.0825;      // what is 1.0825?
int seconds = days * 86400;            // why 86400?
```

Six months later, nobody remembers what `1.0825` means, and if the tax rate changes you have to find
every copy. Name your constants instead:

```cpp
constexpr double salesTaxRate = 0.0825;
constexpr int secondsPerDay = 24 * 60 * 60;

double price = subtotal * (1 + salesTaxRate);
int seconds = days * secondsPerDay;
```

Now the code explains itself, and there's one place to change. (Obvious values like `0`, `1`, or `2` in
`2 * radius` are fine as literals.)

## #define constants, and why not to use them

In C (and old C++), constants were often made with the **preprocessor**:

```cpp
#define MAX_USERS 100
#define PI 3.14159
```

`#define` is plain **text substitution** before compilation. Every `MAX_USERS` in the file is replaced
with `100` before the compiler sees it. That causes real problems:

- **No type**: `PI` is just text, not a `double`.
- **No scope**: a macro is active from its `#define` to the end of the file, everywhere, even inside
  other namespaces or functions. It can clobber unrelated names.
- **Invisible to the debugger** and confusing in error messages (you see `100`, not `MAX_USERS`).
- **Surprising expansion**, because the text is pasted in without regard to precedence:

```cpp run
#include <iostream>

#define TWO 1 + 1

int main() {
    std::cout << TWO * 3 << '\n';     // becomes 1 + 1 * 3, which is 4, not 6!
}
```

```output
4
```

```cpp run
#include <iostream>

constexpr int two = 1 + 1;

int main() {
    std::cout << two * 3 << '\n';     // 6, as expected: two is a real int with value 2
}
```

```output
6
```

**Use `constexpr` (or `const`) variables instead of `#define` for constants.** The preprocessor is
still used for `#include` and for conditional compilation, which you'll see later. By convention,
macros are written in `ALL_CAPS`, so they stand out as dangerous.

:::quiz
Which of these compile? (select all that apply)

```cpp
int n{};
std::cin >> n;
```

- [x] `const int a = n * 2;`
- [ ] `constexpr int b = n * 2;`
- [x] `constexpr int c = 10 * 2;`
- [ ] `const int d;`

`const` can hold a run-time value; `constexpr` needs a compile-time one, which `n` isn't. A `const`
must always be initialized.
:::

:::quiz
What does this print?

```cpp
#define SIDE 2 + 3
std::cout << SIDE * SIDE;
```

- [ ] `25`
- [x] `11`
- [ ] `13`
- [ ] It doesn't compile

The macro expands to `2 + 3 * 2 + 3`, which is `2 + 6 + 3 = 11`. A `constexpr int side = 2 + 3;` would give 25.
:::

:::exercise Circle area {easy}
Read a circle's radius and print its area (π × r²). Declare π as a **`constexpr double`** with the
value `3.14159` (don't use `#define`).

**Input:** one number `r` (may have a decimal point).
**Output:** the area printed with plain `std::cout <<` (default formatting), newline. For `2` print `12.5664`.

```cpp starter
#include <iostream>

int main() {
    double r{};
    std::cin >> r;
    std::cout << r * r << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    constexpr double pi = 3.14159;
    double r{};
    std::cin >> r;
    std::cout << pi * r * r << '\n';
}
```

```hint
`constexpr double pi = 3.14159;` then multiply: `pi * r * r`.
```

```stdin
2
```

```expected
12.5664
```

```stdin
0
```

```expected hidden
0
```

```stdin
1.5
```

```expected hidden
7.06858
```

```stdin
10
```

```expected hidden
314.159
```

```checks
must constexpr\s+double\s+\w+\s*(=|\{) :: Declare pi as a constexpr double.
mustnot #define :: Use constexpr, not #define.
must 3\.14159 :: Use the value 3.14159 for pi.
```
:::

:::exercise Weeks to minutes {easy}
Read a number of weeks and print how many minutes that is. No magic numbers: declare **three
`constexpr int` constants** (days per week, hours per day, minutes per hour) and use them in the calculation.

**Input:** one integer `w` (0 ≤ w ≤ 1000).
**Output:** the number of minutes, newline. For `1` print `10080`.

```cpp starter
#include <iostream>

int main() {
    int weeks{};
    std::cin >> weeks;
    std::cout << weeks * 7 * 24 << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    constexpr int daysPerWeek = 7;
    constexpr int hoursPerDay = 24;
    constexpr int minutesPerHour = 60;

    int weeks{};
    std::cin >> weeks;
    std::cout << weeks * daysPerWeek * hoursPerDay * minutesPerHour << '\n';
}
```

```hint
`constexpr int minutesPerHour = 60;` and so on, then multiply `weeks` by all three.
```

```stdin
1
```

```expected
10080
```

```stdin
0
```

```expected hidden
0
```

```stdin
52
```

```expected hidden
524160
```

```stdin
1000
```

```expected hidden
10080000
```

```checks
must constexpr\s+int[\s\S]*constexpr\s+int[\s\S]*constexpr\s+int :: Declare three constexpr int constants.
mustnot \b(7|24|60)\s*\*|\*\s*(7|24|60)\b :: Don't multiply by magic numbers; use your named constants.
```
:::

:::exercise Fix the macro {medium}
A shop sells boxes for 10 dollars plus 5 dollars shipping each. This program reads how many boxes were
bought and prints the total cost, but the `#define` makes it compute the wrong answer. Replace the macro
with a **`constexpr int`** constant so the total is correct.

**Input:** one integer `n` (number of boxes).
**Output:** `n * 15`, newline. For `2` print `30`.

```cpp starter
#include <iostream>

#define BOX_PRICE 10 + 5

int main() {
    int n{};
    std::cin >> n;
    std::cout << BOX_PRICE * n << '\n';
}
```

```cpp solution
#include <iostream>

constexpr int boxPrice = 10 + 5;

int main() {
    int n{};
    std::cin >> n;
    std::cout << boxPrice * n << '\n';
}
```

```hint
Run the starter with input `2`. It prints `20`, because `BOX_PRICE * n` becomes `10 + 5 * n`.
```

```hint
`constexpr int boxPrice = 10 + 5;` is a real `int` with value 15, so `boxPrice * n` works as expected.
```

```stdin
2
```

```expected
30
```

```stdin
0
```

```expected hidden
0
```

```stdin
7
```

```expected hidden
105
```

```checks
mustnot #define :: Remove the #define.
must constexpr\s+int :: Use a constexpr int constant.
```
:::

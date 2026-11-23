---
title: inline, constexpr & consteval
summary: What inline really means today, functions that can run at compile time, functions that must, and static_assert to prove it.
---

## `inline`: not what it sounds like

When a compiler **inlines** a call, it pastes the function's body at the call site instead of
jumping to it. That avoids call overhead for tiny functions. Long ago, the `inline` keyword was a
hint asking for this:

```cpp
inline int add(int a, int b) {
    return a + b;
}
```

Today, compilers treat that hint as weak at best (GCC only nudges its heuristics a little). They
inline (or don't) based on their own analysis, with or without the keyword, and they happily inline
functions that aren't marked `inline` at all. So what is `inline` for?

**`inline` means "this definition may appear in more than one source file."** Normally the
**One Definition Rule (ODR)** says a function must be defined exactly once in the whole program.
That's a problem when you want to put a small function's full definition in a **header file**
(`.h`), because every `.cpp` file that `#include`s the header gets its own copy of the definition,
and the linker complains:

```
// math_utils.h  (included by a.cpp and b.cpp)
int square(int x) { return x * x; }          // linker error: multiple definition of 'square(int)'

inline int cube(int x) { return x * x * x; } // OK: inline allows one identical copy per file
```

With `inline`, the linker keeps one copy and discards the duplicates. All copies must be identical,
which they are if they came from the same header. You'll use this when you split programs into
multiple files later in the course.

Some functions are **implicitly inline**: `constexpr` and `consteval` functions (below), and member
functions defined inside a class body. Since C++17, *variables* can be `inline` too, for the same reason.

> **Note:** In a single `.cpp` file, like the ones in this course's IDE, `inline` makes no visible
> difference. Don't sprinkle it around hoping for speed.

## `constexpr` functions: compile time *or* run time

Some values can be computed **while compiling**, so the finished program just contains the answer.
A `constexpr` function is one that is *allowed* to run at compile time:

```cpp run
#include <iostream>

constexpr int square(int x) {
    return x * x;
}

int main() {
    constexpr int a = square(12);   // computed by the compiler: a is the constant 144
    int grid[square(3)] = {};       // array sizes must be compile-time constants: 9 works

    int n = 7;                      // an ordinary variable (imagine it came from std::cin)
    int b = square(n);              // also fine: runs at run time like a normal function

    std::cout << a << ' ' << sizeof(grid) / sizeof(grid[0]) << ' ' << b << '\n';
}
```

```output
144 9 49
```

The rule: a `constexpr` function runs at compile time when **it's needed in a constant expression**
(initializing a `constexpr` variable, an array size, a template argument, a `static_assert`...) and
all its arguments are known at compile time. Otherwise it's just an ordinary function call.

A `constexpr` **variable** is stricter: its initializer *must* be a compile-time constant.

```cpp compile-error
#include <iostream>

constexpr int square(int x) { return x * x; }

int main() {
    int n;
    std::cin >> n;
    constexpr int s = square(n);   // error: the value of 'n' is not usable in a constant expression
}
```

### What can a `constexpr` function contain?

Since C++14, and much more since C++20, nearly normal code: local variables, `if`, `switch`,
loops, recursion, even `std::string` and `std::vector` used temporarily inside it (C++20). The main
restrictions are no `static` local variables (C++23 allows `static constexpr` ones), and, on any path that runs at
compile time, no I/O, no calls to non-`constexpr` functions, and no undefined behavior (the compiler
checks for UB during constant evaluation and refuses to compile).

```cpp run
#include <iostream>

constexpr long long factorial(int n) {
    long long result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

constexpr bool isPrime(int n) {
    if (n < 2) return false;
    for (int d = 2; d * d <= n; ++d) {
        if (n % d == 0) return false;
    }
    return true;
}

int main() {
    constexpr long long f10 = factorial(10);
    constexpr bool p = isPrime(97);
    std::cout << f10 << ' ' << p << '\n';
}
```

```output
3628800 1
```

## `static_assert`: proving it at compile time

`static_assert(condition, "message");` checks a condition **while compiling**. If it's false, the
build fails with your message. The condition must be a constant expression, so it's a perfect way
to test `constexpr` functions, and to prove they really run at compile time:

```cpp run
#include <iostream>

constexpr int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}

static_assert(gcd(12, 18) == 6, "gcd is broken");
static_assert(gcd(7, 0) == 7);     // C++17: the message is optional
static_assert(sizeof(int) >= 4, "this program needs at least 32-bit ints");

int main() {
    std::cout << "all compile-time checks passed\n";
}
```

```output
all compile-time checks passed
```

When an assertion fails, there's no program at all:

```cpp compile-error
constexpr int triple(int x) { return x * 2; }   // oops, a bug

static_assert(triple(5) == 15, "triple is wrong");   // error: static assertion failed: triple is wrong

int main() {}
```

`static_assert` can go at file scope (outside any function) or inside a function body.

## `consteval` (C++20): compile time only

A `consteval` function is an **immediate function**: every call *must* be evaluated at compile
time. If the arguments aren't constants, it's a compile error rather than a quiet fallback to run
time:

```cpp run
#include <iostream>

consteval int kilobytes(int n) {
    return n * 1024;
}

int main() {
    constexpr int buffer = kilobytes(4);   // fine
    int other = kilobytes(2);              // also fine: 2 is a constant, computed while compiling
    std::cout << buffer << ' ' << other << '\n';
}
```

```output
4096 2048
```

```cpp compile-error
consteval int kilobytes(int n) { return n * 1024; }

int main() {
    int n = 4;
    int bytes = kilobytes(n);   // error: 'n' is not a constant expression
    return bytes;
}
```

## Which one should I use?

| Keyword | Can run at compile time | Can run at run time | Use for |
| --- | --- | --- | --- |
| (none) | no | yes | most functions |
| `constexpr` | yes, when needed and possible | yes | small pure computations useful in both worlds |
| `consteval` | always | **no** | values that must never cost anything at run time |
| `inline` | (unrelated) | yes | function definitions in headers |

> **Tip:** Making a small, pure function (one that just computes a result from its arguments)
> `constexpr` costs nothing and lets callers use it in constant expressions. Many standard library
> functions are `constexpr` for that reason.

> **Note:** C++20 also has `constinit`, which requires a (non-const) variable to be initialized at
> compile time, and `std::is_constant_evaluated()` to tell which mode you're in. C++23 adds
> `if consteval { ... }`. You won't need these often.

:::quiz
What does `inline` on a function mean in modern C++?

- [ ] The compiler must paste the body at every call site
- [x] The function may be defined in several source files (e.g. in a header) without breaking the One Definition Rule
- [ ] The function runs at compile time
- [ ] The function can't be recursive

Compilers make their own inlining decisions. The keyword's real job today is the ODR exemption.
:::

:::quiz
Given `constexpr int sq(int x) { return x * x; }` and `int n = 5;`, which lines compile? (select all that apply)

- [x] `constexpr int a = sq(5);`
- [x] `int b = sq(n);`
- [ ] `constexpr int c = sq(n);`
- [x] `static_assert(sq(3) == 9);`

`sq(n)` with a non-constant `n` runs at run time, which is fine for an ordinary variable but not for
a `constexpr` one.
:::

:::quiz
How does `consteval` differ from `constexpr`?

- [ ] They're the same
- [x] A `consteval` function can *only* be evaluated at compile time; `constexpr` can run at either time
- [ ] `consteval` functions run only at run time

`consteval` makes every call an immediate, compile-time evaluation.
:::

:::exercise Compile-time factorial {easy}
Write a `constexpr` function `long long factorial(int n)` (using a loop or recursion). Add **two**
`static_assert`s proving that `factorial(0) == 1` and `factorial(5) == 120` at compile time. Then
read `n` at run time and print `factorial(n)`.

**Input:** one integer `n` (0 to 20).
**Output:** `n!` followed by a newline.

```cpp starter
#include <iostream>

long long factorial(int n) {
    return n;
}

int main() {
    int n;
    std::cin >> n;
    std::cout << factorial(n) << '\n';
}
```

```cpp solution
#include <iostream>

constexpr long long factorial(int n) {
    long long result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

static_assert(factorial(0) == 1, "0! must be 1");
static_assert(factorial(5) == 120, "5! must be 120");

int main() {
    int n;
    std::cin >> n;
    std::cout << factorial(n) << '\n';
}
```

```hint
Put `constexpr` in front of the return type. Then `static_assert(factorial(5) == 120);` can go right below the function.
```

```stdin
5
```

```expected
120
```

```stdin
0
```

```expected hidden
1
```

```stdin
20
```

```expected hidden
2432902008176640000
```

```stdin
1
```

```expected hidden
1
```

```stdin
13
```

```expected hidden
6227020800
```

```checks
must constexpr\s+long\s+long\s+factorial :: Make factorial constexpr.
must static_assert\s*\(\s*factorial\s*\(\s*0\s*\)\s*==\s*1 :: static_assert that factorial(0) == 1.
must static_assert\s*\(\s*factorial\s*\(\s*5\s*\)\s*==\s*120 :: static_assert that factorial(5) == 120.
```
:::

:::exercise Fix the consteval {easy}
This program doesn't compile: `toCelsius` is `consteval`, but `main` calls it with a value read at
run time. Change it so it works for **both** the compile-time `boiling` constant and the run-time
input. Keep the `static_assert`.

**Input:** one integer temperature in Fahrenheit.
**Output:** `boiling: 100` on the first line, then the input converted to Celsius with integer
arithmetic (`(f - 32) * 5 / 9`) on the second.

```cpp starter broken
#include <iostream>

consteval int toCelsius(int f) {
    return (f - 32) * 5 / 9;
}

constexpr int boiling = toCelsius(212);
static_assert(boiling == 100);

int main() {
    int f;
    std::cin >> f;
    std::cout << "boiling: " << boiling << '\n';
    std::cout << toCelsius(f) << '\n';
}
```

```cpp solution
#include <iostream>

constexpr int toCelsius(int f) {
    return (f - 32) * 5 / 9;
}

constexpr int boiling = toCelsius(212);
static_assert(boiling == 100);

int main() {
    int f;
    std::cin >> f;
    std::cout << "boiling: " << boiling << '\n';
    std::cout << toCelsius(f) << '\n';
}
```

```hint
Which keyword allows a function to run at compile time *and* at run time?
```

```stdin
32
```

```expected
boiling: 100
0
```

```stdin
-40
```

```expected hidden
boiling: 100
-40
```

```stdin
212
```

```expected hidden
boiling: 100
100
```

```stdin
0
```

```expected hidden
boiling: 100
-17
```

```stdin
98
```

```expected hidden
boiling: 100
36
```

```checks
must constexpr\s+int\s+toCelsius :: toCelsius should be constexpr.
must static_assert :: Keep the static_assert.
```
:::

:::exercise Prime table {medium}
Write `constexpr bool isPrime(int n)` and use it twice:

1. At compile time: `static_assert(isPrime(2) && isPrime(97) && !isPrime(1) && !isPrime(91));`
2. At run time: read two integers `lo` and `hi` and print every prime `p` with `lo <= p <= hi`,
   separated by single spaces, on one line.

**Input:** two integers `lo` and `hi`.
**Output:** the primes in the range separated by spaces, then a newline. If there are none, print
`none`.

```cpp starter
#include <iostream>

int main() {
    int lo, hi;
    std::cin >> lo >> hi;
    std::cout << "none\n";
}
```

```cpp solution
#include <iostream>

constexpr bool isPrime(int n) {
    if (n < 2) return false;
    for (int d = 2; d * d <= n; ++d) {
        if (n % d == 0) return false;
    }
    return true;
}

static_assert(isPrime(2) && isPrime(97) && !isPrime(1) && !isPrime(91));

int main() {
    int lo, hi;
    std::cin >> lo >> hi;
    bool first = true;
    for (int n = lo; n <= hi; ++n) {
        if (isPrime(n)) {
            if (!first) std::cout << ' ';
            std::cout << n;
            first = false;
        }
    }
    if (first) std::cout << "none";
    std::cout << '\n';
}
```

```hint
A number `n >= 2` is prime if no `d` with `d * d <= n` divides it evenly.
```

```hint
Use a `bool first` flag to put spaces only *between* numbers.
```

```stdin
10 30
```

```expected
11 13 17 19 23 29
```

```stdin
24 28
```

```expected hidden
none
```

```stdin
-5 3
```

```expected hidden
2 3
```

```stdin
2 2
```

```expected hidden
2
```

```stdin
1 1
```

```expected hidden
none
```

```stdin
97 100
```

```expected hidden
97
```

```stdin
30 10
```

```expected hidden
none
```

```stdin
-10 -1
```

```expected hidden
none
```

```checks
must constexpr\s+bool\s+isPrime :: Make isPrime constexpr.
must static_assert\s*\(\s*isPrime :: Add the static_assert that uses isPrime.
```
:::

:::exercise Narcissistic numbers {hard}
A **narcissistic** (or Armstrong) number equals the sum of its own digits, each raised to the power of
the number of digits: `153 = 1^3 + 5^3 + 3^3`, and `9474 = 9^4 + 4^4 + 7^4 + 4^4`. Every single-digit
number, including `0`, is narcissistic.

Write a `constexpr bool isNarcissistic(int n)` (plus any `constexpr` helpers you like; note that
`std::pow` is **not** `constexpr` in C++20, so write your own integer power). Prove it works with
`static_assert`s for at least `153`, `9474`, `0` and the non-example `100`. Then answer queries at run
time.

**Input:** two integers `lo` and `hi` (`0 <= lo`, `hi <= 1000000`).
**Output:** all narcissistic numbers `n` with `lo <= n <= hi`, separated by single spaces on one line,
or `none`.

| Input | Output |
| --- | --- |
| `100 500` | `153 370 371 407` |
| `10 99` | `none` |

```cpp starter
#include <iostream>

int main() {
    int lo = 0, hi = 0;
    std::cin >> lo >> hi;
    std::cout << "none\n";
}
```

```cpp solution
#include <iostream>

constexpr int countDigits(int n) {
    int digits = 1;
    while (n >= 10) {
        n /= 10;
        ++digits;
    }
    return digits;
}

constexpr long long ipow(long long base, int exp) {
    long long result = 1;
    for (int i = 0; i < exp; ++i) {
        result *= base;
    }
    return result;
}

constexpr bool isNarcissistic(int n) {
    int k = countDigits(n);
    long long sum = 0;
    for (int rest = n; rest > 0; rest /= 10) {
        sum += ipow(rest % 10, k);
    }
    return sum == n;
}

static_assert(isNarcissistic(153));
static_assert(isNarcissistic(9474));
static_assert(isNarcissistic(0));
static_assert(!isNarcissistic(100));

int main() {
    int lo = 0, hi = 0;
    std::cin >> lo >> hi;
    bool first = true;
    for (int n = lo; n <= hi; ++n) {
        if (isNarcissistic(n)) {
            if (!first) std::cout << ' ';
            std::cout << n;
            first = false;
        }
    }
    if (first) std::cout << "none";
    std::cout << '\n';
}
```

```hint
Count the digits first (a loop that divides by 10). `0` has one digit.
```

```hint
Then sum `digit^k` over the digits with your own `constexpr` power function, and compare with `n`.
```

```stdin
100 500
```

```expected
153 370 371 407
```

```stdin
10 99
```

```expected
none
```

```stdin
0 9
```

```expected hidden
0 1 2 3 4 5 6 7 8 9
```

```stdin
9000 10000
```

```expected hidden
9474
```

```stdin
1 1000000
```

```expected hidden
1 2 3 4 5 6 7 8 9 153 370 371 407 1634 8208 9474 54748 92727 93084 548834
```

```stdin
370 371
```

```expected hidden
370 371
```

```stdin
154 369
```

```expected hidden
none
```

```checks
must constexpr\s+bool\s+isNarcissistic :: Make isNarcissistic constexpr.
must static_assert\s*\(\s*isNarcissistic\s*\(\s*153\s*\) :: static_assert that 153 is narcissistic.
must static_assert\s*\(\s*!\s*isNarcissistic\s*\(\s*100\s*\) :: static_assert that 100 is not.
mustnot \bpow\s*\( :: std::pow isn't constexpr in C++20: write your own power function.
```
:::

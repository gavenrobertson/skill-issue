---
title: Undefined Behavior
summary: What undefined behavior is and why C++ has it, a catalog of the most common kinds, the tools that catch them, and how UB differs from implementation-defined and unspecified behavior.
---

## "Anything can happen"

The C++ standard describes what every valid program does. For some operations, though, it says the
behavior is **undefined**: the standard places **no requirements at all** on what happens. Not "it
crashes", not "you get garbage", but literally nothing. The program might:

- crash immediately,
- print a wrong answer,
- appear to work perfectly, today, on your machine, and then break with a different compiler,
  optimization level, or input,
- do something that seems completely unrelated to the buggy line.

A program that executes undefined behavior (**UB**) is **wrong**, even if it seems to work. You can't
test your way out of UB; you have to avoid it.

## Why does it exist?

C++ is designed to be fast and to run on every kind of hardware. Defining every edge case would cost
speed everywhere:

- Checking every array access for bounds would add a comparison to every `a[i]`.
- Defining signed overflow as "wraps around" would prevent many loop optimizations, and some old
  hardware didn't even wrap.
- Detecting use of a dangling pointer would need tracking for every allocation.

So the language makes a deal with you: **you** promise never to do these things, and in return the
compiler generates the fastest possible code. The optimizer actually **relies** on your promise. It
assumes UB never happens and reasons from there, which is why UB can have such strange effects:

```cpp
bool alwaysBigger(int x) {
    return x + 1 > x;     // signed overflow is UB, so the compiler may assume x + 1 never wraps
}                         // GCC -O2 compiles this to "return true;"

void process(int* p) {
    int value = *p;       // dereferencing p: if p were null, this would be UB...
    if (p == nullptr) {   // ...so the compiler concludes p can't be null here,
        return;           // and may delete this whole check!
    }
    // ...
}
```

The second example is a real class of security bug: a null check "disappears" because a dereference
came first.

## The catalog

Each of these is undefined behavior. They're shown as fragments: never run code like this on purpose.

### Signed integer overflow

```cpp
int big = 2147483647;      // INT_MAX for a 32-bit int
int oops = big + 1;        // UB: signed overflow

for (int i = 0; i >= 0; ++i) { /* "until it wraps negative" */ }   // UB, may loop forever
```

**Unsigned** arithmetic is different: it's defined to wrap around modulo 2^N, so
`std::numeric_limits<unsigned>::max() + 1u == 0` is fine. Shifting is also restricted: shifting by a
negative amount, or by at least the width of the type (`1 << 32` for a 32-bit `int`), is UB.

### Out-of-bounds access

```cpp
int a[3] = {1, 2, 3};
int x = a[3];              // UB: valid indices are 0, 1, 2
std::vector<int> v(3);
v[10] = 5;                 // UB: operator[] does not check
std::string s = "hi";
char c = s[5];             // UB
```

Also: reading past the end of a C string without a `'\0'`, and using an iterator past `end()`.

### Null, dangling, and invalid pointers

```cpp
int* p = nullptr;
*p = 1;                    // UB: null dereference

int* q = new int(5);
delete q;
*q = 6;                    // UB: use after free (q is dangling)
delete q;                  // UB: double delete

int& badRef() {
    int local = 42;
    return local;          // returns a reference to a variable that's about to die
}
int y = badRef();          // UB: reading a dead object

std::vector<int> v{1, 2, 3};
int* first = &v[0];
v.push_back(4);            // may reallocate...
int z = *first;            // ...UB if it did: first is dangling
```

### Reading uninitialized variables

```cpp
int count;                 // no initializer: indeterminate value
count++;                   // UB: reading an indeterminate value

int arr[5];
int sum = arr[0] + arr[1]; // UB for the same reason
```

The fix is simple: always initialize (`int count = 0;`, `int arr[5]{};`).

### Data races

```cpp
int counter = 0;
std::thread t1([&] { ++counter; });
std::thread t2([&] { ++counter; });   // two threads write the same variable without synchronization:
                                      // UB (a data race). Use std::mutex or std::atomic.
```

### Invalid casts and type punning

```cpp
float f = 1.0f;
int bits = *reinterpret_cast<int*>(&f);     // UB: accessing a float through an int* (strict aliasing)

struct Base { virtual ~Base() = default; };
struct Derived : Base { int extra = 0; };
Base b;
Derived& d = static_cast<Derived&>(b);      // UB: b is not actually a Derived
d.extra = 1;
```

Safe alternatives: `std::bit_cast<int>(f)` (C++20) or `std::memcpy` to reinterpret bytes, and
`dynamic_cast` when you're not sure of the dynamic type.

### Modifying a `const` object

```cpp
const int limit = 10;
int& sneaky = const_cast<int&>(limit);
sneaky = 20;               // UB: limit was defined const
```

`const_cast` is only safe for removing `const` from a reference or pointer to an object that wasn't
`const` to begin with.

### Unsequenced modifications

If the same variable is modified twice, or modified and read, **without an ordering** between them,
that's UB:

```cpp
int i = 0;
int x = i++ + i++;         // UB: two unsequenced modifications of i
int y = i + i++;           // UB: a read and a modification, unsequenced
```

C++17 made many formerly-undefined expressions well-defined by specifying an order for `=`, `<<`, `>>`,
`.`, `->`, `[]` and a few others. These are fine since C++17, although still confusing to read:

```cpp
i = i++ + 1;                     // OK since C++17 (the right side is sequenced before the assignment)
std::cout << i++ << ' ' << i++;  // OK since C++17 (<< operands are evaluated left to right)
v[i] = i++;                      // OK since C++17
```

The simple rule: **don't modify a variable and use it again in the same expression.**

### Other common ones

- Integer division by zero (`x / 0`, `x % 0`), and `INT_MIN / -1`.
- Flowing off the end of a non-`void` function without `return` (except `main`).
- Calling a pure virtual function from a constructor/destructor, or a member function on a deleted object.
- Mismatched `new[]` / `delete` (or `new` / `delete[]`).
- Converting a floating-point value to an integer type that can't represent it (`static_cast<int>(1e20)`).
- An infinite loop with no side effects (no I/O, no `volatile` or atomic access).

## Avoiding UB in practice

Most of the safe alternatives are things you already know:

```cpp run
#include <cstdint>
#include <iostream>
#include <limits>
#include <optional>
#include <stdexcept>
#include <vector>

// Check BEFORE doing the operation that could overflow.
std::optional<int> safeAdd(int a, int b) {
    if (b > 0 && a > std::numeric_limits<int>::max() - b) return std::nullopt;
    if (b < 0 && a < std::numeric_limits<int>::min() - b) return std::nullopt;
    return a + b;
}

int main() {
    // 1. Overflow: check first, or use a wider type.
    if (auto r = safeAdd(2'000'000'000, 2'000'000'000)) std::cout << *r << '\n';
    else std::cout << "overflow detected\n";
    std::int64_t wide = std::int64_t{2'000'000'000} + 2'000'000'000;
    std::cout << "as 64-bit: " << wide << '\n';

    // 2. Bounds: .at() checks and throws instead of UB.
    std::vector<int> v{1, 2, 3};
    try {
        std::cout << v.at(10) << '\n';
    } catch (const std::out_of_range&) {
        std::cout << "index 10 is out of range\n";
    }

    // 3. Uninitialized: always initialize.
    int count = 0;
    int arr[4]{};                 // all zeros
    std::cout << count + arr[3] << '\n';

    // 4. Unsigned arithmetic wraps by definition (not UB).
    unsigned u = std::numeric_limits<unsigned>::max();
    ++u;
    std::cout << "unsigned wraps to " << u << '\n';
}
```

```output
overflow detected
as 64-bit: 4000000000
index 10 is out of range
0
unsigned wraps to 0
```

General habits that prevent most UB:

- Prefer standard containers, `std::string`, and smart pointers over raw arrays, C strings, and `new`/`delete`.
- Prefer range-based `for` and algorithms over index arithmetic.
- Initialize every variable at its definition.
- Never return pointers or references to locals; be careful holding pointers/iterators into a container you modify.
- Synchronize shared data between threads.

## Tools that catch UB

You can't see UB by reading output, but tools can see it while your program runs.

**Compiler warnings.** Always compile with `-Wall -Wextra` (this site does). Many UB patterns get a
warning, like using an uninitialized variable or returning a reference to a local:

```cpp run warns
#include <iostream>

int main() {
    int a[3] = {1, 2, 3};
    int total = 0;
    for (int i = 0; i < 3; ++i) total += a[i];
    std::cout << total << '\n';
    unsigned n = 5;
    int k = -1;
    std::cout << (k < static_cast<int>(n)) << '\n';
    if (k < n) std::cout << "unreachable\n";   // warning: comparison of integer expressions of different signedness
}
```

```output
6
1
```

(That last one isn't UB, but it's a classic bug: `k` is converted to a huge `unsigned`, so `k < n` is
false.) Add `-Werror` to turn warnings into errors in your own projects.

**Sanitizers.** GCC and Clang can **instrument** your program to detect UB as it happens. On your own
machine:

```
g++ -std=c++20 -g -fsanitize=address,undefined main.cpp -o main
./main
```

- **AddressSanitizer** (`address`): out-of-bounds access, use after free, double free, memory leaks.
- **UndefinedBehaviorSanitizer** (`undefined`): signed overflow, bad shifts, null dereference, invalid casts, ...
- **ThreadSanitizer** (`-fsanitize=thread`, used on its own): data races.

A sanitizer report points at the exact line:

```
main.cpp:6:18: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
```

```
==1234==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x602000000020
READ of size 4 at 0x602000000020 thread T0
    #0 0x401234 in main main.cpp:9
```

Run your tests with sanitizers regularly; it's the single most effective habit for finding UB.

**Valgrind** (`valgrind ./main`) runs an unmodified program in a virtual machine and reports invalid
memory accesses, uninitialized reads, and leaks. It's slower than sanitizers but needs no recompile.

**Debug-mode standard library.** `-D_GLIBCXX_DEBUG` (GCC) or `-D_LIBCPP_HARDENING_MODE=...` (Clang)
makes `operator[]` and iterators check their bounds.

## Undefined vs. unspecified vs. implementation-defined

The standard has three different "it depends" categories. Only one of them is a bug:

| Category | Meaning | Examples |
| --- | --- | --- |
| **Implementation-defined** | Each compiler/platform chooses, and **must document** its choice. Your program is valid; just not portable. | `sizeof(int)`, whether plain `char` is signed, the size of `long` (4 bytes on Windows, 8 on Linux), the output of `std::uniform_int_distribution` |
| **Unspecified** | The compiler picks among valid possibilities and needn't tell you, or even be consistent. Valid program, but don't depend on which one. | the order in which function arguments are evaluated: in `f(a(), b())`, `a()` or `b()` may run first; the order of `std::unordered_map` iteration |
| **Undefined** | No requirements at all. The program is broken. | everything in the catalog above |

```cpp
int a() { std::cout << "a"; return 1; }
int b() { std::cout << "b"; return 2; }
int sum(int x, int y) { return x + y; }

sum(a(), b());   // prints "ab" or "ba": unspecified, but always returns 3. Not UB, but don't rely on the order.
```

:::quiz
Which of these is **undefined** behavior?

- [ ] `unsigned u = 0; --u;`
- [x] `int i = INT_MAX; ++i;`
- [ ] `sizeof(long)` being 8
- [ ] `f(a(), b())` calling `b()` first

Signed overflow is UB. Unsigned arithmetic wraps by definition, `sizeof(long)` is
implementation-defined, and argument evaluation order is unspecified.
:::

:::quiz
A program with UB printed the right answer in all your tests. What can you conclude?

- [ ] It's fine; the UB is harmless in this case
- [x] Nothing: it may break with another compiler, optimization level, or input
- [ ] The compiler must have fixed the UB
- [ ] UB only matters in debug builds

"Seems to work" is one of the possible outcomes of UB, and it can change at any time, especially when
the optimizer changes.
:::

:::quiz
Which tool reports a data race between two threads?

- [ ] `-fsanitize=address`
- [ ] `-Wall -Wextra`
- [x] `-fsanitize=thread`
- [ ] `-D_GLIBCXX_DEBUG`

ThreadSanitizer detects data races at runtime. AddressSanitizer covers memory errors, and warnings
are compile-time only.
:::

:::exercise Overflow-safe addition {medium}
Read pairs of `int`s `a b` until the end of input. For each pair print `a + b` if the result fits in an
`int`, or `overflow` if it doesn't. You must **not** perform an overflowing `int` addition: check
**before** adding using `std::numeric_limits<int>`.

```cpp starter
#include <iostream>
#include <limits>

int main() {
    int a, b;
    while (std::cin >> a >> b) {
        std::cout << static_cast<long long>(a) + b << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <limits>

int main() {
    const int maxInt = std::numeric_limits<int>::max();
    const int minInt = std::numeric_limits<int>::min();
    int a, b;
    while (std::cin >> a >> b) {
        if ((b > 0 && a > maxInt - b) || (b < 0 && a < minInt - b)) {
            std::cout << "overflow\n";
        } else {
            std::cout << a + b << '\n';
        }
    }
}
```

```hint
`a + b` overflows upward exactly when `b > 0` and `a > max - b`. Note that `max - b` itself can't
overflow when `b > 0`.
```

```hint
The downward case is the mirror image: `b < 0 && a < min - b`.
```

```stdin
1 2
2147483647 1
2147483647 -1
```

```expected
3
overflow
2147483646
```

```stdin
-2147483648 -1
-2147483648 2147483647
1000000000 1000000000
-1000000000 -1500000000
```

```expected hidden
overflow
-1
2000000000
overflow
```

```stdin
0 -2147483648
-1 -2147483648
2147483647 0
-2147483647 -1
1073741824 1073741824
```

```expected hidden
-2147483648
overflow
2147483647
-2147483648
overflow
```

```checks
must numeric_limits\s*<\s*int\s*> :: Use std::numeric_limits<int> to check the bounds.
```
:::

:::exercise Checked indexing {easy}
Read `n`, then `n` integers into a `std::vector<int>`. Then read index queries (they may be negative
or too large) until the end of input. For each index `i`, print `v[<i>] = <value>`, or
`<i> is out of range` if it's not a valid index.

Use `.at()` and catch `std::out_of_range` (never index out of bounds with `[]`).

```cpp starter
#include <iostream>
#include <stdexcept>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    long long i;
    while (std::cin >> i) {
        // look up v at index i safely
    }
}
```

```cpp solution
#include <iostream>
#include <stdexcept>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    long long i;
    while (std::cin >> i) {
        try {
            if (i < 0) throw std::out_of_range("negative index");
            int value = v.at(static_cast<std::size_t>(i));
            std::cout << "v[" << i << "] = " << value << '\n';
        } catch (const std::out_of_range&) {
            std::cout << i << " is out of range\n";
        }
    }
}
```

```hint
`v.at(k)` throws `std::out_of_range` when `k >= v.size()`. A negative index needs its own check (or it
turns into a huge unsigned value, which `.at()` also rejects).
```

```stdin
3
10 20 30
0 2 3 -1
```

```expected
v[0] = 10
v[2] = 30
3 is out of range
-1 is out of range
```

```stdin
0
0 5
```

```expected hidden
0 is out of range
5 is out of range
```

```stdin
2
-5 5
1 -9223372036854775807 0 2 1
```

```expected hidden
v[1] = 5
-9223372036854775807 is out of range
v[0] = -5
2 is out of range
v[1] = 5
```

```checks
must \.at\s*\( :: Access elements with .at().
must catch\s*\(\s*(const\s+)?std::out_of_range :: Catch std::out_of_range.
```
:::

:::exercise Parse without overflow {hard}
Write your own integer parser. Read whitespace-separated tokens until the end of input. Each token
should be an optional `-` followed by one or more digits. For each token print:

- the value, if it fits in an `int` (−2147483648 to 2147483647),
- `overflow` if it's a valid number that doesn't fit,
- `invalid` if it isn't a number (empty digits, other characters).

Build the value digit by digit, and detect overflow **before** it would happen (check the bound before
each `value = value * 10 + digit`). Don't use `std::stoi`, `std::stol`, `strtol`, `>>` into a number, or
`std::from_chars`. Tokens can be very long, so you can't just use a bigger type.

```cpp starter
#include <iostream>
#include <limits>
#include <string>

int main() {
    std::string token;
    while (std::cin >> token) {
        int value = 0;
        for (char c : token) {
            value = value * 10 + (c - '0');
        }
        std::cout << value << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <limits>
#include <string>

int main() {
    std::string token;
    while (std::cin >> token) {
        bool negative = !token.empty() && token[0] == '-';
        std::size_t start = negative ? 1 : 0;
        if (start == token.size()) {
            std::cout << "invalid\n";
            continue;
        }
        // magnitude limit: 2147483647, or 2147483648 for negative numbers
        const long long limit = negative ? -static_cast<long long>(std::numeric_limits<int>::min())
                                         : std::numeric_limits<int>::max();
        long long value = 0;
        bool bad = false;
        bool overflow = false;
        for (std::size_t i = start; i < token.size(); ++i) {
            char c = token[i];
            if (c < '0' || c > '9') {
                bad = true;
                break;
            }
            int digit = c - '0';
            if (!overflow && value > (limit - digit) / 10) {
                overflow = true;
            }
            if (!overflow) {
                value = value * 10 + digit;
            }
        }
        if (bad) std::cout << "invalid\n";
        else if (overflow) std::cout << "overflow\n";
        else std::cout << (negative ? -value : value) << '\n';
    }
}
```

```hint
Handle the sign first, then work with the magnitude. The largest magnitude allowed is 2147483647 for
positive numbers and 2147483648 for negative ones.
```

```hint
`value * 10 + digit > limit` is the same as `value > (limit - digit) / 10` (with integer division),
and the second form can't overflow.
```

```hint
After you detect overflow, keep scanning: a later non-digit still makes the token `invalid`.
```

```stdin
123 -45 007 -0
```

```expected
123
-45
7
0
```

```stdin
2147483647 2147483648 -2147483648 -2147483649
```

```expected
2147483647
overflow
-2147483648
overflow
```

```stdin
99999999999999999999999999 12a - abc 9999999999999x
```

```expected hidden
overflow
invalid
invalid
invalid
invalid
```

```stdin
+5 --1 -0000000000002147483648 00000000000000000000000001 -00000000002147483649 1-2 0
```

```expected hidden
invalid
invalid
-2147483648
1
overflow
invalid
0
```

```checks
must numeric_limits :: Use std::numeric_limits for the bounds.
mustnot \bsto(i|l|ll|ul|ull)\s*\(|strto|from_chars :: Parse the digits yourself.
```
:::

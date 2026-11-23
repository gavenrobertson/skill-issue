---
title: Compile-Time Programming
summary: Make the compiler do the work. constexpr variables, functions, and classes, consteval and constinit, if constexpr, compile-time containers and lookup tables, and static_assert as built-in tests.
---

## Why compute at compile time?

Some values are known before the program ever runs: a table of squares, the number of seconds in a
day, a hash of a command name, the size of a buffer. If the **compiler** computes them:

- there's **zero runtime cost**: the result is baked into the executable as a constant,
- mistakes are caught **at compile time**, including undefined behavior (the compiler refuses to evaluate it),
- the values can be used where C++ **requires** constants: array sizes, template arguments, `case` labels,
  `static_assert`.

C++ has grown a whole toolbox for this. You've seen pieces of it (`constexpr` in the variables module,
`if constexpr` with templates); this lesson puts it all together.

## `constexpr` variables

A `constexpr` variable must be initialized with a **constant expression**, and it's implicitly `const`:

```cpp run
#include <array>
#include <iostream>

constexpr int secondsPerMinute = 60;
constexpr int secondsPerDay = 24 * 60 * secondsPerMinute;   // computed by the compiler
constexpr double gravity = 9.81;

int main() {
    std::array<int, secondsPerMinute / 10> buckets{};      // usable as a template argument
    std::cout << secondsPerDay << ' ' << buckets.size() << ' ' << gravity << '\n';
}
```

```output
86400 6 9.81
```

```cpp compile-error
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    constexpr int doubled = n * 2;   // error: the value of 'n' is not usable in a constant expression
}
```

## `constexpr` functions

A `constexpr` function **can** be evaluated at compile time, when its arguments are constants and the
result is needed as a constant. The **same** function also works at runtime with ordinary values. Since
C++14 the body can contain loops, local variables, and multiple returns; since C++20 it can even use
`try` blocks, `virtual` calls, and `new`/`delete` (as long as everything allocated is freed before the
evaluation ends), which means `std::vector` and `std::string` work inside `constexpr` functions.

```cpp run
#include <iostream>

constexpr long long power(long long base, int exp) {
    long long result = 1;
    for (int i = 0; i < exp; ++i) result *= base;
    return result;
}

constexpr bool isPrime(int n) {
    if (n < 2) return false;
    for (int d = 2; d * d <= n; ++d)
        if (n % d == 0) return false;
    return true;
}

int main() {
    constexpr long long kib = power(2, 10);       // compile time: required by constexpr
    static_assert(power(3, 4) == 81);             // compile time: required by static_assert
    static_assert(isPrime(97) && !isPrime(91));

    int exp;
    exp = 5;                                      // pretend this came from input
    std::cout << kib << ' ' << power(2, exp) << '\n';   // the same function at runtime
}
```

```output
1024 32
```

Ways to **force** compile-time evaluation: initialize a `constexpr` variable, use the result in a
`static_assert`, an array size, a template argument, or a `case` label. A `constexpr` function called in
an ordinary runtime context **may** still be evaluated by the optimizer at compile time, but you have
no guarantee.

### The compiler refuses undefined behavior

A constant expression must not have undefined behavior. The compiler actually checks, so compile-time
evaluation doubles as a UB detector:

```cpp compile-error
#include <climits>

constexpr int addOne(int x) { return x + 1; }

constexpr int boom = addOne(INT_MAX);   // error: overflow in constant expression

int main() {}
```

```cpp compile-error
constexpr int at(int i) {
    int arr[3] = {1, 2, 3};
    return arr[i];
}

static_assert(at(3) == 0);   // error: array subscript value '3' is outside the bounds

int main() {}
```

## `consteval`: compile time **only** (C++20)

A `consteval` function is an **immediate function**: every call must produce a compile-time constant.
Calling it with a runtime value is an error. Use it when running the computation at runtime would be
a bug or a waste:

```cpp run
#include <iostream>

consteval int cubed(int x) { return x * x * x; }

int main() {
    constexpr int a = cubed(3);       // OK
    int b = cubed(4);                 // OK: 4 is a constant, so the call is still evaluated at compile time
    std::cout << a << ' ' << b << '\n';
}
```

```output
27 64
```

```cpp compile-error
consteval int cubed(int x) { return x * x * x; }

int main() {
    int n = 3;
    return cubed(n);   // error: 'n' is not usable in a constant expression
}
```

| | Can run at compile time | Can run at runtime |
| --- | --- | --- |
| normal function | no | yes |
| `constexpr` function | yes | yes |
| `consteval` function | yes (always) | no |

Inside a `constexpr` function, `std::is_constant_evaluated()` (C++20, `<type_traits>`) tells you which
mode you're in, so you can pick a compile-time-friendly algorithm. C++23 adds the nicer spelling
`if consteval { ... }`.

And as a reminder from the linkage lesson: `constinit` is the variable-side cousin, guaranteeing that
a static variable is initialized at compile time while leaving it mutable.

## `constexpr` classes

A class whose constructor and member functions are `constexpr` can be used in constant expressions
(it's a **literal type**):

```cpp run
#include <iostream>

struct Vec2 {
    int x = 0;
    int y = 0;

    constexpr Vec2() = default;
    constexpr Vec2(int x_, int y_) : x(x_), y(y_) {}

    constexpr Vec2 operator+(Vec2 o) const { return {x + o.x, y + o.y}; }
    constexpr Vec2 scaled(int k) const { return {x * k, y * k}; }
    constexpr int dot(Vec2 o) const { return x * o.x + y * o.y; }
    constexpr bool operator==(const Vec2&) const = default;
};

constexpr Vec2 up{0, 1};
constexpr Vec2 right{1, 0};
constexpr Vec2 diagonal = (up + right).scaled(3);

static_assert(diagonal == Vec2{3, 3});
static_assert(up.dot(right) == 0, "up and right must be perpendicular");

int main() {
    std::cout << diagonal.x << ',' << diagonal.y << '\n';
}
```

```output
3,3
```

The second `static_assert` shows the optional message argument, printed if the assertion fails.

## `if constexpr`: compile-time branches

In a template, `if constexpr (condition)` evaluates the condition at compile time and **discards** the
branch not taken. The discarded branch isn't instantiated, so it may contain code that wouldn't compile
for the current type:

```cpp run
#include <iostream>
#include <string>
#include <type_traits>
#include <vector>

template <typename T>
std::string describe(const T& value) {
    if constexpr (std::is_same_v<T, bool>) {
        return value ? "bool true" : "bool false";
    } else if constexpr (std::is_integral_v<T>) {
        return "integer " + std::to_string(value);
    } else if constexpr (std::is_floating_point_v<T>) {
        return "floating " + std::to_string(value);
    } else if constexpr (requires { value.size(); }) {   // C++20 requires-expression
        return "container of " + std::to_string(value.size());
    } else {
        return "something else";
    }
}

int main() {
    std::cout << describe(true) << '\n'
              << describe(42) << '\n'
              << describe(2.5) << '\n'
              << describe(std::vector<int>{1, 2, 3}) << '\n'
              << describe(std::string("hello")) << '\n'
              << describe(nullptr) << '\n';
}
```

```output
bool true
integer 42
floating 2.500000
container of 3
container of 5
something else
```

With a plain `if`, `describe(std::string("hello"))` would fail to compile: `std::to_string(value)` would
still be instantiated for a `std::string`, even though that branch could never run.

## Compile-time containers and algorithms

`std::array` is fully `constexpr`, and since C++20 so are most standard algorithms (`std::sort`,
`std::find`, `std::accumulate`, the `std::ranges` versions...). That makes compile-time **lookup tables**
easy: write a `constexpr` function that builds and returns the table.

```cpp run
#include <algorithm>
#include <array>
#include <iostream>
#include <numeric>

constexpr std::array<int, 10> makeSquares() {
    std::array<int, 10> table{};
    for (int i = 0; i < 10; ++i) table[i] = i * i;
    return table;
}

constexpr std::array<int, 6> sortedScores() {
    std::array<int, 6> a{42, 7, 19, 88, 3, 56};
    std::sort(a.begin(), a.end());          // constexpr since C++20
    return a;
}

constexpr auto squares = makeSquares();     // computed entirely by the compiler
constexpr auto scores = sortedScores();

static_assert(squares[9] == 81);
static_assert(scores.front() == 3 && scores.back() == 88);
static_assert(std::accumulate(squares.begin(), squares.end(), 0) == 285);

int main() {
    int i = 7;                              // runtime index into a compile-time table
    std::cout << i << "^2 = " << squares[i] << '\n';
    for (int s : scores) std::cout << s << ' ';
    std::cout << '\n';
}
```

```output
7^2 = 49
3 7 19 42 56 88
```

Real-world compile-time tables: CRC and hash tables, character classification tables, trigonometric
tables for embedded systems, and parsers' state tables.

## `static_assert`: tests the compiler runs

`static_assert(condition, "optional message");` fails **compilation** if the condition is false. Every
`constexpr` function can be unit-tested this way, and the tests run every time you compile:

```cpp
constexpr int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }

static_assert(gcd(12, 18) == 6);
static_assert(gcd(7, 13) == 1);
static_assert(gcd(0, 5) == 5);
```

It's also used to check assumptions about types and platforms:

```cpp
static_assert(sizeof(int) == 4, "this code assumes 32-bit int");
static_assert(std::is_trivially_copyable_v<Header>, "Header is written to disk with memcpy");
```

```cpp compile-error
constexpr int triple(int x) { return x * 2; }   // bug!

static_assert(triple(5) == 15, "triple is broken");   // error: static assertion failed: triple is broken

int main() {}
```

## The old way: template metaprogramming

Before `constexpr` functions became powerful, compile-time computation was done with recursive
**templates**. You'll still find it in older code:

```cpp
template <int N>
struct Factorial {
    static constexpr int value = N * Factorial<N - 1>::value;
};

template <>
struct Factorial<0> {                      // the "base case" is a specialization
    static constexpr int value = 1;
};

static_assert(Factorial<5>::value == 120);
```

Today, write a `constexpr` function: it's ordinary code, readable, and works at runtime too. Templates
are still the tool for computing with **types** (type traits like `std::is_integral`,
`std::remove_reference`), which functions can't return.

:::quiz
Which statement about a `constexpr` function is true?

- [ ] It always runs at compile time
- [x] It can run at compile time or at runtime, depending on how it's called
- [ ] It can only take `constexpr` arguments
- [ ] It can't contain loops

`constexpr` functions run at compile time when the result is needed as a constant and the arguments
are constants; otherwise they're ordinary runtime functions. `consteval` is the compile-time-only kind.
:::

:::quiz
Why does this compile only with `if constexpr`, not with a plain `if`?

```cpp
template <typename T>
int len(const T& x) {
    if constexpr (std::is_integral_v<T>) return 1;
    else return static_cast<int>(x.size());
}
// len(42);
```

- [ ] Plain `if` can't call `std::is_integral_v`
- [x] With plain `if`, `x.size()` would be compiled for `int` too, and `int` has no `.size()`
- [ ] `if constexpr` is faster at runtime
- [ ] It compiles fine either way

`if constexpr` discards the untaken branch for that instantiation. With a runtime `if`, both branches
must compile for every `T`.
:::

:::exercise Compile-time factorial
Write `constexpr unsigned long long factorial(int n)` (with `factorial(0) == 1`). Prove it works with
at least one `static_assert` (e.g. `factorial(5) == 120`), and make a compile-time constant
`constexpr auto f20 = factorial(20);`.

Then read integers `n` (0 ≤ n ≤ 20) until the end of input and print `<n>! = <value>` for each, followed
by a final line `max: <f20>`.

```cpp starter
#include <iostream>

unsigned long long factorial(int n) {
    return n;
}

int main() {
    int n;
    while (std::cin >> n) {
        std::cout << n << "! = " << factorial(n) << '\n';
    }
}
```

```cpp solution
#include <iostream>

constexpr unsigned long long factorial(int n) {
    unsigned long long result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}

static_assert(factorial(0) == 1);
static_assert(factorial(5) == 120);

constexpr auto f20 = factorial(20);

int main() {
    int n;
    while (std::cin >> n) {
        std::cout << n << "! = " << factorial(n) << '\n';
    }
    std::cout << "max: " << f20 << '\n';
}
```

```hint
A `constexpr` function can use an ordinary `for` loop and a local variable.
```

```stdin
5 0 10
```

```expected
5! = 120
0! = 1
10! = 3628800
max: 2432902008176640000
```

```stdin
20 1
```

```expected hidden
20! = 2432902008176640000
1! = 1
max: 2432902008176640000
```

```expected
max: 2432902008176640000
```

```checks
must constexpr\s+unsigned\s+long\s+long\s+factorial :: Make factorial a constexpr function.
must static_assert\s*\(\s*factorial :: Test factorial with static_assert.
must constexpr\s+(auto|unsigned\s+long\s+long)\s+f20 :: Define the constexpr constant f20.
```
:::

:::exercise Prime lookup table
Build a table of the first 100 prime numbers **at compile time**: write a `constexpr` function that
returns a `std::array<int, 100>` and store its result in a `constexpr` variable. Add `static_assert`s
checking that the first prime is `2` and the 100th is `541`.

Then read queries `k` until the end of input. For `1 ≤ k ≤ 100` print `prime #<k> = <value>`; otherwise
print `#<k> is out of range`.

```cpp starter
#include <array>
#include <iostream>

int main() {
    int k;
    while (std::cin >> k) {
        std::cout << "prime #" << k << " = ?\n";
    }
}
```

```cpp solution
#include <array>
#include <iostream>

constexpr std::array<int, 100> makePrimes() {
    std::array<int, 100> primes{};
    int count = 0;
    for (int n = 2; count < 100; ++n) {
        bool prime = true;
        for (int i = 0; i < count && primes[i] * primes[i] <= n; ++i) {
            if (n % primes[i] == 0) {
                prime = false;
                break;
            }
        }
        if (prime) primes[count++] = n;
    }
    return primes;
}

constexpr auto primes = makePrimes();

static_assert(primes[0] == 2);
static_assert(primes[99] == 541);

int main() {
    int k;
    while (std::cin >> k) {
        if (k >= 1 && k <= 100) {
            std::cout << "prime #" << k << " = " << primes[k - 1] << '\n';
        } else {
            std::cout << "#" << k << " is out of range\n";
        }
    }
}
```

```hint
Inside the `constexpr` function, loop over candidates `n = 2, 3, 4, ...` and test each against the primes
found so far. Stop when you have 100.
```

```hint
Remember that the table is 0-based: prime number `k` is `primes[k - 1]`.
```

```stdin
1 2 10 100
```

```expected
prime #1 = 2
prime #2 = 3
prime #10 = 29
prime #100 = 541
```

```stdin
0 101 -5 50
```

```expected hidden
#0 is out of range
#101 is out of range
#-5 is out of range
prime #50 = 229
```

```checks
must constexpr\s+std::array\s*<\s*int\s*,\s*100\s*> :: Write a constexpr function returning std::array<int, 100>.
must constexpr\s+(auto|std::array\s*<[^>]*>)\s+\w+\s*=\s*\w+\s*\( :: Store the table in a constexpr variable.
must static_assert :: Check the table with static_assert.
```
:::

:::exercise One function, many types
Write a function template `void show(const T& value)` that uses `if constexpr` to print:

| Type | Output |
| --- | --- |
| `int` | `int: <value>` |
| `double` | `double: <value with 2 decimals>` |
| `std::string` | `string: "<value>"` (in double quotes) and its length: `string: "hi" (2 chars)` |
| `std::vector<int>` | `vector of <n>: [a, b, c]` |

Read an int, a double, a word, then `n` and `n` ints, and call `show` once for each of the four values,
in that order.

```cpp starter
#include <iomanip>
#include <iostream>
#include <string>
#include <type_traits>
#include <vector>

template <typename T>
void show(const T&) {
    std::cout << "something\n";
}

int main() {
    int i;
    double d;
    std::string s;
    int n;
    std::cin >> i >> d >> s >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    show(i);
    show(d);
    show(s);
    show(v);
}
```

```cpp solution
#include <iomanip>
#include <iostream>
#include <string>
#include <type_traits>
#include <vector>

template <typename T>
void show(const T& value) {
    if constexpr (std::is_same_v<T, int>) {
        std::cout << "int: " << value << '\n';
    } else if constexpr (std::is_same_v<T, double>) {
        std::cout << "double: " << std::fixed << std::setprecision(2) << value << '\n';
    } else if constexpr (std::is_same_v<T, std::string>) {
        std::cout << "string: \"" << value << "\" (" << value.size() << " chars)\n";
    } else if constexpr (std::is_same_v<T, std::vector<int>>) {
        std::cout << "vector of " << value.size() << ": [";
        for (std::size_t k = 0; k < value.size(); ++k) {
            if (k > 0) std::cout << ", ";
            std::cout << value[k];
        }
        std::cout << "]\n";
    }
}

int main() {
    int i;
    double d;
    std::string s;
    int n;
    std::cin >> i >> d >> s >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    show(i);
    show(d);
    show(s);
    show(v);
}
```

```hint
`std::is_same_v<T, std::string>` is a compile-time `bool`. Chain `if constexpr ... else if constexpr ...`.
```

```hint
Calling `value.size()` is only legal in the branches for `std::string` and `std::vector<int>`. That's
exactly what `if constexpr` allows.
```

```stdin
42 3.14159 hello 3
1 2 3
```

```expected
int: 42
double: 3.14
string: "hello" (5 chars)
vector of 3: [1, 2, 3]
```

```stdin
-7 0 x 0
```

```expected hidden
int: -7
double: 0.00
string: "x" (1 chars)
vector of 0: []
```

```checks
must if\s+constexpr :: Use if constexpr to choose the branch.
```
:::

:::exercise Switch on strings
C++ can't `switch` on a `std::string`, but it can switch on a **hash** of one, if the `case` labels are
compile-time constants. Using the FNV-1a hash below:

1. Write a `consteval` user-defined literal `operator""_h` so that `"add"_h` is the compile-time hash of `"add"`.
2. Process commands with a `switch (fnv1a(cmd))` using `case "add"_h:` etc.

Commands (one per line) act on a running `long long` total that starts at 0:

- `add <x>`, `sub <x>`, `mul <x>`: update the total,
- `neg`: negate it,
- `print`: print `total = <total>`,
- anything else: print `unknown command: <cmd>` (and ignore the rest of that line).

```cpp starter
#include <cstdint>
#include <iostream>
#include <limits>
#include <string>
#include <string_view>

constexpr std::uint32_t fnv1a(std::string_view s) {
    std::uint32_t hash = 2166136261u;
    for (char c : s) {
        hash ^= static_cast<unsigned char>(c);
        hash *= 16777619u;
    }
    return hash;
}

int main() {
    long long total = 0;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "print") {
            std::cout << "total = " << total << '\n';
        }
    }
}
```

```cpp solution
#include <cstdint>
#include <iostream>
#include <limits>
#include <string>
#include <string_view>

constexpr std::uint32_t fnv1a(std::string_view s) {
    std::uint32_t hash = 2166136261u;
    for (char c : s) {
        hash ^= static_cast<unsigned char>(c);
        hash *= 16777619u;
    }
    return hash;
}

consteval std::uint32_t operator""_h(const char* text, std::size_t length) {
    return fnv1a(std::string_view(text, length));
}

int main() {
    long long total = 0;
    std::string cmd;
    while (std::cin >> cmd) {
        long long x = 0;
        switch (fnv1a(cmd)) {
            case "add"_h:
                std::cin >> x;
                total += x;
                break;
            case "sub"_h:
                std::cin >> x;
                total -= x;
                break;
            case "mul"_h:
                std::cin >> x;
                total *= x;
                break;
            case "neg"_h:
                total = -total;
                break;
            case "print"_h:
                std::cout << "total = " << total << '\n';
                break;
            default:
                std::cout << "unknown command: " << cmd << '\n';
                std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
                break;
        }
    }
}
```

```hint
A string-literal operator has the signature
`consteval std::uint32_t operator""_h(const char* text, std::size_t length)`. Build a
`std::string_view(text, length)` and hash it.
```

```hint
`fnv1a` is `constexpr`, so it works both in your `consteval` literal (compile time) and on `cmd`
(runtime).
```

```stdin
add 5
mul 3
print
sub 20
neg
print
```

```expected
total = 15
total = 5
```

```stdin
print
jump 10
add 2
mul -4
print
```

```expected hidden
total = 0
unknown command: jump
total = -8
```

```checks
must consteval :: Make the hash literal consteval.
must operator\s*""\s*_h :: Define the user-defined literal operator""_h.
must switch\s*\(\s*fnv1a :: Switch on fnv1a(cmd).
must case\s*""_h :: Use "..."_h literals as case labels.
```
:::

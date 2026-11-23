---
title: assert & static_assert
summary: Catching programmer bugs early. Runtime assertions with assert and NDEBUG, compile-time checks with static_assert, a look at C++26 contracts, and defensive programming habits.
---

## Bugs vs. errors

The previous lessons dealt with **errors**: things that can go wrong even in a correct program (bad
input, missing files), which the program must handle. **Bugs** are different: situations that can
only happen if the code itself is wrong. A function receiving a null pointer it was promised never
to get, an index computed one too large, a sorted vector that isn't sorted.

You don't "handle" a bug; you **find and fix** it. The tool for that is an **assertion**: a statement
of something you believe is always true at that point, checked while you develop. If it's ever false,
the program stops immediately and points at the spot, long before the bug can corrupt data somewhere
else.

## `assert`

`assert(condition)` from **`<cassert>`** evaluates the condition. If it's `true`, nothing happens.
If it's `false`, it prints the failed expression, the file, the line and the function to standard
error, then calls `std::abort()`, which ends the program immediately (no destructors, no exception,
exit status != 0).

```cpp run
#include <cassert>
#include <iostream>
#include <vector>

// Precondition: v is not empty. Calling it with an empty vector is a bug in the CALLER.
int largest(const std::vector<int>& v) {
    assert(!v.empty());
    int best = v[0];
    for (int x : v)
        if (x > best) best = x;
    return best;
}

int main() {
    std::vector<int> v{3, 9, 4};
    std::cout << largest(v) << '\n';     // the assertion holds, so nothing visible happens
}
```

```output
9
```

If `largest` were called with an empty vector, the program would stop with a message like:

```
main.cpp:7: int largest(const std::vector<int>&): Assertion `!v.empty()' failed.
Aborted (core dumped)
```

That message tells you exactly which belief was wrong and where.

### Adding a message

`assert` takes a single expression, but a string literal is always "true" (it's a non-null pointer).
So `&& "message"` doesn't change the result, but the message appears in the printed expression:

```cpp
assert(index < size && "index out of range in Grid::at");
assert(!queue.empty() && "pop() called on an empty queue");
```

Some code uses `assert(false && "unreachable")` to mark code that should never run, such as a
`default:` in a `switch` that already covers every case.

### Commas need parentheses

`assert` is a **macro**, and the preprocessor splits macro arguments at commas that aren't inside
parentheses. An expression with a top-level comma (for example a template argument list) must be
wrapped in an extra pair of parentheses:

```cpp compile-error
#include <cassert>
#include <type_traits>

int main() {
    assert(std::is_same_v<int, int>);   // error: macro "assert" passed 2 arguments, but takes just 1
}
```

```cpp
assert((std::is_same_v<int, int>));    // OK: extra parentheses
```

## `NDEBUG`: assertions in release builds

Assertions cost time, so they're usually **turned off** in release builds. If the macro **`NDEBUG`**
("no debug") is defined **before** `<cassert>` is included, every `assert(...)` expands to
**nothing**: the condition is not even evaluated. Build systems typically pass `-DNDEBUG` to the
compiler for release builds; you can also write `#define NDEBUG` yourself:

```cpp run
#define NDEBUG          // must come BEFORE #include <cassert>
#include <cassert>
#include <iostream>

int main() {
    int checks = 0;
    assert(++checks > 0);   // compiled out: ++checks never happens!
    std::cout << "checks = " << checks << '\n';
}
```

```output
checks = 0
```

That example shows the most important rule about assertions:

> **Pitfall:** Never put code with **side effects** inside `assert` (`++x`, `pop()`, reading input,
> calling a function that changes something). In a release build the whole expression disappears,
> and your program behaves differently. Do the work first, then assert on the result:
>
> ```cpp
> bool ok = load_settings();   // always runs
> assert(ok);                  // only checked in debug builds
> ```

And because assertions may be off, they must **never** be your only protection against bad
*input*. Users, files and networks are allowed to send garbage. Handle that with real error
handling (exceptions, `std::optional`, status codes) that stays active in every build.

## `static_assert`: checks at compile time

Some facts can be checked by the **compiler**: type sizes, type properties, results of `constexpr`
functions. **`static_assert(condition, "message");`** stops compilation with your message if the
condition is false. It costs nothing at run time, and there's no `NDEBUG` switch: it's always on.
Since C++17 the message is optional.

```cpp run
#include <iostream>
#include <type_traits>

static_assert(sizeof(int) >= 4, "this program needs at least 32-bit ints");   // namespace scope
static_assert(sizeof(long long) == 8);                                          // C++17: no message

constexpr int square(int x) { return x * x; }
static_assert(square(12) == 144, "square() is broken");   // test a constexpr function at compile time

struct Pixel {
    unsigned char r, g, b;
};
static_assert(sizeof(Pixel) == 3, "Pixel must be tightly packed");

int main() {
    static_assert(std::is_integral_v<long>);    // block scope works too
    std::cout << "all compile-time checks passed\n";
}
```

```output
all compile-time checks passed
```

The condition must be a **constant expression**: something the compiler can compute. A failing
`static_assert` is a compile error, showing your message:

```cpp compile-error
static_assert(sizeof(int) == 2, "this code was written for 16-bit ints");
// error: static assertion failed: this code was written for 16-bit ints

int main() {}
```

```cpp compile-error
int main() {
    int n = 5;
    static_assert(n > 0);   // error: 'n' is not usable in a constant expression
}
```

### `static_assert` in templates

`static_assert` really shines in templates, where it turns a confusing error deep inside your code
into a clear message at the point of misuse:

```cpp run
#include <iostream>
#include <type_traits>
#include <vector>

template <typename T>
double average(const std::vector<T>& values) {
    static_assert(std::is_arithmetic_v<T>, "average() requires a numeric element type");
    double sum = 0;
    for (const T& v : values) sum += v;
    return values.empty() ? 0.0 : sum / static_cast<double>(values.size());
}

int main() {
    std::cout << average(std::vector<int>{1, 2, 4}) << ' '
              << average(std::vector<double>{0.5, 1.5}) << '\n';
}
```

```output
2.33333 1
```

```cpp compile-error
#include <string>
#include <type_traits>
#include <vector>

template <typename T>
double average(const std::vector<T>& values) {
    static_assert(std::is_arithmetic_v<T>, "average() requires a numeric element type");
    return static_cast<double>(values.size());
}

int main() {
    std::vector<std::string> words{"a", "b"};
    return static_cast<int>(average(words));   // error: static assertion failed: average() requires a numeric element type
}
```

C++20 **concepts** (`template <std::integral T>` or `requires`) are the other way to restrict
templates. The difference: a concept removes the template from overload resolution (so another
overload can be chosen), while `static_assert` lets the template be selected and then fails with your
message. Use concepts to choose between overloads; `static_assert` for "this must never be used
with that type".

## A look ahead: contracts (C++26)

C++26 adds **contracts**: language syntax for preconditions, postconditions and assertions, which
compilers and tools can check, with build-time control over what happens on violation:

```cpp
// C++26, not available in GCC 13 or in this course's compiler settings
int largest(const std::vector<int>& v)
    pre(!v.empty())                      // precondition: checked on entry
    post(r: r >= v.front())             // postcondition on the return value r
{
    contract_assert(v.size() < 1'000'000);   // a better assert, not a macro
    ...
}
```

Until compilers support them, `assert` plus clear comments (`// Precondition: ...`) is the way to
document and check these promises.

## Defensive programming

A few habits that catch bugs early and keep failures understandable:

- **Validate at the boundaries.** Data entering your program (user input, files, network, command-line
  arguments) is checked with real error handling, and rejected with a useful message.
- **Assert inside.** Once data is validated, internal functions state their assumptions with
  `assert`: preconditions on entry, invariants in loops, postconditions before returning.
- **Fail fast.** Stop at the first sign of an impossible state rather than limping on with
  corrupted data that crashes somewhere unrelated later.
- **Check at compile time when you can.** A `static_assert` (or a concept, or a stronger type like an
  `enum class`) is a bug that can't even reach run time.
- **Don't rely on undefined behavior "working".** Use `.at()`, sanitizers and warnings
  (`-Wall -Wextra`) while developing.

| Use | for |
| --- | --- |
| `static_assert` | facts the compiler can check: sizes, type traits, `constexpr` results |
| `assert` | "this can't happen unless my code has a bug", checked in debug builds |
| exceptions / `optional` / error codes | things that can legitimately go wrong at run time |

:::quiz
What does this print when compiled with `-DNDEBUG`?

```cpp
#include <cassert>
#include <iostream>
int main() {
    int x = 1;
    assert(x++ == 100);
    std::cout << x;
}
```

- [ ] `2`
- [x] `1`
- [ ] Nothing: the assertion fails and the program aborts
- [ ] It doesn't compile

With `NDEBUG` defined, `assert(...)` expands to nothing, so neither the comparison nor the `x++` runs. (Without `NDEBUG`, it would abort, because `1 == 100` is false.) This is why asserts must not have side effects.
:::

:::quiz
Which of these should be checked with `static_assert` rather than `assert`? (select all that apply)

- [x] `sizeof(Header) == 16`
- [x] `std::is_integral_v<T>` inside a template
- [ ] The user typed a positive number
- [ ] A pointer parameter isn't null

Only facts known at compile time can go in `static_assert`. User input must be validated with real error handling, and a pointer's value is known only at run time (use `assert`).
:::

:::exercise Guard the precondition {easy}
Write `long long average(const std::vector<long long>& v)` that returns the integer average
(`sum / size`, truncated toward zero). Its precondition is that `v` is **not empty**: state that with
an `assert` at the top of the function.

Since input comes from the user, `main` must handle an empty list itself (print `no numbers`) and
only call `average` when it's safe.

**Input:** `n`, then `n` integers.
**Output:** `average: A`, or `no numbers` if `n` is `0`.

```cpp starter
#include <iostream>
#include <vector>

long long average(const std::vector<long long>& v) {
    long long sum = 0;
    for (long long x : v) sum += x;
    return sum / static_cast<long long>(v.size());
}

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> v(n);
    for (auto& x : v) std::cin >> x;
    std::cout << "average: " << average(v) << '\n';
}
```

```cpp solution
#include <cassert>
#include <iostream>
#include <vector>

long long average(const std::vector<long long>& v) {
    assert(!v.empty() && "average() needs at least one value");
    long long sum = 0;
    for (long long x : v) sum += x;
    return sum / static_cast<long long>(v.size());
}

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> v(n);
    for (auto& x : v) std::cin >> x;
    if (v.empty()) {
        std::cout << "no numbers\n";
        return 0;
    }
    std::cout << "average: " << average(v) << '\n';
}
```

```hint
`#include <cassert>`, then the first line of `average` is `assert(!v.empty());`.
```

```hint
The assert documents and checks the *caller's* duty. The caller (`main`) must check for an empty
list before calling.
```

```stdin
4
1 2 3 5
```

```expected
average: 2
```

```stdin
0
```

```expected
no numbers
```

```stdin
3
-7 -8 0
```

```expected hidden
average: -5
```

```stdin
1
-9223372036854775807
```

```expected hidden
average: -9223372036854775807
```

```checks
must #include\s*<cassert> :: Include <cassert>.
must assert\s*\(\s*!\s*v\.empty\s*\(\s*\)|assert\s*\(\s*v\.size\s*\(\s*\)\s*(>|!=)\s*0 :: Assert that v is not empty inside average.
```
:::

:::exercise Compile-time guard {easy}
Write a function template

```cpp
template <typename T>
T sum_of_squares(const std::vector<T>& v);
```

that returns the sum of `x * x` over all elements (starting from `T{}`, which is `0` for numbers). Make
it refuse non-numeric types at compile time with
`static_assert(std::is_arithmetic_v<T>, "sum_of_squares needs numbers");`.

Also add a namespace-scope `static_assert` that `long long` is at least 8 bytes.

**Input:** `n` and `n` integers, then `m` and `m` decimal numbers.
**Output:** two lines: the sum of squares of the integers (as a `long long`), then of the decimals
(printed with default `std::cout` formatting).

```cpp starter
#include <iostream>
#include <type_traits>
#include <vector>

template <typename T>
T sum_of_squares(const std::vector<T>& v) {
    T total{};
    return total;
}

int main() {
    int n, m;
    std::cin >> n;
    std::vector<long long> ints(n);
    for (auto& x : ints) std::cin >> x;
    std::cin >> m;
    std::vector<double> reals(m);
    for (auto& x : reals) std::cin >> x;

    std::cout << sum_of_squares(ints) << '\n';
    std::cout << sum_of_squares(reals) << '\n';
}
```

```cpp solution
#include <iostream>
#include <type_traits>
#include <vector>

static_assert(sizeof(long long) >= 8, "need 64-bit long long");

template <typename T>
T sum_of_squares(const std::vector<T>& v) {
    static_assert(std::is_arithmetic_v<T>, "sum_of_squares needs numbers");
    T total{};
    for (const T& x : v) total += x * x;
    return total;
}

int main() {
    int n, m;
    std::cin >> n;
    std::vector<long long> ints(n);
    for (auto& x : ints) std::cin >> x;
    std::cin >> m;
    std::vector<double> reals(m);
    for (auto& x : reals) std::cin >> x;

    std::cout << sum_of_squares(ints) << '\n';
    std::cout << sum_of_squares(reals) << '\n';
}
```

```hint
`static_assert` goes inside the template body, so it's checked for each `T` the template is used with.
```

```hint
The namespace-scope one goes outside any function: `static_assert(sizeof(long long) >= 8, "...");`.
```

```stdin
3
1 2 3
2
0.5 1.5
```

```expected
14
2.5
```

```stdin
1
-3000000000
0
```

```expected hidden
9000000000000000000
0
```

```stdin
0
3
-1.5 2 0.25
```

```expected hidden
0
6.3125
```

```checks
must static_assert\s*\(\s*std::is_arithmetic(_v\s*<\s*T\s*>|\s*<\s*T\s*>\s*::\s*value) :: Use static_assert(std::is_arithmetic_v<T>, ...) inside the template.
must static_assert\s*\(\s*sizeof\s*\(\s*long\s+long\s*\) :: Add a static_assert on sizeof(long long).
```
:::

:::exercise Side effects in asserts {easy}
This program is built in **release mode**: `#define NDEBUG` is at the top, so assertions are compiled
out. Its author put the input reading *inside* an `assert`, so in release mode nothing is ever read
and the results are wrong.

Fix it: keep `#define NDEBUG` at the top, move the reading **out** of the `assert`, and keep an
`assert` that checks the read succeeded (for example `assert(std::cin);` after reading).

**Input:** `n`, then `n` integers (`n >= 1`).
**Output:** `sum S` and `max M` on two lines.

```cpp starter
#define NDEBUG   // release build: assertions are compiled out
#include <cassert>
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    long long sum = 0;
    long long best = 0;
    for (int i = 0; i < n; ++i) {
        long long x = 0;
        assert(std::cin >> x);
        sum += x;
        if (i == 0 || x > best) best = x;
    }
    std::cout << "sum " << sum << '\n';
    std::cout << "max " << best << '\n';
}
```

```cpp solution
#define NDEBUG   // release build: assertions are compiled out
#include <cassert>
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    long long sum = 0;
    long long best = 0;
    for (int i = 0; i < n; ++i) {
        long long x = 0;
        std::cin >> x;
        assert(std::cin);
        sum += x;
        if (i == 0 || x > best) best = x;
    }
    std::cout << "sum " << sum << '\n';
    std::cout << "max " << best << '\n';
}
```

```hint
With `NDEBUG` defined, `assert(std::cin >> x);` becomes an empty statement: the `>>` never runs.
```

```hint
Read on its own line (`std::cin >> x;`), then `assert(std::cin);`.
```

```stdin
4
3 -1 9 2
```

```expected
sum 13
max 9
```

```stdin
3
-5 -2 -9
```

```expected hidden
sum -16
max -2
```

```stdin
1
0
```

```expected hidden
sum 0
max 0
```

```checks
must #define\s+NDEBUG :: Keep #define NDEBUG: the program must work in release mode.
must assert\s*\( :: Keep an assert that checks the input.
mustnot assert\s*\([^;]*>> :: Don't read input inside assert().
```
:::

:::exercise Checked ring buffer {medium}
Put all three tools of this module to work in one small class: a **ring buffer**, a fixed-capacity
FIFO queue that stores its elements in a `std::array` and wraps around at the end.

Write `template <typename T, std::size_t N> class RingBuffer` with:

- `bool empty() const`, `bool full() const`, `std::size_t size() const`;
- `void push(const T& value)`: appends at the back. **Precondition:** not full;
- `T pop()`: removes and returns the oldest element. **Precondition:** not empty;
- `const T& front() const`: the oldest element. **Precondition:** not empty.

Rules:

- A `static_assert` inside the class rejects any `N` that isn't a power of two (`1, 2, 4, 8, ...`), so
  positions can wrap with `index & (N - 1)` instead of a division.
- The preconditions are checked with `assert` in the member functions: calling `pop()` on an empty
  buffer is a **bug in the caller**, not an input error.
- So `main`, which talks to the user, must validate every command **before** calling a member function.

`main` creates a `RingBuffer<int, 4>` and reads commands, one per line (blank lines are ignored):

| Command | Output |
| --- | --- |
| `push X` | nothing; `error: buffer full` if the buffer is full |
| `pop` | the removed value; `error: buffer empty` if empty |
| `front` | the oldest value; `error: buffer empty` if empty |
| `size` | `size: K/4` |
| anything else | `error: bad command: <the whole line>` |

"Anything else" includes unknown words, `push` that isn't followed by **exactly one** integer
(`push`, `push x`, `push 1 2`), and extra words after `pop`, `front` or `size`.

```cpp starter
#include <array>
#include <cassert>
#include <cstddef>
#include <iostream>
#include <sstream>
#include <string>

template <typename T, std::size_t N>
class RingBuffer {
public:
    // TODO: empty, full, size, push, pop, front

private:
    std::array<T, N> data_{};
};

int main() {
    RingBuffer<int, 4> buf;
    std::string line;
    while (std::getline(std::cin, line)) {
        // TODO: parse the command and validate it before touching buf
    }
}
```

```cpp solution
#include <array>
#include <cassert>
#include <cstddef>
#include <iostream>
#include <sstream>
#include <string>

template <typename T, std::size_t N>
class RingBuffer {
    static_assert(N > 0 && (N & (N - 1)) == 0, "RingBuffer capacity must be a power of two");

public:
    bool empty() const { return count_ == 0; }
    bool full() const { return count_ == N; }
    std::size_t size() const { return count_; }

    void push(const T& value) {
        assert(!full() && "push() on a full RingBuffer");
        data_[(head_ + count_) & (N - 1)] = value;
        ++count_;
    }

    T pop() {
        assert(!empty() && "pop() on an empty RingBuffer");
        T value = data_[head_];
        head_ = (head_ + 1) & (N - 1);
        --count_;
        return value;
    }

    const T& front() const {
        assert(!empty() && "front() on an empty RingBuffer");
        return data_[head_];
    }

private:
    std::array<T, N> data_{};
    std::size_t head_ = 0;    // index of the oldest element
    std::size_t count_ = 0;   // number of stored elements
};

int main() {
    RingBuffer<int, 4> buf;
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string cmd;
        if (!(in >> cmd)) continue;   // blank line
        std::string extra;
        if (cmd == "push") {
            int x;
            if (!(in >> x) || (in >> extra)) {
                std::cout << "error: bad command: " << line << '\n';
            } else if (buf.full()) {
                std::cout << "error: buffer full\n";
            } else {
                buf.push(x);
            }
        } else if ((cmd == "pop" || cmd == "front" || cmd == "size") && !(in >> extra)) {
            if (cmd == "size") {
                std::cout << "size: " << buf.size() << "/4\n";
            } else if (buf.empty()) {
                std::cout << "error: buffer empty\n";
            } else if (cmd == "pop") {
                std::cout << buf.pop() << '\n';
            } else {
                std::cout << buf.front() << '\n';
            }
        } else {
            std::cout << "error: bad command: " << line << '\n';
        }
    }
}
```

```hint
Keep two counters: `head_` (where the oldest element is) and `count_` (how many there are). The next
free slot is `(head_ + count_) & (N - 1)`; popping advances `head_` the same way.
```

```hint
`N & (N - 1)` is `0` exactly when `N` is a power of two (one bit set), so the check is
`static_assert(N > 0 && (N & (N - 1)) == 0, "...");`.
```

```hint
To validate `push X`, read with a per-line `std::istringstream`: `in >> x` must succeed **and** a
following `in >> extra` must fail.
```

```stdin
push 1
push 2
push 3
size
pop
push 4
push 5
push 6
size
pop
pop
pop
pop
pop
```

```expected
size: 3/4
1
error: buffer full
size: 4/4
2
3
4
5
error: buffer empty
```

```stdin
front
pop
push
push x
push 7 8
jump
push 7
front
size

pop now
pop
```

```expected
error: buffer empty
error: buffer empty
error: bad command: push
error: bad command: push x
error: bad command: push 7 8
error: bad command: jump
7
size: 1/4
error: bad command: pop now
7
```

```stdin
push 1
pop
push 2
pop
push 3
pop
push 4
pop
push 5
pop
push 6
push 7
push 8
push 9
push 10
front
pop
pop
pop
pop
size
```

```expected hidden
1
2
3
4
5
error: buffer full
6
6
7
8
9
size: 0/4
```

```stdin
push -2147483648
push 2147483647
push 12abc
front
size
```

```expected hidden
error: bad command: push 12abc
-2147483648
size: 2/4
```

```checks
must template\s*<[^>]*std::size_t\s+N :: Make RingBuffer a template with a std::size_t N parameter.
must static_assert\s*\( :: Reject capacities that aren't powers of two with static_assert.
must \bassert\s*\( :: State the preconditions with assert.
must std::array :: Store the elements in a std::array.
mustnot std::(deque|queue|vector|list) :: Implement the ring yourself on top of std::array.
```
:::

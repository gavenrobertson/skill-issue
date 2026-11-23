---
title: A Tour of C++20 and C++23
summary: std::span, designated initializers, <=>, std::format, attributes, handy C++20 utilities, then a look at modules, coroutines, and C++23's std::print, std::expected, deducing this, ranges::to, and mdspan.
---

## Keeping up with a living language

C++ gets a new standard every three years, and each one makes everyday code shorter and safer. This
lesson is a guided tour of features you haven't met yet (plus quick recaps of a few you have), so you can
recognize them in modern code and know what to reach for.

- **Part 1:** C++20 features you can use right now (all the examples run here).
- **Part 2:** C++20's two biggest features, modules and coroutines, at the concept level.
- **Part 3:** C++23 highlights. This site compiles in C++20 mode, so these are shown as plain code
  blocks; on your machine, try them with `-std=c++23` and a recent compiler.

## Part 1: C++20 you can use today

### `std::span`: a view of contiguous elements

Functions that process "a bunch of ints in a row" used to take `const std::vector<int>&` (which rejects
arrays and `std::array`) or a pointer plus a length (error-prone). `std::span<T>` (from `<span>`) is a
lightweight, non-owning **view** of any contiguous sequence: a pointer and a size, with a nice interface.
It's to arrays what `std::string_view` is to strings.

```cpp run
#include <array>
#include <iostream>
#include <span>
#include <vector>

int sum(std::span<const int> values) {          // accepts vector, array, C array, part of any of them
    int total = 0;
    for (int v : values) total += v;
    return total;
}

void doubleAll(std::span<int> values) {         // non-const span: can modify the elements
    for (int& v : values) v *= 2;
}

int main() {
    std::vector<int> vec{1, 2, 3, 4, 5};
    std::array<int, 3> arr{10, 20, 30};
    int raw[] = {100, 200};

    std::cout << sum(vec) << ' ' << sum(arr) << ' ' << sum(raw) << '\n';

    std::span<int> all(vec);
    std::cout << sum(all.first(2)) << ' '       // first 2 elements
              << sum(all.last(2)) << ' '        // last 2 elements
              << sum(all.subspan(1, 3)) << '\n';  // 3 elements starting at index 1

    doubleAll(std::span(vec).subspan(3));       // double only the tail
    for (int v : vec) std::cout << v << ' ';
    std::cout << "| size " << all.size() << ", front " << all.front() << '\n';
}
```

```output
15 60 300
3 9 9
1 2 3 8 10 | size 5, front 1
```

Like `std::string_view`, a span doesn't own its data: never let it outlive the container it views, and
don't keep one across operations that may reallocate a vector.

### Designated initializers (recap)

Aggregates can be initialized by **member name**, in declaration order, with unnamed members keeping
their defaults:

```cpp run
#include <iostream>
#include <string>

struct WindowOptions {
    std::string title = "Untitled";
    int width = 800;
    int height = 600;
    bool resizable = true;
};

int main() {
    WindowOptions a{.title = "Editor", .width = 1280};      // height and resizable keep defaults
    WindowOptions b{.height = 300, .resizable = false};
    std::cout << a.title << ' ' << a.width << 'x' << a.height << ' ' << a.resizable << '\n';
    std::cout << b.title << ' ' << b.width << 'x' << b.height << ' ' << b.resizable << '\n';
}
```

```output
Editor 1280x600 1
Untitled 800x300 0
```

They make call sites self-documenting, which is why "options structs" with designated initializers are
replacing long parameter lists. The members must appear in declaration order: `{.width = 1, .title = "x"}`
is an error.

### The spaceship operator `<=>` (recap)

`= default` on `operator<=>` gives a type all six comparisons, comparing members in order:

```cpp run
#include <algorithm>
#include <compare>
#include <iostream>
#include <vector>

struct Date {
    int year;
    int month;
    int day;
    auto operator<=>(const Date&) const = default;   // also generates ==
};

int main() {
    std::vector<Date> dates{{2024, 5, 1}, {2023, 12, 31}, {2024, 1, 15}};
    std::sort(dates.begin(), dates.end());
    for (const Date& d : dates) std::cout << d.year << '-' << d.month << '-' << d.day << ' ';
    std::cout << '\n' << (Date{2024, 1, 1} < Date{2024, 1, 2}) << ' '
              << (Date{2024, 1, 1} == Date{2024, 1, 1}) << '\n';

    auto cmp = 3 <=> 5;                               // std::strong_ordering
    std::cout << (cmp < 0 ? "less" : cmp > 0 ? "greater" : "equal") << '\n';
}
```

```output
2023-12-31 2024-1-15 2024-5-1
1 1
less
```

### `std::format` (recap)

Python-style formatting, type-safe and fast, from `<format>`:

```cpp run
#include <format>
#include <iostream>
#include <string>

int main() {
    std::string s = std::format("{} has {} items costing ${:.2f}", "cart", 3, 19.5);
    std::cout << s << '\n';
    std::cout << std::format("[{:>8}] [{:<6}] [{:^7}] [{:08.3f}]", "right", "left", "mid", 3.14159) << '\n';
    std::cout << std::format("{:#x} {:#b} {:+} {:e}", 255, 5, 7, 12345.678) << '\n';
    std::cout << std::format("{0} {1} {0}", "echo", "ping") << '\n';   // argument positions
}
```

```output
cart has 3 items costing $19.50
[   right] [left  ] [  mid  ] [0003.142]
0xff 0b101 +7 1.234568e+04
echo ping echo
```

The format string is checked **at compile time**: `std::format("{:d}", "text")` doesn't compile.

### Attributes: `[[likely]]`, `[[unlikely]]`, `[[nodiscard]]`, `[[maybe_unused]]`

Attributes give the compiler extra information. They never change what correct code means.

```cpp run
#include <iostream>

[[nodiscard("check whether parsing worked")]]       // C++20 allows a reason
bool parseDigit(char c, int& out) {
    if (c >= '0' && c <= '9') [[likely]] {          // hint: this branch is the common case
        out = c - '0';
        return true;
    } else [[unlikely]] {
        return false;
    }
}

int main() {
    [[maybe_unused]] int debugOnly = 42;            // no "unused variable" warning
    int value = 0;
    if (parseDigit('7', value)) std::cout << "parsed " << value << '\n';
    // parseDigit('x', value);   // warning: ignoring return value ... 'check whether parsing worked'
}
```

```output
parsed 7
```

`[[likely]]`/`[[unlikely]]` (C++20) let the optimizer lay out the common path faster. Measure before
using them; compilers are usually good at guessing. `[[nodiscard]]` (C++17) is the most valuable of the
four: put it on functions whose result must not be ignored, such as error codes.

### A bag of small C++20 conveniences

```cpp run
#include <algorithm>
#include <array>
#include <bit>
#include <iostream>
#include <map>
#include <numbers>
#include <numeric>
#include <set>
#include <string>
#include <vector>

enum class Color { red, green, blue };

std::string name(Color c) {
    switch (c) {
        using enum Color;                    // C++20: no need to write Color:: in every case
        case red: return "red";
        case green: return "green";
        case blue: return "blue";
    }
    return "?";
}

int main() {
    // contains() on associative containers (no more find(...) != end())
    std::map<std::string, int> ages{{"ada", 36}};
    std::set<int> primes{2, 3, 5, 7};
    std::cout << ages.contains("ada") << primes.contains(4) << '\n';

    // starts_with / ends_with on strings (and string_view)
    std::string file = "report_2024.csv";
    std::cout << file.starts_with("report") << file.ends_with(".txt") << '\n';

    // std::erase / std::erase_if: the erase-remove idiom in one call
    std::vector<int> v{1, 2, 3, 4, 5, 6};
    auto removed = std::erase_if(v, [](int x) { return x % 2 == 0; });
    std::cout << "removed " << removed << ", left " << v.size() << '\n';

    // std::ssize: a signed size, convenient for loops with int indices
    for (int i = std::ssize(v) - 1; i >= 0; --i) std::cout << v[i];
    std::cout << '\n';

    // math constants and helpers
    std::cout << std::numbers::pi << ' ' << std::midpoint(10, 20) << '\n';

    // bit manipulation
    std::cout << std::popcount(0b1011u) << ' ' << std::has_single_bit(64u) << ' ' << std::bit_width(5u) << '\n';

    // std::to_array deduces type and size
    auto arr = std::to_array({3, 1, 2});
    std::cout << arr.size() << '\n';

    std::cout << name(Color::green) << '\n';
}
```

```output
10
10
removed 3, left 3
531
3.14159 15
3 1 3
3
green
```

Also in C++20, and covered in their own lessons: concepts, ranges and views, `consteval`/`constinit`,
`std::jthread`, calendar dates in `<chrono>`, and `constexpr` containers. One more worth knowing is
`std::source_location`, a macro-free replacement for `__FILE__`/`__LINE__`/`__func__`:

```cpp
#include <source_location>

void log(std::string_view msg, std::source_location where = std::source_location::current()) {
    std::cout << where.file_name() << ':' << where.line() << " [" << where.function_name() << "] " << msg << '\n';
}
// log("loading");   ->   main.cpp:42 [void load()] loading   (the CALLER's location)
```

## Part 2: modules and coroutines (concepts)

### Modules

`#include` pastes text, so every `.cpp` re-parses the same huge headers, macros leak between files, and
include order can matter. **Modules** (C++20) replace that with compiled interfaces:

```cpp
// file: math.cppm  (a module interface unit)
export module math;              // this file defines module "math"

export int add(int a, int b) {   // exported: visible to importers
    return a + b;
}

int helper() { return 42; }      // not exported: invisible outside the module
```

```cpp
// file: main.cpp
import math;                     // not textual: imports the compiled interface
import std;                      // C++23: the entire standard library as one module

int main() {
    std::println("{}", add(2, 3));
}
```

Benefits: much faster builds, no macro leakage, no include guards, and only `export`ed names are
visible. Build-system and compiler support arrived slowly (it needs build tools to understand module
dependencies), but recent CMake with GCC 14+, Clang 17+, and MSVC can build module code, and `import std;`
is increasingly practical. Expect headers to coexist with modules for many years.

### Coroutines

A **coroutine** is a function that can **suspend** in the middle and be **resumed** later, keeping its
local variables. Any function using one of these keywords is a coroutine:

- `co_yield value`: produce a value and suspend (generators),
- `co_await expression`: suspend until something is ready (asynchronous I/O),
- `co_return value`: finish.

C++20 provides only the low-level machinery; you need a library type as the return type. C++23 adds
`std::generator`:

```cpp
#include <generator>   // C++23

std::generator<int> fibonacci() {
    int a = 0, b = 1;
    while (true) {
        co_yield a;              // hand out a value, pause here
        int next = a + b;        // resume here on the next iteration
        a = b;
        b = next;
    }
}

for (int x : fibonacci() | std::views::take(10)) std::cout << x << ' ';   // 0 1 1 2 3 5 8 13 21 34
```

Coroutines shine for lazy sequences and especially asynchronous code (networking, game scripting),
where `co_await` makes callback-heavy code read like straight-line code. Libraries such as Asio, cppcoro,
and folly provide the coroutine types for async work.

## Part 3: C++23 highlights

### `std::print` and `std::println`

`std::format`, printed directly, from `<print>`. Faster than `std::cout`, correct with Unicode on every
platform, and no `<<` chains:

```cpp
#include <print>

std::println("Hello, {}!", name);                  // with newline
std::print("{} + {} = {}\n", a, b, a + b);         // without
std::println(stderr, "warning: {}", msg);          // to another stream
```

### `std::expected`: errors as values

`std::expected<T, E>` (from `<expected>`) holds **either** a value of type `T` **or** an error of type
`E`. It's like `std::optional` that can say *why* it's empty, and an alternative to exceptions when
failure is a normal outcome:

```cpp
#include <expected>

enum class ParseError { empty, notANumber, tooBig };

std::expected<int, ParseError> parsePort(std::string_view s) {
    if (s.empty()) return std::unexpected(ParseError::empty);
    int value = 0;
    for (char c : s) {
        if (c < '0' || c > '9') return std::unexpected(ParseError::notANumber);
        value = value * 10 + (c - '0');
        if (value > 65535) return std::unexpected(ParseError::tooBig);
    }
    return value;                                    // success
}

auto port = parsePort("8080");
if (port) std::println("port {}", *port);            // has_value() / operator*
else if (port.error() == ParseError::tooBig) { /* ... */ }

int p = parsePort("abc").value_or(80);               // fallback
```

It also supports chaining with `.and_then`, `.transform`, and `.or_else`.

### Deducing `this`

A member function can take the object as an explicit first parameter, written `this Self&& self`.
One template then handles `const`, non-`const`, lvalue, and rvalue objects, replacing the four nearly
identical overloads people used to write, and it enables recursive lambdas:

```cpp
struct Buffer {
    std::vector<char> data;

    template <typename Self>
    auto&& at(this Self&& self, std::size_t i) {     // one function instead of const + non-const
        return std::forward<Self>(self).data[i];
    }
};

auto factorial = [](this auto self, int n) -> int {  // a lambda that calls itself
    return n <= 1 ? 1 : n * self(n - 1);
};
```

### `std::ranges::to`

C++20 ranges could build pipelines, but turning the result back into a container was clumsy. C++23 adds
`std::ranges::to`:

```cpp
auto evens = std::views::iota(1, 11)
           | std::views::filter([](int x) { return x % 2 == 0; })
           | std::ranges::to<std::vector>();          // std::vector<int>{2, 4, 6, 8, 10}
```

C++23 also adds many new views: `std::views::zip`, `enumerate`, `chunk`, `slide`, `adjacent`,
`cartesian_product`, `join_with`, `stride`, and more.

### `std::mdspan` and multidimensional subscripts

`std::mdspan` (from `<mdspan>`) is a multidimensional `std::span`: a non-owning view that interprets flat
memory as a matrix (or higher-dimensional array). It's paired with the new ability of `operator[]` to take
several arguments:

```cpp
std::vector<double> storage(3 * 4);
std::mdspan grid(storage.data(), 3, 4);   // 3 rows x 4 columns over the vector's memory
grid[1, 2] = 7.5;                         // C++23: multidimensional operator[]
```

### More C++23

- `if consteval { ... }`: the clean replacement for `std::is_constant_evaluated()`.
- `std::flat_map` / `std::flat_set`: sorted-vector-based associative containers, faster for lookups in small to medium sets.
- `std::stacktrace`: capture and print the call stack.
- `std::unreachable()`: tell the optimizer a code path can't happen (UB if it does).
- `auto(x)`: make a prvalue copy of `x`.
- `#elifdef`, `#elifndef`, and a standard `#warning`.
- `z`/`uz` literal suffixes for `std::ptrdiff_t`/`std::size_t`: `for (auto i = 0uz; i < v.size(); ++i)`.

### And next: C++26

The next standard brings some of the biggest changes in C++'s history, including **static reflection**
(programs that inspect their own types at compile time, e.g. to generate serialization code
automatically), **contracts** (`pre`, `post`, and `contract_assert` to state function preconditions),
`std::execution` (a framework for asynchronous and parallel work), `#embed` (include binary files as
data), and `std::inplace_vector`. Compilers are implementing these now; check cppreference's compiler
support tables to see what yours can do.

:::quiz
Which function signature accepts a `std::vector<int>`, a `std::array<int, 5>`, and a C array `int[3]` without copying?

- [ ] `void f(std::vector<int> v)`
- [ ] `void f(const std::vector<int>& v)`
- [x] `void f(std::span<const int> s)`
- [ ] `void f(int* p)`

`std::span` views any contiguous sequence and knows its size. A raw pointer would lose the size, and the
vector versions reject arrays (or copy).
:::

:::quiz
What does `std::expected<int, std::string>` hold?

- [ ] Both an `int` and a `std::string`
- [x] Either an `int` value or a `std::string` error
- [ ] An `int` or nothing
- [ ] A `std::string` that is expected to contain an int

It's a C++23 sum type: a value on success, an error object on failure. `std::optional<int>` is the
"value or nothing" type.
:::

:::exercise Span statistics
Write `void stats(std::span<const int> values)` that prints `min=<min> max=<max> sum=<sum>` (one line)
for a non-empty span, or `empty` for an empty one.

Read `n` and `n` integers into a `std::vector<int>`, then call `stats` three times:

1. on the whole vector,
2. on the first half (`n / 2` elements, use `.first()`),
3. on the rest (use `.subspan()` or `.last()`).

```cpp starter
#include <iostream>
#include <span>
#include <vector>

void stats(const std::vector<int>& values) {
    std::cout << "size=" << values.size() << '\n';
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    stats(v);
}
```

```cpp solution
#include <iostream>
#include <span>
#include <vector>

void stats(std::span<const int> values) {
    if (values.empty()) {
        std::cout << "empty\n";
        return;
    }
    int mn = values.front();
    int mx = values.front();
    long long sum = 0;
    for (int x : values) {
        if (x < mn) mn = x;
        if (x > mx) mx = x;
        sum += x;
    }
    std::cout << "min=" << mn << " max=" << mx << " sum=" << sum << '\n';
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    std::span<const int> all(v);
    stats(all);
    stats(all.first(n / 2));
    stats(all.subspan(n / 2));
}
```

```hint
`std::span<const int> all(v);` then `all.first(k)` is the first `k` elements and `all.subspan(k)` is
everything from index `k` to the end.
```

```stdin
5
4 -2 9 0 7
```

```expected
min=-2 max=9 sum=18
min=-2 max=4 sum=2
min=0 max=9 sum=16
```

```stdin
1
42
```

```expected hidden
min=42 max=42 sum=42
empty
min=42 max=42 sum=42
```

```stdin
0
```

```expected
empty
empty
empty
```

```checks
must std::span\s*<\s*const\s+int\s*> :: stats should take a std::span<const int>.
must \.first\s*\( :: Use .first() for the first half.
must \.(subspan|last)\s*\( :: Use .subspan() or .last() for the rest.
```
:::

:::exercise Server options
The `ServerOptions` struct has defaults for every member. Read lines of `key value` pairs, where the key
is `port`, `threads`, or `name` (each appears at most once, in any order, and any may be missing). Build
**one** `ServerOptions` using a designated initializer for `port` and `threads` (passing the value read,
or the default if the key was missing), plus `name` if it was given.

Print it as:

```
name=<name> port=<port> threads=<threads> verbose=<0|1>
```

Hint: read into `std::optional`s or variables pre-filled with the defaults first, then construct with
`ServerOptions opts{.name = ..., .port = ..., .threads = ...};`.

```cpp starter
#include <iostream>
#include <string>

struct ServerOptions {
    std::string name = "server";
    int port = 8080;
    int threads = 4;
    bool verbose = false;
};

int main() {
    ServerOptions opts;
    std::cout << "name=" << opts.name << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

struct ServerOptions {
    std::string name = "server";
    int port = 8080;
    int threads = 4;
    bool verbose = false;
};

int main() {
    const ServerOptions defaults{};
    std::string name = defaults.name;
    int port = defaults.port;
    int threads = defaults.threads;

    std::string key;
    while (std::cin >> key) {
        if (key == "port") std::cin >> port;
        else if (key == "threads") std::cin >> threads;
        else if (key == "name") std::cin >> name;
    }

    ServerOptions opts{.name = name, .port = port, .threads = threads};
    std::cout << "name=" << opts.name << " port=" << opts.port << " threads=" << opts.threads
              << " verbose=" << opts.verbose << '\n';
}
```

```hint
Members must be listed in declaration order inside the braces: `.name`, then `.port`, then `.threads`.
Omitted members (like `verbose`) keep their default member initializers.
```

```stdin
port 9000
threads 16
```

```expected
name=server port=9000 threads=16 verbose=0
```

```stdin
threads 1
name api
```

```expected hidden
name=api port=8080 threads=1 verbose=0
```

```expected
name=server port=8080 threads=4 verbose=0
```

```checks
must \{\s*\.name\s*=|\{\s*\.port\s*=|\{\s*\.threads\s*= :: Construct ServerOptions with designated initializers.
```
:::

:::exercise Version sorter
A version is three integers `major.minor.patch`. Write `struct Version` with a **defaulted `<=>`**, read
versions (like `1.10.0`) until the end of input, sort them, and print them in ascending order, one per
line, using `std::format("{}.{}.{}", ...)`. Then print `latest: <max version>` (or `latest: none` if there
were none).

Note that `1.10.0` is newer than `1.9.3`: compare numbers, not text.

```cpp starter
#include <algorithm>
#include <format>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> versions;
    std::string s;
    while (std::cin >> s) versions.push_back(s);
    std::sort(versions.begin(), versions.end());
    for (const auto& v : versions) std::cout << v << '\n';
}
```

```cpp solution
#include <algorithm>
#include <compare>
#include <format>
#include <iostream>
#include <string>
#include <vector>

struct Version {
    int major;
    int minor;
    int patch;
    auto operator<=>(const Version&) const = default;
};

int main() {
    std::vector<Version> versions;
    int a, b, c;
    char dot1, dot2;
    while (std::cin >> a >> dot1 >> b >> dot2 >> c) {
        versions.push_back({a, b, c});
    }
    std::sort(versions.begin(), versions.end());
    for (const Version& v : versions) {
        std::cout << std::format("{}.{}.{}", v.major, v.minor, v.patch) << '\n';
    }
    if (versions.empty()) {
        std::cout << "latest: none\n";
    } else {
        const Version& last = versions.back();
        std::cout << std::format("latest: {}.{}.{}", last.major, last.minor, last.patch) << '\n';
    }
}
```

```hint
You can read `1.10.0` with `std::cin >> a >> dot >> b >> dot >> c;` where `dot` is a `char`.
```

```hint
`auto operator<=>(const Version&) const = default;` compares `major`, then `minor`, then `patch`, which
is exactly version ordering, so `std::sort` just works.
```

```stdin
1.10.0
1.9.3
0.1.0
1.9.12
```

```expected
0.1.0
1.9.3
1.9.12
1.10.0
latest: 1.10.0
```

```stdin
2.0.0
2.0.0
```

```expected hidden
2.0.0
2.0.0
latest: 2.0.0
```

```expected
latest: none
```

```checks
must operator<=>\s*\([^)]*\)\s*const\s*=\s*default :: Give Version a defaulted operator<=>.
must std::format :: Print with std::format.
```
:::

:::exercise Filter by prefix
The first input word is a prefix; the rest are words. Store the words in a `std::vector<std::string>`
and:

1. remove every word that does **not** start with the prefix, using `std::erase_if` and `starts_with`,
2. print the remaining words in their original order, separated by single spaces (an empty line if none remain),
3. print `removed: <count>` using the value returned by `std::erase_if`,
4. print `duplicates: <count>`: how many of the remaining words had already appeared earlier among them
   (use a `std::set` and its `.contains()`).

```cpp starter
#include <iostream>
#include <set>
#include <string>
#include <vector>

int main() {
    std::string prefix;
    std::cin >> prefix;
    std::vector<std::string> words;
    std::string w;
    while (std::cin >> w) words.push_back(w);
    for (const auto& word : words) std::cout << word << ' ';
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>
#include <set>
#include <string>
#include <vector>

int main() {
    std::string prefix;
    std::cin >> prefix;
    std::vector<std::string> words;
    std::string w;
    while (std::cin >> w) words.push_back(w);

    auto removed = std::erase_if(words, [&prefix](const std::string& word) {
        return !word.starts_with(prefix);
    });

    for (std::size_t i = 0; i < words.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << words[i];
    }
    std::cout << '\n';
    std::cout << "removed: " << removed << '\n';

    std::set<std::string> seen;
    int duplicates = 0;
    for (const auto& word : words) {
        if (seen.contains(word)) ++duplicates;
        else seen.insert(word);
    }
    std::cout << "duplicates: " << duplicates << '\n';
}
```

```hint
`std::erase_if(words, predicate)` removes the elements for which the predicate returns `true` and
returns how many it removed.
```

```stdin
re
read write reuse rerun red read
```

```expected
read reuse rerun red read
removed: 1
duplicates: 1
```

```stdin
zz
alpha beta
```

```expected hidden

removed: 2
duplicates: 0
```

```stdin
a
a a a
```

```expected
a a a
removed: 0
duplicates: 2
```

```checks
must std::erase_if :: Remove words with std::erase_if.
must \.starts_with\s*\( :: Test the prefix with starts_with.
must \.contains\s*\( :: Find duplicates with .contains().
```
:::

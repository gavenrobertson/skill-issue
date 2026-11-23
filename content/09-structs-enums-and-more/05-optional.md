---
title: std::optional
summary: Represent "a value, or nothing" safely. Creating optionals, checking them, reading them with *, value() and value_or(), and returning maybe-a-value from functions.
---

## The problem: "no result" without a good way to say it

Many functions sometimes have no answer: searching for something that isn't there, parsing text that
isn't a number, looking up a key that doesn't exist. Before C++17, the usual workarounds were all
awkward:

```cpp
int findIndex(const std::vector<int>& v, int target);    // returns -1 if not found ("sentinel value")
bool parse(const std::string& s, int& out);              // bool + output parameter
const Person* lookup(const std::string& name);           // nullptr if not found
```

Sentinels are easy to forget to check, and sometimes every value is valid (what's the sentinel for "a
temperature"?). Output parameters are clumsy. Pointers raise ownership questions.

**`std::optional<T>`** (C++17, header `<optional>`) is a type that holds **either a `T` or nothing**.
The "maybe" is right there in the type:

```cpp
std::optional<int> findIndex(const std::vector<int>& v, int target);
std::optional<int> parse(const std::string& s);
```

## Creating optionals

```cpp run
#include <iostream>
#include <optional>
#include <string>

int main() {
    std::optional<int> a;                      // empty
    std::optional<int> b = std::nullopt;       // empty, explicitly
    std::optional<int> c = 42;                 // holds 42
    std::optional<int> d{7};                   // holds 7
    auto e = std::make_optional(3.5);          // optional<double> holding 3.5
    std::optional<std::string> f = "hi";       // holds std::string "hi"
    std::optional<int> g{};                    // empty (NOT zero!)

    std::cout << a.has_value() << b.has_value() << c.has_value() << d.has_value()
              << e.has_value() << f.has_value() << g.has_value() << '\n';
}
```

```output
0011110
```

`std::nullopt` is a special constant that means "empty optional", similar to how `nullptr` means "null
pointer".

## Checking whether there's a value

```cpp run
#include <iostream>
#include <optional>

int main() {
    std::optional<int> x = 5;
    std::optional<int> y;

    if (x.has_value()) std::cout << "x has a value\n";   // explicit
    if (x) std::cout << "x is truthy\n";                 // short form: converts to bool
    if (!y) std::cout << "y is empty\n";
    if (y == std::nullopt) std::cout << "y equals nullopt\n";
}
```

```output
x has a value
x is truthy
y is empty
y equals nullopt
```

> **Pitfall:** With `std::optional<bool>` or `std::optional<int>`, `if (opt)` asks "is there a value?",
> **not** "is the value true/non-zero?". An optional holding `0` is truthy. Use `.has_value()` when it
> might confuse readers.

## Getting the value out

There are three ways, with different safety:

| Expression | If there is a value | If empty |
| --- | --- | --- |
| `*opt` (or `opt->member`) | the value | **undefined behavior** |
| `opt.value()` | the value | throws `std::bad_optional_access` |
| `opt.value_or(fallback)` | the value | `fallback` |

```cpp run
#include <iostream>
#include <optional>
#include <string>

int main() {
    std::optional<int> score = 90;
    std::optional<int> missing;

    std::cout << *score << '\n';                 // fine: we know there's a value
    std::cout << score.value() << '\n';          // same, but checked
    std::cout << missing.value_or(-1) << '\n';   // fallback for the empty one
    std::cout << score.value_or(-1) << '\n';     // the value, since there is one

    std::optional<std::string> nickname = "Ace";
    std::cout << nickname->size() << '\n';       // -> reaches members of the value

    *score += 5;                                 // the value is modifiable through *
    std::cout << *score << '\n';
}
```

```output
90
90
-1
90
3
95
```

The common pattern is **check, then dereference**:

```cpp
if (auto idx = findIndex(v, 42)) {    // declare and test in one go
    std::cout << "found at " << *idx;  // safe: we're inside the if
}
```

`.value()` on an empty optional throws an exception. You'll learn how to handle exceptions in a later
module; until then, treat it as "crashes the program with an error message", and check first.

## Returning "maybe a value" from functions

Inside a function returning `std::optional<T>`, you return either a `T` (it's converted automatically)
or `std::nullopt` (or `{}`) for "nothing":

```cpp run
#include <iostream>
#include <optional>
#include <string>
#include <vector>

std::optional<std::size_t> findIndex(const std::vector<int>& v, int target) {
    for (std::size_t i = 0; i < v.size(); ++i) {
        if (v[i] == target) {
            return i;               // a value
        }
    }
    return std::nullopt;            // nothing
}

std::optional<int> parseDigit(char c) {
    if (c >= '0' && c <= '9') {
        return c - '0';
    }
    return {};                      // {} also means "empty"
}

int main() {
    std::vector<int> v{4, 8, 15, 16, 23, 42};

    if (auto idx = findIndex(v, 15)) {
        std::cout << "15 is at index " << *idx << '\n';
    }
    if (!findIndex(v, 99)) {
        std::cout << "99 is not there\n";
    }

    for (char c : std::string("7x3")) {
        std::cout << c << " -> " << parseDigit(c).value_or(-1) << '\n';
    }
}
```

```output
15 is at index 2
99 is not there
7 -> 7
x -> -1
3 -> 3
```

## Changing an optional

```cpp run
#include <iostream>
#include <optional>
#include <string>

int main() {
    std::optional<std::string> name;

    name = "Ada";                       // now holds a value
    std::cout << *name << '\n';

    name.emplace("Grace");              // construct a new value in place
    std::cout << *name << '\n';

    name.reset();                       // empty again
    std::cout << name.has_value() << '\n';

    name = "Linus";
    name = std::nullopt;                // also empties it
    std::cout << name.value_or("(none)") << '\n';
}
```

```output
Ada
Grace
0
(none)
```

## Optional members

`std::optional` also works great inside structs, for data that's legitimately missing sometimes:

```cpp run
#include <iostream>
#include <optional>
#include <string>

struct Person {
    std::string first;
    std::optional<std::string> middle;   // not everyone has one
    std::string last;
};

void printName(const Person& p) {
    std::cout << p.first << ' ';
    if (p.middle) {
        std::cout << *p.middle << ' ';
    }
    std::cout << p.last << '\n';
}

int main() {
    printName({"Ada", std::nullopt, "Lovelace"});
    printName({"John", "Ronald Reuel", "Tolkien"});
}
```

```output
Ada Lovelace
John Ronald Reuel Tolkien
```

## Comparing optionals

Optionals compare with each other and with plain values. An empty optional is equal only to another
empty one, and it's **less than** any value:

```cpp run
#include <iostream>
#include <optional>

int main() {
    std::optional<int> a = 5;
    std::optional<int> none;

    std::cout << (a == 5) << ' ' << (a != 6) << ' ' << (a > 3) << '\n';
    std::cout << (none == std::nullopt) << ' ' << (none < a) << ' ' << (none < -1000) << '\n';
}
```

```output
1 1 1
1 1 1
```

## Notes and limits

- An optional stores its value **inside itself** (no heap allocation), plus a flag. So
  `sizeof(std::optional<int>)` is typically 8: 4 for the `int`, 1 for the flag, plus padding.
- `std::optional<T&>` (an optional reference) isn't allowed in C++20. Use a pointer (`T*`, possibly
  null) for "maybe refers to something".
- Don't use optional when "no value" is an **error** that needs explaining. C++23 adds
  `std::expected<T, E>`, which holds either a value or an error describing what went wrong.
- C++23 also adds chaining helpers like `opt.transform(f)`, `opt.and_then(f)`, and `opt.or_else(f)`.

:::quiz
What does this print?

```cpp
std::optional<int> x = 0;
if (x) std::cout << "yes"; else std::cout << "no";
```

- [x] `yes`
- [ ] `no`
- [ ] It doesn't compile
- [ ] Undefined behavior

`if (x)` checks whether the optional **has a value**, and it does (the value 0). It does not look at the
value itself.
:::

:::quiz
`std::optional<int> o;` is empty. Which of these are safe? (select all that apply)

- [ ] `*o`
- [x] `o.value_or(0)`
- [x] `o.has_value()`
- [x] `o == std::nullopt`

`*o` on an empty optional is undefined behavior. `.value_or`, `.has_value()`, and comparing with
`std::nullopt` are always safe.
:::

:::exercise Find the index {easy}
Write `std::optional<std::size_t> findIndex(const std::vector<int>& v, int target)` that returns the
index of the **first** element equal to `target`, or `std::nullopt` if there is none.

**Input:** `n`, then `n` integers, then the `target`.
**Output:** `found at <index>` or `not found`, followed by a newline.

```cpp starter
#include <iostream>
#include <optional>
#include <vector>

int findIndex(const std::vector<int>& v, int target) {
    for (std::size_t i = 0; i < v.size(); ++i) {
        if (v[i] == target) return static_cast<int>(i);
    }
    return -1;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int target;
    std::cin >> target;

    std::cout << "found at " << findIndex(v, target) << '\n';
}
```

```cpp solution
#include <iostream>
#include <optional>
#include <vector>

std::optional<std::size_t> findIndex(const std::vector<int>& v, int target) {
    for (std::size_t i = 0; i < v.size(); ++i) {
        if (v[i] == target) return i;
    }
    return std::nullopt;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;
    int target;
    std::cin >> target;

    if (auto idx = findIndex(v, target)) {
        std::cout << "found at " << *idx << '\n';
    } else {
        std::cout << "not found\n";
    }
}
```

```hint
Change the return type to `std::optional<std::size_t>`, `return i;` when found, and
`return std::nullopt;` at the end.
```

```hint
In `main`: `if (auto idx = findIndex(v, target)) { ... *idx ... } else { ... }`.
```

```stdin
5
4 8 15 8 23
8
```

```expected
found at 1
```

```stdin
3
1 2 3
7
```

```expected
not found
```

```stdin
0
5
```

```expected hidden
not found
```

```stdin
2
-1 0
0
```

```expected hidden
found at 1
```

```stdin
4
9 1 2 9
9
```

```expected hidden
found at 0
```

```checks
must std::optional\s*<\s*(std::)?size_t\s*>\s+findIndex :: Return std::optional<std::size_t> from findIndex.
must std::nullopt|return\s*\{\s*\}\s*; :: Return std::nullopt when the target isn't found.
```
:::

:::exercise Phone book {easy}
Read `n` entries of `name number`, then `q` queries (names). Write
`std::optional<std::string> lookup(const std::vector<Entry>& book, const std::string& name)`, where
`Entry` is a struct with `name` and `number` strings. For each query, print the number, or `unknown` if
the name isn't in the book, using **`value_or`**.

**Input:** `n`, then `n` lines `name number`, then `q`, then `q` names.
**Output:** one line per query: `<name>: <number or unknown>`.

```cpp starter
#include <iostream>
#include <optional>
#include <string>
#include <vector>

struct Entry {
    std::string name;
    std::string number;
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Entry> book(n);
    for (Entry& e : book) std::cin >> e.name >> e.number;

    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        std::string name;
        std::cin >> name;
        std::cout << name << ": unknown\n";
    }
}
```

```cpp solution
#include <iostream>
#include <optional>
#include <string>
#include <vector>

struct Entry {
    std::string name;
    std::string number;
};

std::optional<std::string> lookup(const std::vector<Entry>& book, const std::string& name) {
    for (const Entry& e : book) {
        if (e.name == name) return e.number;
    }
    return std::nullopt;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<Entry> book(n);
    for (Entry& e : book) std::cin >> e.name >> e.number;

    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        std::string name;
        std::cin >> name;
        std::cout << name << ": " << lookup(book, name).value_or("unknown") << '\n';
    }
}
```

```hint
`lookup(book, name).value_or("unknown")` gives the number if found, else `"unknown"`.
```

```stdin
3
ada 555-1234
linus 555-9876
grace 555-0000
3
linus
alan
ada
```

```expected
linus: 555-9876
alan: unknown
ada: 555-1234
```

```stdin
0
1
nobody
```

```expected
nobody: unknown
```

```stdin
2
x 1
x 2
1
x
```

```expected hidden
x: 1
```

```stdin
1
Ada 555-1
2
ada
Ada
```

```expected hidden
ada: unknown
Ada: 555-1
```

```checks
must std::optional\s*<\s*std::string\s*>\s+lookup :: Return std::optional<std::string> from lookup.
must value_or\s*\( :: Print the result with value_or.
```
:::

:::exercise Safe division chain {medium}
Write `std::optional<int> safeDivide(int a, int b)` that returns `a / b`, or `std::nullopt` when `b` is 0.
Read `a`, `b`, and `c` and compute `(a / b) / c` using `safeDivide` twice. If either division fails,
print `error`.

**Input:** three integers `a b c`.
**Output:** the result, or `error`, followed by a newline.

```cpp starter
#include <iostream>
#include <optional>

int main() {
    int a, b, c;
    std::cin >> a >> b >> c;
    std::cout << a / b / c << '\n';
}
```

```cpp solution
#include <iostream>
#include <optional>

std::optional<int> safeDivide(int a, int b) {
    if (b == 0) return std::nullopt;
    return a / b;
}

int main() {
    int a, b, c;
    std::cin >> a >> b >> c;

    std::optional<int> result;
    if (auto first = safeDivide(a, b)) {
        result = safeDivide(*first, c);
    }

    if (result) {
        std::cout << *result << '\n';
    } else {
        std::cout << "error\n";
    }
}
```

```hint
Only do the second division if the first one produced a value: `if (auto first = safeDivide(a, b)) { ... }`.
```

```stdin
100 5 2
```

```expected
10
```

```stdin
7 0 1
```

```expected
error
```

```stdin
8 2 0
```

```expected hidden
error
```

```stdin
-90 3 -5
```

```expected hidden
6
```

```stdin
3 5 2
```

```expected hidden
0
```

```stdin
0 7 0
```

```expected hidden
error
```

```checks
must std::optional\s*<\s*int\s*>\s+safeDivide :: Write std::optional<int> safeDivide(int a, int b).
must std::nullopt :: Return std::nullopt for division by zero.
```
:::

:::exercise Parse the numbers {hard}
Write `std::optional<int> parseInt(const std::string& s)` that accepts an optional leading `-` followed
by **one or more digits** and nothing else, and returns the number; anything else returns `std::nullopt`.
(Inputs are at most 9 digits long, so the result fits in an `int`.)

Read whitespace-separated tokens until the input ends. Add up the valid numbers and count the invalid
tokens.

**Input:** zero or more tokens.
**Output:** `sum=<sum> invalid=<count>`, followed by a newline.

Example: `12 abc -5 4x - 007` gives `sum=14 invalid=3` (`-` alone and `4x` are invalid; `007` is 7).

```cpp starter
#include <iostream>
#include <optional>
#include <string>

int main() {
    std::string token;
    int sum = 0;
    int invalid = 0;
    while (std::cin >> token) {
        sum += std::stoi(token);
    }
    std::cout << "sum=" << sum << " invalid=" << invalid << '\n';
}
```

```cpp solution
#include <iostream>
#include <optional>
#include <string>

std::optional<int> parseInt(const std::string& s) {
    std::size_t i = 0;
    bool negative = false;
    if (i < s.size() && s[i] == '-') {
        negative = true;
        ++i;
    }
    if (i == s.size()) return std::nullopt;   // empty, or just "-"

    int value = 0;
    for (; i < s.size(); ++i) {
        if (s[i] < '0' || s[i] > '9') return std::nullopt;
        value = value * 10 + (s[i] - '0');
    }
    return negative ? -value : value;
}

int main() {
    std::string token;
    int sum = 0;
    int invalid = 0;
    while (std::cin >> token) {
        if (auto n = parseInt(token)) {
            sum += *n;
        } else {
            ++invalid;
        }
    }
    std::cout << "sum=" << sum << " invalid=" << invalid << '\n';
}
```

```hint
Skip one leading `-` if present. If nothing is left, it's invalid. Then every remaining character must be
between `'0'` and `'9'`; build the value with `value = value * 10 + (c - '0')`.
```

```hint
In `main`: `if (auto n = parseInt(token)) sum += *n; else ++invalid;`.
```

```stdin
12 abc -5 4x - 007
```

```expected
sum=14 invalid=3
```

```stdin
1 2 3
```

```expected
sum=6 invalid=0
```

```stdin

```

```expected hidden
sum=0 invalid=0
```

```stdin
-- -0 +5 999999999 -1
```

```expected hidden
sum=999999998 invalid=2
```

```stdin
1-2 5- -7 0 12.5 x9
```

```expected hidden
sum=-7 invalid=4
```

```checks
must std::optional\s*<\s*int\s*>\s+parseInt :: Write std::optional<int> parseInt(const std::string& s).
mustnot std::stoi|atoi|std::from_chars :: Parse the digits yourself.
```
:::

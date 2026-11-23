---
title: Pair, Tuple & Structured Bindings
summary: std::pair and std::tuple for quick groups of values, std::get and std::tie, and unpacking pairs, tuples, structs, arrays, and map entries with auto [a, b].
---

Sometimes you need to group two or three values without defining a whole struct, most often to
**return several values** from a function. The standard library provides two ready-made generic structs
for this: `std::pair` and `std::tuple`. And C++17's **structured bindings** let you unpack them (and
structs, and arrays) into named variables in one line.

## `std::pair`

A `std::pair<A, B>` (from `<utility>`) holds exactly two values, called `first` and `second`. The two
types can be different:

```cpp run
#include <iostream>
#include <string>
#include <utility>

int main() {
    std::pair<std::string, int> person{"Ada", 36};    // brace initialization
    std::cout << person.first << " is " << person.second << '\n';

    person.second += 1;                               // members are public and modifiable
    std::cout << person.first << " is now " << person.second << '\n';

    std::pair<int, double> p2;                        // value-initialized: 0 and 0.0
    p2 = {3, 1.5};                                    // assign from braces
    std::cout << p2.first << ' ' << p2.second << '\n';
}
```

```output
Ada is 36
Ada is now 37
3 1.5
```

### `std::make_pair` and CTAD

There are three ways to create a pair without spelling out both types:

```cpp run
#include <iostream>
#include <string>
#include <utility>

int main() {
    auto a = std::make_pair(1, 2.5);               // pre-C++17 helper: pair<int, double>
    std::pair b{'x', true};                        // C++17 CTAD: pair<char, bool>
    std::pair c{std::string("Ada"), 36};           // pair<std::string, int>

    std::cout << a.first << ' ' << a.second << '\n';
    std::cout << b.first << ' ' << b.second << '\n';
    std::cout << c.first << ' ' << c.second << '\n';
}
```

```output
1 2.5
x 1
Ada 36
```

**CTAD** (class template argument deduction, C++17) means the compiler deduces the template arguments
from the initializer, just like `auto` does for variables. One gotcha: a string literal deduces as
`const char*`, not `std::string`. `std::pair p{"Ada", 36};` is a `pair<const char*, int>`. Use
`std::string("Ada")`, or write the types out when it matters.

### Returning a pair from a function

The most common use: a function that produces two results.

```cpp run
#include <iostream>
#include <utility>

std::pair<int, int> divide(int a, int b) {
    return {a / b, a % b};          // braces build the return type
}

int main() {
    std::pair<int, int> result = divide(17, 5);
    std::cout << result.first << " remainder " << result.second << '\n';
}
```

```output
3 remainder 2
```

### Comparing pairs

Pairs support `==`, `!=`, `<`, `>`, etc. They compare **lexicographically**: first by `first`, and only if
those are equal, by `second`. That's why sorting a vector of pairs "just works":

```cpp run
#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::pair<int, std::string>> v{{3, "c"}, {1, "z"}, {3, "a"}, {2, "m"}};
    std::sort(v.begin(), v.end());     // by number, then by string

    for (const auto& p : v) std::cout << p.first << p.second << ' ';
    std::cout << '\n';
    std::cout << (std::pair{1, 2} < std::pair{1, 3}) << '\n';
}
```

```output
1z 2m 3a 3c
1
```

## `std::tuple`

A `std::tuple` (from `<tuple>`) is the generalization: **any number** of values of any types. Its elements
don't have names, so you access them by position with `std::get<N>`:

```cpp run
#include <iostream>
#include <string>
#include <tuple>

int main() {
    std::tuple<std::string, int, double> student{"Ada", 36, 3.9};

    std::cout << std::get<0>(student) << '\n';   // index must be a compile-time constant
    std::cout << std::get<1>(student) << '\n';
    std::cout << std::get<2>(student) << '\n';

    std::get<1>(student) = 37;                   // std::get returns a reference: assignable
    std::cout << std::get<int>(student) << '\n'; // by type, if that type appears exactly once

    auto t = std::make_tuple(1, 'a', 2.5);       // tuple<int, char, double>
    std::tuple u{true, 42};                      // C++17 CTAD: tuple<bool, int>
    std::cout << std::get<1>(t) << ' ' << std::get<0>(u) << '\n';

    std::cout << std::tuple_size_v<decltype(t)> << '\n';   // number of elements: 3
}
```

```output
Ada
36
3.9
37
a 1
3
```

Using an index that's out of range is a compile error, not a runtime crash:

```cpp compile-error
#include <tuple>

int main() {
    std::tuple<int, double> t{1, 2.0};
    auto x = std::get<2>(t);   // error: only indexes 0 and 1 exist
}
```

### `std::tie`: unpacking into existing variables

`std::tie(a, b, c)` creates a tuple of **references** to existing variables. Assigning a tuple to it
unpacks the values into those variables. `std::ignore` skips an element:

```cpp run
#include <iostream>
#include <string>
#include <tuple>

std::tuple<std::string, int, bool> lookup() {
    return {"Linus", 54, true};
}

int main() {
    std::string name;
    int age = 0;
    std::tie(name, age, std::ignore) = lookup();   // unpack, ignoring the bool
    std::cout << name << ' ' << age << '\n';

    int a = 1, b = 2;
    std::tie(a, b) = std::tuple{b, a};             // swap via tuples
    std::cout << a << ' ' << b << '\n';
}
```

```output
Linus 54
2 1
```

`std::tie` is also a neat way to compare structs by several fields:
`std::tie(x.last, x.first) < std::tie(y.last, y.first)`.

## Structured bindings (C++17)

Writing `.first`, `.second`, and `std::get<2>` everywhere hurts readability. **Structured bindings**
declare several named variables at once, one per element:

```cpp
auto [name1, name2, ...] = expression;
```

### With pairs and tuples

```cpp run
#include <iostream>
#include <string>
#include <tuple>
#include <utility>

std::pair<int, int> divide(int a, int b) { return {a / b, a % b}; }

std::tuple<std::string, int, double> student() { return {"Grace", 85, 3.7}; }

int main() {
    auto [quotient, remainder] = divide(17, 5);
    std::cout << quotient << " r " << remainder << '\n';

    auto [name, age, gpa] = student();
    std::cout << name << ' ' << age << ' ' << gpa << '\n';
}
```

```output
3 r 2
Grace 85 3.7
```

Compare `auto [quotient, remainder] = divide(17, 5);` with `result.first` and `result.second`: you get
meaningful names for free.

### With structs

Structured bindings unpack a struct's members **in declaration order** (all members must be public):

```cpp run
#include <iostream>

struct Point {
    int x = 0;
    int y = 0;
};

Point midpoint(Point a, Point b) {
    return {(a.x + b.x) / 2, (a.y + b.y) / 2};
}

int main() {
    auto [x, y] = midpoint({0, 0}, {10, 4});
    std::cout << x << ',' << y << '\n';
}
```

```output
5,2
```

### With arrays

C arrays and `std::array` work too, as long as the number of names matches the size:

```cpp run
#include <array>
#include <iostream>

int main() {
    int rgb[3]{255, 128, 0};
    auto [r, g, b] = rgb;
    std::cout << r << ' ' << g << ' ' << b << '\n';

    std::array<double, 2> coords{1.5, -2.5};
    auto [lat, lon] = coords;
    std::cout << lat << ' ' << lon << '\n';
}
```

```output
255 128 0
1.5 -2.5
```

### With maps: `auto [key, value]`

A `std::map` stores its entries as `std::pair<const Key, Value>`. Structured bindings make iterating
over a map read naturally:

```cpp run
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> stock{{"apples", 5}, {"pears", 0}, {"kiwis", 12}};

    // without bindings: entry.first and entry.second
    for (const auto& entry : stock) {
        std::cout << entry.first << '=' << entry.second << ' ';
    }
    std::cout << '\n';

    // with bindings
    for (const auto& [fruit, count] : stock) {
        std::cout << fruit << ": " << count << '\n';
    }

    // insert() returns a pair<iterator, bool>
    auto [it, inserted] = stock.insert({"plums", 3});
    std::cout << it->first << ' ' << inserted << '\n';
}
```

```output
apples=5 kiwis=12 pears=0
apples: 5
kiwis: 12
pears: 0
plums 1
```

(A `std::map` keeps its keys sorted, which is why `kiwis` comes before `pears`. Maps are covered in
depth in the STL containers module.)

### References in bindings

By default, `auto [a, b] = x;` makes a hidden **copy** of `x` and binds the names to the copy's elements.
Add `&` to bind to the original, so you can modify it, or `const auto&` to avoid copying read-only data:

```cpp run
#include <iostream>
#include <map>
#include <string>
#include <utility>

int main() {
    std::pair<int, int> p{1, 2};

    auto [a, b] = p;      // copy
    a = 100;              // doesn't touch p
    std::cout << p.first << '\n';

    auto& [c, d] = p;     // references into p
    c = 100;              // changes p.first
    std::cout << p.first << '\n';

    std::map<std::string, int> prices{{"tea", 3}, {"cake", 5}};
    for (auto& [item, price] : prices) {
        price *= 2;       // modifies the map's values
    }
    for (const auto& [item, price] : prices) {
        std::cout << item << ' ' << price << '\n';
    }
}
```

```output
1
100
cake 10
tea 6
```

### Rules and limits

- You **must** use `auto` (optionally with `const`, `&`, `&&`). You can't write the types: `auto [int a, int b]` is not valid.
- The number of names must **exactly** match the number of elements:

```cpp compile-error
#include <utility>

int main() {
    std::pair<int, int> p{1, 2};
    auto [a, b, c] = p;   // error: 3 names provided for structured binding, but 'std::pair<int, int>' decomposes into 2 elements
}
```

- There's no way to skip an element (C++26 adds `_` as a placeholder name). If you don't need one,
  give it a name anyway.
- With `-Wall`, unused binding names don't trigger warnings as long as at least one is used.

## pair, tuple, or struct?

| Use | When |
| --- | --- |
| `std::pair` | two values whose meaning is obvious from context (key/value, min/max) |
| `std::tuple` | quick, local grouping of 3+ values, often immediately unpacked |
| a `struct` | the data has meaning, is used in many places, or has more than ~3 fields |

`std::get<2>(t)` doesn't tell a reader anything, while `student.gpa` does. When in doubt, define a struct:
structured bindings work just as well with it.

:::quiz
What are the types in `std::pair p{"Ada", 36};`?

- [ ] `std::pair<std::string, int>`
- [x] `std::pair<const char*, int>`
- [ ] `std::pair<char, int>`
- [ ] It doesn't compile

CTAD deduces from the initializer types, and a string literal decays to `const char*`. Use
`std::string("Ada")` or spell out the types to get a `std::string`.
:::

:::quiz
After this code, what is `p.first`?

```cpp
std::pair<int, int> p{1, 2};
auto [a, b] = p;
a = 10;
auto& [c, d] = p;
c += 5;
```

- [ ] `1`
- [x] `6`
- [ ] `15`
- [ ] `10`

`auto [a, b]` binds to a copy, so `a = 10` doesn't affect `p`. `auto& [c, d]` binds to `p` itself, so
`c += 5` makes `p.first` 6.
:::

:::exercise Min and max pair {easy}
Write `std::pair<int, int> minMax(const std::vector<int>& v)` that returns the smallest and largest
element. In `main`, unpack the result with a **structured binding**.

**Input:** `n` (at least 1), then `n` integers.
**Output:** `min <smallest> max <largest>`, followed by a newline.

```cpp starter
#include <iostream>
#include <utility>
#include <vector>

std::pair<int, int> minMax(const std::vector<int>& v) {
    return {v[0], v[0]};
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::pair<int, int> result = minMax(v);
    std::cout << "min " << result.first << " max " << result.second << '\n';
}
```

```cpp solution
#include <iostream>
#include <utility>
#include <vector>

std::pair<int, int> minMax(const std::vector<int>& v) {
    int lo = v[0];
    int hi = v[0];
    for (int x : v) {
        if (x < lo) lo = x;
        if (x > hi) hi = x;
    }
    return {lo, hi};
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    auto [lo, hi] = minMax(v);
    std::cout << "min " << lo << " max " << hi << '\n';
}
```

```hint
`auto [lo, hi] = minMax(v);` gives the two parts of the pair names.
```

```stdin
5
4 -2 9 0 9
```

```expected
min -2 max 9
```

```stdin
1
7
```

```expected
min 7 max 7
```

```stdin
3
-1 -1 -1
```

```expected hidden
min -1 max -1
```

```stdin
4
10 3 -8 2
```

```expected hidden
min -8 max 10
```

```checks
must std::pair\s*<\s*int\s*,\s*int\s*>\s+minMax :: Return std::pair<int, int> from minMax.
must auto\s*&?\s*\[\s*\w+\s*,\s*\w+\s*\]\s*=\s*minMax :: Unpack the result with auto [lo, hi] = minMax(v);
```
:::

:::exercise Stats with a tuple {medium}
Write `std::tuple<int, int, double> stats(const std::vector<int>& v)` that returns the **sum**, the
**maximum**, and the **average** of the values. In `main`, unpack the result into three variables you
declared beforehand, using `std::tie`.

**Input:** `n` (at least 1), then `n` integers.
**Output:** `sum=<sum> max=<max> avg=<avg>`, followed by a newline (print the average with plain
`std::cout <<`, so `2.5` prints as `2.5` and `3.0` as `3`).

```cpp starter
#include <iostream>
#include <tuple>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    int sum = 0;
    int max = 0;
    double avg = 0;
    std::cout << "sum=" << sum << " max=" << max << " avg=" << avg << '\n';
}
```

```cpp solution
#include <iostream>
#include <tuple>
#include <vector>

std::tuple<int, int, double> stats(const std::vector<int>& v) {
    int sum = 0;
    int max = v[0];
    for (int x : v) {
        sum += x;
        if (x > max) max = x;
    }
    return {sum, max, static_cast<double>(sum) / v.size()};
}

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    int sum = 0;
    int max = 0;
    double avg = 0;
    std::tie(sum, max, avg) = stats(v);
    std::cout << "sum=" << sum << " max=" << max << " avg=" << avg << '\n';
}
```

```hint
`return {sum, max, average};` builds the tuple. Compute the average as a `double`:
`static_cast<double>(sum) / v.size()`.
```

```hint
`std::tie(sum, max, avg) = stats(v);` assigns the three elements to your existing variables.
```

```stdin
4
1 2 3 4
```

```expected
sum=10 max=4 avg=2.5
```

```stdin
1
-6
```

```expected
sum=-6 max=-6 avg=-6
```

```stdin
3
-3 -9 -6
```

```expected hidden
sum=-18 max=-3 avg=-6
```

```stdin
2
-2 -3
```

```expected hidden
sum=-5 max=-2 avg=-2.5
```

```stdin
3
1 2 2
```

```expected hidden
sum=5 max=2 avg=1.66667
```

```checks
must std::tuple\s*<\s*int\s*,\s*int\s*,\s*double\s*>\s+stats :: Return std::tuple<int, int, double> from stats.
must std::tie\s*\( :: Unpack the result with std::tie.
```
:::

:::exercise Word frequencies {easy}
Read words until the input ends and count how often each one appears, using a
`std::map<std::string, int>`. Print the words in alphabetical order (the map does that for you), iterating
with a structured binding: `for (const auto& [word, count] : counts)`.

**Input:** zero or more whitespace-separated words.
**Output:** one line per distinct word: `<word> <count>`. Nothing at all if there are no words.

```cpp starter
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> counts;
    std::string word;
    while (std::cin >> word) {
        // count it
    }
    // print each word and its count
}
```

```cpp solution
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> counts;
    std::string word;
    while (std::cin >> word) {
        ++counts[word];
    }
    for (const auto& [w, count] : counts) {
        std::cout << w << ' ' << count << '\n';
    }
}
```

```hint
`++counts[word];` creates the entry with 0 the first time a word is seen, then increments it.
```

```stdin
the cat and the hat and the bat
```

```expected
and 2
bat 1
cat 1
hat 1
the 3
```

```stdin
solo
```

```expected
solo 1
```

```stdin
b a b A
```

```expected hidden
A 1
a 1
b 2
```

```stdin
```

```expected hidden
```

```checks
must for\s*\(\s*const\s+auto\s*&\s*\[\s*\w+\s*,\s*\w+\s*\]\s*: :: Iterate with for (const auto& [word, count] : counts).
```
:::

:::exercise Golf leaderboard {medium}
In golf, the **lowest** score wins. Read players into a `std::vector<std::pair<int, std::string>>`
(score first, then name), sort it with `std::sort` (pairs sort by score, then by name for ties), and
print the leaderboard.

**Input:** `n` (1 or more), then `n` lines of `name score`.
**Output:** one line per player in leaderboard order: `<rank>. <name> (<score>)`, with ranks
`1, 2, 3, ...` (tied players still get consecutive ranks).

```cpp starter
#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::string name;
        int score;
        std::cin >> name >> score;
        std::cout << i + 1 << ". " << name << " (" << score << ")\n";
    }
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<std::pair<int, std::string>> board;
    for (int i = 0; i < n; ++i) {
        std::string name;
        int score;
        std::cin >> name >> score;
        board.push_back({score, name});
    }

    std::sort(board.begin(), board.end());

    int rank = 1;
    for (const auto& [score, name] : board) {
        std::cout << rank << ". " << name << " (" << score << ")\n";
        ++rank;
    }
}
```

```hint
Store each player as `{score, name}` so the score comes first. Then `std::sort(board.begin(), board.end());`
orders by score, and by name when scores tie.
```

```hint
Unpack each entry while printing: `for (const auto& [score, name] : board)`.
```

```stdin
3
Rory 70
Tiger 68
Jon 72
```

```expected
1. Tiger (68)
2. Rory (70)
3. Jon (72)
```

```stdin
1
Solo 80
```

```expected
1. Solo (80)
```

```stdin
4
Max 71
Ana 71
Zed 65
Bea 71
```

```expected hidden
1. Zed (65)
2. Ana (71)
3. Bea (71)
4. Max (71)
```

```stdin
3
Amy -2
Bo 0
Cy -5
```

```expected hidden
1. Cy (-5)
2. Amy (-2)
3. Bo (0)
```

```checks
must std::vector\s*<\s*std::pair\s*<\s*int\s*,\s*std::string\s*>\s*> :: Store the players in a std::vector<std::pair<int, std::string>>.
must std::sort :: Sort the leaderboard with std::sort.
```
:::

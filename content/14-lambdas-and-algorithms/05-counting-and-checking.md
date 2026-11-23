---
title: Counting & Checking
summary: Ask questions about a range without writing loops. count and count_if, all_of/any_of/none_of, finding minimums and maximums, std::min/max/clamp, and comparing ranges with equal and mismatch.
---

## Why not just write a loop?

Every algorithm in this lesson is a few lines of loop you could write yourself. Using the named
algorithm is still better:

- The **name says what you mean**. `std::any_of(...)` reads as a question; a loop with a flag
  variable and a `break` has to be decoded.
- **No off-by-one or forgotten-`break` bugs.**
- They work on any container, and on part of one.

## `count` and `count_if`

`std::count(first, last, value)` counts elements equal to `value`. `std::count_if(first, last, pred)`
counts elements for which the predicate returns `true`:

```cpp run
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<int> v{1, 3, 3, 7, 3, 10, -2};
    std::string text = "mississippi";

    std::cout << std::count(v.begin(), v.end(), 3) << '\n';                         // 3
    std::cout << std::count(text.begin(), text.end(), 's') << '\n';                 // 4
    std::cout << std::count_if(v.begin(), v.end(), [](int x) { return x > 2; }) << '\n';

    int limit = 5;
    auto small = std::count_if(v.begin(), v.end(), [limit](int x) { return x < limit; });
    std::cout << small << " below " << limit << '\n';
}
```

```output
3
4
5
5 below 5
```

Both return a **signed** count (`std::ptrdiff_t`, usually a 64-bit integer), not `int`. Store it
in `auto`, or in a wide enough integer.

## `all_of`, `any_of`, `none_of`

Three yes/no questions about a range, each taking a predicate:

| Algorithm | True when... | On an empty range |
| --- | --- | --- |
| `std::all_of` | **every** element satisfies it | `true` |
| `std::any_of` | **at least one** element satisfies it | `false` |
| `std::none_of` | **no** element satisfies it | `true` |

They stop as soon as the answer is known (`any_of` stops at the first match).

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> ages{19, 23, 31, 17, 45};
    auto adult = [](int a) { return a >= 18; };

    std::cout << std::boolalpha
              << std::all_of(ages.begin(), ages.end(), adult) << ' '    // false: 17
              << std::any_of(ages.begin(), ages.end(), adult) << ' '    // true
              << std::none_of(ages.begin(), ages.end(), [](int a) { return a > 100; }) << '\n';

    std::vector<int> empty;
    std::cout << std::all_of(empty.begin(), empty.end(), adult) << ' '
              << std::any_of(empty.begin(), empty.end(), adult) << ' '
              << std::none_of(empty.begin(), empty.end(), adult) << '\n';
}
```

```output
false true true
true false true
```

The empty-range answers follow logic: "every element of nothing is an adult" can't be disproved,
so it's `true` (this is called *vacuous truth*). Keep it in mind for edge cases.

## `min_element`, `max_element`, `minmax_element`

These return **iterators**, not values, so you can also get the **position**. On an empty range they
return `last`, so check before dereferencing.

```cpp run
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct City {
    std::string name;
    int population;
};

int main() {
    std::vector<int> v{4, 9, 1, 9, 1, 6};

    auto lo = std::min_element(v.begin(), v.end());
    auto hi = std::max_element(v.begin(), v.end());
    std::cout << "min " << *lo << " at " << (lo - v.begin()) << '\n';   // FIRST smallest
    std::cout << "max " << *hi << " at " << (hi - v.begin()) << '\n';   // FIRST largest

    auto [mn, mx] = std::minmax_element(v.begin(), v.end());           // one pass, both at once
    std::cout << "minmax " << *mn << " at " << (mn - v.begin())
              << ", " << *mx << " at " << (mx - v.begin()) << '\n';     // max: the LAST largest!

    std::vector<City> cities{{"Oslo", 709}, {"Lima", 9750}, {"Rome", 2873}};
    auto biggest = std::max_element(cities.begin(), cities.end(),
                                    [](const City& a, const City& b) { return a.population < b.population; });
    std::cout << biggest->name << '\n';

    std::vector<int> none;
    if (std::max_element(none.begin(), none.end()) == none.end()) std::cout << "empty!\n";
}
```

```output
min 1 at 2
max 9 at 1
minmax 1 at 2, 9 at 3
Lima
empty!
```

Two things to remember:

- The comparator is still a **"less than"**, even for `max_element`. You say how to compare; the
  algorithm decides which end it wants.
- `minmax_element` returns the **first** minimum but the **last** maximum. `max_element` returns
  the **first** maximum.

## `std::min`, `std::max`, `std::minmax`

For a few individual values (not a range), use `std::min` and `std::max`. They take two values, or
an **initializer list** `{...}` of any length, plus an optional comparator:

```cpp run
#include <algorithm>
#include <iostream>
#include <string>

int main() {
    int a = 7, b = 3, c = 9;

    std::cout << std::min(a, b) << ' ' << std::max(a, b) << '\n';
    std::cout << std::min({a, b, c, -4}) << ' ' << std::max({a, b, c, -4}) << '\n';

    // with a comparator: the longest word
    std::string w = std::max({std::string("fig"), std::string("banana"), std::string("kiwi")},
                             [](const std::string& x, const std::string& y) { return x.size() < y.size(); });
    std::cout << w << '\n';

    auto [lo, hi] = std::minmax({5, 2, 8, 1});
    std::cout << lo << ".." << hi << '\n';
}
```

```output
3 7
-4 9
banana
1..8
```

Both arguments must have the **same type**. Mixing types doesn't compile, because `std::min` is a
template with one type parameter `T`:

```cpp compile-error
#include <algorithm>

int main() {
    long big = 10;
    int small = 3;
    return std::min(big, small);   // error: deduced conflicting types for parameter 'T' ('long' and 'int')
}
```

Fix it by converting one side, or by naming the type: `std::min<long>(big, small)`.

> **Pitfall:** The two-argument `std::min`/`std::max` return a **reference** to one of the
> arguments. `const int& m = std::max(x, y + 1);` can leave `m` referring to the temporary `y + 1`,
> which is destroyed at the end of the statement. Store the result **by value** (`int m = ...`)
> and you're safe.

## `std::clamp`

`std::clamp(v, lo, hi)` (C++17) limits `v` to the range `[lo, hi]`: it returns `lo` if `v < lo`,
`hi` if `v > hi`, and `v` otherwise. `lo` must not be greater than `hi`.

```cpp run
#include <algorithm>
#include <iostream>

int main() {
    std::cout << std::clamp(150, 0, 100) << ' '
              << std::clamp(-20, 0, 100) << ' '
              << std::clamp(42, 0, 100) << ' '
              << std::clamp(0.75, 0.0, 0.5) << '\n';
}
```

```output
100 0 42 0.5
```

## Comparing ranges: `equal` and `mismatch`

`std::equal` tells you whether two ranges hold the same elements in the same order.
`std::mismatch` tells you **where** they first differ, as a pair of iterators (one into each range).

Always use the **four-iterator** forms `(first1, last1, first2, last2)`. The older three-iterator
form assumes the second range is at least as long as the first, and reads past its end if it isn't.

```cpp run
#include <algorithm>
#include <cctype>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<int> a{1, 2, 3, 4};
    std::vector<int> b{1, 2, 9, 4};
    std::vector<int> c{1, 2};

    std::cout << std::boolalpha
              << std::equal(a.begin(), a.end(), b.begin(), b.end()) << ' '
              << std::equal(a.begin(), a.end(), c.begin(), c.end()) << ' '
              << std::equal(a.begin(), a.begin() + 2, c.begin(), c.end()) << '\n';

    auto [ia, ib] = std::mismatch(a.begin(), a.end(), b.begin(), b.end());
    std::cout << "differ at index " << (ia - a.begin()) << ": " << *ia << " vs " << *ib << '\n';

    // Palindrome check: compare a string with itself read backwards
    std::string word = "racecar";
    bool pal = std::equal(word.begin(), word.end(), word.rbegin(), word.rend());
    std::cout << word << " is a palindrome: " << pal << '\n';

    // Case-insensitive comparison with a custom predicate
    std::string x = "Hello", y = "hELLO";
    bool same = std::equal(x.begin(), x.end(), y.begin(), y.end(),
                           [](char p, char q) { return std::tolower(p) == std::tolower(q); });
    std::cout << "case-insensitive equal: " << same << '\n';
}
```

```output
false false true
differ at index 2: 3 vs 9
racecar is a palindrome: true
case-insensitive equal: true
```

When one range is a prefix of the other, `mismatch` stops at the end of the shorter one; check
whether the returned iterators equal the `end()`s before dereferencing. (For whole containers of the
same type, `a == b` does the same as `std::equal`.)

:::quiz
`v` is empty. What do `std::all_of`, `std::any_of` and `std::none_of` return (with any predicate)?

- [ ] `false`, `false`, `false`
- [x] `true`, `false`, `true`
- [ ] `true`, `true`, `true`
- [ ] It's undefined behavior

There's no element that breaks "all", no element that satisfies "any", and no element that breaks "none".
:::

:::quiz
`v` is `{5, 2, 5, 2}`. What does this print?

```cpp
auto [lo, hi] = std::minmax_element(v.begin(), v.end());
std::cout << (lo - v.begin()) << (hi - v.begin())
          << (std::max_element(v.begin(), v.end()) - v.begin());
```

- [ ] `100`
- [x] `120`
- [ ] `320`
- [ ] `122`

`minmax_element` gives the first minimum (index 1) and the **last** maximum (index 2). `max_element` gives the **first** maximum (index 0).
:::

:::exercise Count matches {easy}
Read a target value, then `n` integers. Print how many integers are **equal** to the target (with
`std::count`), and how many are **greater** than the target (with `std::count_if`).

**Input:** the target, then `n`, then `n` integers.
**Output:** two lines: `equal: E` and `greater: G`.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int target, n;
    std::cin >> target >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::cout << "equal: " << 0 << '\n';
    std::cout << "greater: " << 0 << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int target, n;
    std::cin >> target >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::cout << "equal: " << std::count(v.begin(), v.end(), target) << '\n';
    std::cout << "greater: "
              << std::count_if(v.begin(), v.end(), [target](int x) { return x > target; }) << '\n';
}
```

```hint
`std::count(v.begin(), v.end(), target)` counts equal elements. For `count_if`, the lambda must
capture `target`.
```

```stdin
3
7
3 1 3 5 9 3 0
```

```expected
equal: 3
greater: 2
```

```stdin
-1
0
```

```expected hidden
equal: 0
greater: 0
```

```stdin
5
4
5 5 6 4
```

```expected hidden
equal: 2
greater: 1
```

```checks
must std::count\s*\( :: Use std::count for the equal count.
must count_if :: Use std::count_if for the greater count.
```
:::

:::exercise Score report {easy}
Read `n` exam scores and answer three questions with `std::all_of`, `std::any_of`, and
`std::none_of`:

1. Did **all** students pass (score `>= 50`)?
2. Did **any** student get a perfect `100`?
3. Is **no** score negative?

**Input:** `n` (may be `0`), then `n` integers.
**Output:** three lines, each answered `yes` or `no`:

```
all passed: yes
any perfect: no
none negative: yes
```

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    auto yn = [](bool b) { return b ? "yes" : "no"; };
    std::cout << "all passed: " << yn(false) << '\n';
    std::cout << "any perfect: " << yn(false) << '\n';
    std::cout << "none negative: " << yn(false) << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    auto yn = [](bool b) { return b ? "yes" : "no"; };
    bool passed = std::all_of(v.begin(), v.end(), [](int s) { return s >= 50; });
    bool perfect = std::any_of(v.begin(), v.end(), [](int s) { return s == 100; });
    bool ok = std::none_of(v.begin(), v.end(), [](int s) { return s < 0; });
    std::cout << "all passed: " << yn(passed) << '\n';
    std::cout << "any perfect: " << yn(perfect) << '\n';
    std::cout << "none negative: " << yn(ok) << '\n';
}
```

```hint
Each algorithm takes `(v.begin(), v.end(), predicate)` and returns a `bool`.
```

```hint
With `n = 0`, think about what each question means for "no students at all". The algorithms
already return the logical answers.
```

```stdin
4
55 100 72 50
```

```expected
all passed: yes
any perfect: yes
none negative: yes
```

```stdin
3
49 -1 80
```

```expected
all passed: no
any perfect: no
none negative: no
```

```stdin
0
```

```expected hidden
all passed: yes
any perfect: no
none negative: yes
```

```stdin
2
100 100
```

```expected hidden
all passed: yes
any perfect: yes
none negative: yes
```

```checks
must all_of :: Use std::all_of.
must any_of :: Use std::any_of.
must none_of :: Use std::none_of.
```
:::

:::exercise Clamp and report {easy}
Read a lower limit `lo` and an upper limit `hi`, then `n` integers (`n >= 1`).

1. Print the minimum and maximum of the **original** numbers (use `std::minmax_element`, or
   `std::min_element` and `std::max_element`).
2. Print every number clamped to `[lo, hi]` with `std::clamp`.

**Input:** `lo hi`, then `n`, then `n` integers.
**Output:** first line `min M max X`, second line the clamped numbers separated by spaces.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int lo, hi, n;
    std::cin >> lo >> hi >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::cout << "min " << v[0] << " max " << v[0] << '\n';
    for (int i = 0; i < n; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int lo, hi, n;
    std::cin >> lo >> hi >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    auto [mn, mx] = std::minmax_element(v.begin(), v.end());
    std::cout << "min " << *mn << " max " << *mx << '\n';
    for (int i = 0; i < n; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << std::clamp(v[i], lo, hi);
    }
    std::cout << '\n';
}
```

```hint
`auto [mn, mx] = std::minmax_element(v.begin(), v.end());` gives two iterators; print `*mn` and `*mx`.
```

```hint
`std::clamp(value, lo, hi)` returns the clamped value.
```

```stdin
0 10
6
-5 3 12 10 0 7
```

```expected
min -5 max 12
0 3 10 10 0 7
```

```stdin
5 5
1
9
```

```expected hidden
min 9 max 9
5
```

```stdin
-3 3
4
-10 10 -3 3
```

```expected hidden
min -10 max 10
-3 3 -3 3
```

```checks
must minmax_element|min_element :: Find the minimum with std::minmax_element or std::min_element.
must clamp :: Use std::clamp.
```
:::

:::exercise First difference {medium}
Read two words and print the index (0-based) of the first position where they differ, using
`std::mismatch` (the four-iterator version). If one word is a prefix of the other, the first
difference is at the length of the shorter word. If the words are identical, print `equal`.

**Input:** two words on one line.
**Output:** the index, or `equal`, followed by a newline.

```cpp starter
#include <algorithm>
#include <iostream>
#include <string>

int main() {
    std::string a, b;
    std::cin >> a >> b;
    std::cout << "equal\n";
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <string>

int main() {
    std::string a, b;
    std::cin >> a >> b;

    auto [ia, ib] = std::mismatch(a.begin(), a.end(), b.begin(), b.end());
    if (ia == a.end() && ib == b.end()) {
        std::cout << "equal\n";
    } else {
        std::cout << (ia - a.begin()) << '\n';
    }
}
```

```hint
`std::mismatch(a.begin(), a.end(), b.begin(), b.end())` returns a pair of iterators. The words are
equal only if **both** iterators reached their `end()`.
```

```hint
The index is `ia - a.begin()`, and that also works when `a` is a prefix of `b`.
```

```stdin
planet plane
```

```expected
5
```

```stdin
code code
```

```expected
equal
```

```stdin
abc xbc
```

```expected hidden
0
```

```stdin
car cartoon
```

```expected hidden
3
```

```stdin
abc ab
```

```expected hidden
2
```

```checks
must mismatch :: Use std::mismatch.
```
:::

:::exercise Password checker {hard}
Check passwords against a policy. Each rule has a name; a password passes if it breaks none of them:

| Rule | The password must... |
| --- | --- |
| `length` | have at least 8 characters |
| `digit` | contain a digit |
| `upper` | contain an uppercase letter |
| `lower` | contain a lowercase letter |
| `symbol` | contain a character that is neither a letter nor a digit |
| `repeat` | **not** contain the same character 3 or more times in a row (`aaa`) |
| `user` | **not** contain the username, ignoring upper/lower case |

Use the algorithms from this lesson (`std::any_of`, `std::none_of`, `std::all_of`, `std::equal`, ...)
with lambdas rather than hand-written flag loops. For the character tests use `<cctype>`
(`std::isdigit`, `std::isupper`, `std::islower`, `std::isalnum`), passing the `char` converted to
`unsigned char`.

**Input:** the username on the first line, then one password per line (no spaces) until the input
ends. The username has at least one character.
**Output:** per password, `ok`, or `fail:` followed by the broken rules in the table's order,
separated by `, ` (for example `fail: digit, symbol`).

```cpp starter
#include <algorithm>
#include <cctype>
#include <iostream>
#include <string>

int main() {
    std::string user, pw;
    std::cin >> user;
    while (std::cin >> pw) {
        std::cout << "ok\n";
    }
}
```

```cpp solution
#include <algorithm>
#include <cctype>
#include <cstddef>
#include <iostream>
#include <string>
#include <vector>

bool containsIgnoreCase(const std::string& text, const std::string& word) {
    auto same = [](char a, char b) {
        return std::tolower(static_cast<unsigned char>(a)) == std::tolower(static_cast<unsigned char>(b));
    };
    for (std::size_t i = 0; i + word.size() <= text.size(); ++i) {
        if (std::equal(word.begin(), word.end(), text.begin() + static_cast<std::ptrdiff_t>(i), same)) return true;
    }
    return false;
}

bool hasTriple(const std::string& s) {
    for (std::size_t i = 0; i + 2 < s.size(); ++i)
        if (s[i] == s[i + 1] && s[i + 1] == s[i + 2]) return true;
    return false;
}

int main() {
    std::string user, pw;
    std::cin >> user;
    auto has = [](const std::string& s, int (*test)(int)) {
        return std::any_of(s.begin(), s.end(), [test](char c) { return test(static_cast<unsigned char>(c)) != 0; });
    };
    while (std::cin >> pw) {
        std::vector<std::string> broken;
        if (pw.size() < 8) broken.push_back("length");
        if (!has(pw, [](int c) { return std::isdigit(c); })) broken.push_back("digit");
        if (!has(pw, [](int c) { return std::isupper(c); })) broken.push_back("upper");
        if (!has(pw, [](int c) { return std::islower(c); })) broken.push_back("lower");
        if (std::all_of(pw.begin(), pw.end(), [](char c) { return std::isalnum(static_cast<unsigned char>(c)) != 0; }))
            broken.push_back("symbol");
        if (hasTriple(pw)) broken.push_back("repeat");
        if (containsIgnoreCase(pw, user)) broken.push_back("user");

        if (broken.empty()) {
            std::cout << "ok\n";
            continue;
        }
        std::cout << "fail: ";
        for (std::size_t i = 0; i < broken.size(); ++i) std::cout << (i ? ", " : "") << broken[i];
        std::cout << '\n';
    }
}
```

```hint
`std::any_of(pw.begin(), pw.end(), [](char c) { return std::isdigit(static_cast<unsigned char>(c)); })`
answers "contains a digit". "Contains a symbol" is "not all characters are alphanumeric".
```

```hint
Collect the names of the broken rules in a `std::vector<std::string>` as you test them in order, then
print `ok` if it's empty, or join it with `, `.
```

```hint
For the case-insensitive search, try every start position `i` where the username still fits and
compare with `std::equal(user.begin(), user.end(), pw.begin() + i, pred)`, where `pred` compares the
two characters after `std::tolower`.
```

```stdin
ada
Secur3!pass
password
ADAlovelace1!
```

```expected
ok
fail: digit, upper, symbol
fail: user
```

```stdin
bob
aaa
Abc!1234
xX9#bbbx
```

```expected
fail: length, digit, upper, symbol, repeat
ok
fail: repeat
```

```stdin
kim
Kim!12345
1!Aa1!Aa
!!!!!!!!
abcdefgH9
aa1!AAbb
MyKIm#2024
```

```expected hidden
fail: user
ok
fail: digit, upper, lower, repeat
fail: symbol
ok
fail: user
```

```stdin
x
ABCDEFG!1
abcdefg!1
Q1!q1!Q1!
XyZ!1abc
```

```expected hidden
fail: lower
fail: upper
ok
fail: user
```

```checks
must any_of|all_of|none_of :: Use std::any_of / std::all_of / std::none_of with lambdas.
must std::is(digit|upper|lower|alnum|alpha) :: Classify characters with <cctype>.
```
:::

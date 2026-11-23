---
title: "Lambdas, Algorithms & Ranges: Challenges"
summary: Hard, real-world style problems solved with lambdas and the standard algorithms: multi-key sorting, interval merging, group-by reports, a lambda-driven calculator and a ranges pipeline.
---

These problems are meant to be **hard**. Each one is a small real program: a report, a calculator, a
data pipeline. The goal is to solve them the way an experienced C++ programmer would, by combining
standard algorithms with small lambdas instead of writing every loop by hand. You get a precise
specification, an example and a bare skeleton. Hidden tests check ties, empty input and other corners,
so read each specification carefully.

Try each problem on your own before opening the hints. When you're stuck, name the step you need
("sort by two keys", "keep the elements that...", "add up...") and look for the algorithm that does
exactly that.

## Warm-up: predict the output

:::quiz
What does this print?

```cpp
int x = 1;
auto a = [x]() mutable { return ++x; };
auto b = [&x] { return x * 10; };
auto c = a;
a();
a();
x = 5;
std::cout << a() << ' ' << c() << ' ' << b();
```

- [ ] `6 6 50`
- [ ] `4 4 50`
- [x] `4 2 50`
- [ ] `4 2 10`

`a` owns a **copy** of `x` (value `1`), and `mutable` lets each call increment it: `2`, `3`, then `4`.
`c` is a copy of the closure made **before** those calls, with its own counter still at `1`, so `c()`
returns `2`. `b` refers to the real `x`, which is `5` when it runs: `50`.
:::

:::quiz
What does this print?

```cpp
std::vector<int> v{1, 2, 3, 4, 5, 6};
int calls = 0;
auto r = v | std::views::filter([&calls](int y) { ++calls; return y % 2 == 0; })
           | std::views::take(2);
for (int y : r) std::cout << y;
std::cout << ' ' << calls;
```

- [ ] `24 4`
- [x] `24 6`
- [ ] `246 6`
- [ ] `24 2`

The view is lazy, but not as lazy as you might think. Finding `2` tests `1, 2`; moving to `4` tests
`3, 4`. Then the range-for loop increments the iterator **once more** before it compares with the end:
that step makes the filter look for the next even number, testing `5, 6`. Only then does `take` notice
it has produced 2 elements. That's 6 calls, and it's why predicates in views should have no side effects.
:::

## Problems

:::exercise Sales report {hard}
Turn raw sales records into a per-region report: a **group-by** followed by **aggregates** and a
multi-key sort.

Each record is `region product qty price`, where `price` is in **cents** (an integer, so no rounding
problems). A record's revenue is `qty * price`. For every region, compute:

- its total revenue,
- its number of distinct products,
- its **best product**: the one with the highest total revenue in that region (ties: alphabetically
  first).

**Output:** one line per region, `REGION: $D.CC from N products, best PRODUCT`, where `D.CC` is the
revenue in dollars with exactly two digits of cents (`1234` cents is `$12.34`, `5` cents is `$0.05`).
Regions are ordered by revenue, **highest first**; ties alphabetically. Finish with a line
`total: $D.CC`. With no records, print only `total: $0.00`.

Use a `std::map` to group, `std::accumulate` to add up, `std::max_element` with a lambda for the best
product, and `std::sort` with a lambda for the region order.

**Input:** `n`, then `n` records. Revenues fit in a `long long`.

Example: the records `north tea 3 250`, `south tea 1 250`, `north cake 1 900` and
`south pie 10 100` give north `750 + 900 = 1650` cents and south `250 + 1000 = 1250` cents:

```
north: $16.50 from 2 products, best cake
south: $12.50 from 2 products, best pie
total: $29.00
```

```cpp starter
#include <algorithm>
#include <iostream>
#include <map>
#include <numeric>
#include <string>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    for (int i = 0; i < n; ++i) {
        std::string region, product;
        long long qty, price;
        std::cin >> region >> product >> qty >> price;
    }
    std::cout << "total: $0.00\n";
}
```

```cpp solution
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <map>
#include <numeric>
#include <sstream>
#include <string>
#include <vector>

std::string dollars(long long cents) {
    std::ostringstream out;
    out << '$' << cents / 100 << '.' << std::setw(2) << std::setfill('0') << cents % 100;
    return out.str();
}

struct RegionReport {
    std::string name;
    long long revenue;
    std::size_t products;
    std::string best;
};

int main() {
    int n;
    std::cin >> n;
    std::map<std::string, std::map<std::string, long long>> sales;   // region -> product -> revenue
    for (int i = 0; i < n; ++i) {
        std::string region, product;
        long long qty, price;
        std::cin >> region >> product >> qty >> price;
        sales[region][product] += qty * price;
    }

    std::vector<RegionReport> reports;
    for (const auto& [region, products] : sales) {
        long long revenue = std::accumulate(products.begin(), products.end(), 0LL,
                                            [](long long acc, const auto& p) { return acc + p.second; });
        // max_element keeps the FIRST maximum, and the map is alphabetical: ties go to the first name
        auto best = std::max_element(products.begin(), products.end(),
                                     [](const auto& a, const auto& b) { return a.second < b.second; });
        reports.push_back({region, revenue, products.size(), best->first});
    }

    std::sort(reports.begin(), reports.end(), [](const RegionReport& a, const RegionReport& b) {
        if (a.revenue != b.revenue) return a.revenue > b.revenue;
        return a.name < b.name;
    });

    for (const auto& r : reports)
        std::cout << r.name << ": " << dollars(r.revenue) << " from " << r.products << " products, best "
                  << r.best << '\n';
    long long total = std::accumulate(reports.begin(), reports.end(), 0LL,
                                      [](long long acc, const RegionReport& r) { return acc + r.revenue; });
    std::cout << "total: " << dollars(total) << '\n';
}
```

```hint
A nested `std::map<std::string, std::map<std::string, long long>>` (region, then product, then revenue)
groups everything in one statement: `sales[region][product] += qty * price;`.
```

```hint
`std::max_element` returns the **first** of several maximal elements. Since the inner map iterates
products alphabetically, that is exactly the tie rule. Its comparator is still a "less than" on the
revenue.
```

```hint
For the money format, print `cents / 100`, a dot, then `cents % 100` with `std::setw(2)` and
`std::setfill('0')`.
```

```stdin
4
north tea 3 250
south tea 1 250
north cake 1 900
south pie 10 100
```

```expected
north: $16.50 from 2 products, best cake
south: $12.50 from 2 products, best pie
total: $29.00
```

```stdin
0
```

```expected
total: $0.00
```

```stdin
5
west b 1 500
west a 2 250
east z 1 1000
west c 1 5
east y 2 0
```

```expected hidden
west: $10.05 from 3 products, best a
east: $10.00 from 2 products, best z
total: $20.05
```

```stdin
3
r x 1000000 999999
r x 1 1
q y 1 7
```

```expected hidden
r: $9999990000.01 from 1 products, best x
q: $0.07 from 1 products, best y
total: $9999990000.08
```

```checks
must accumulate|reduce :: Add up with std::accumulate.
must max_element :: Find the best product with std::max_element.
must sort\s*\( :: Sort the regions with std::sort.
```
:::

:::exercise Merge intervals {hard}
A calendar contains busy periods `[a, b]` (with `a <= b`), in no particular order and possibly
overlapping. Merge them into the smallest set of disjoint periods: two periods are merged when they
**overlap or touch** (`[1, 3]` and `[3, 5]` become `[1, 5]`; `[1, 3]` and `[4, 5]` stay separate).

Then report the total covered length (the sum of `b - a` over the merged periods) and the largest
free gap between two consecutive merged periods (`next.a - previous.b`).

The standard approach: **sort** by start (a lambda comparator, or the natural order of
`std::pair`), then walk once, either extending the last merged period or starting a new one. For the
statistics, `std::accumulate` (covered length) and `std::inner_product` over neighboring periods
(largest gap) work well.

**Input:** `n`, then `n` lines `a b` (integers, possibly negative).
**Output:** the merged periods in order on one line, as `[a, b]` separated by single spaces (just an
empty line if `n` is 0); then `covered: L`; then `largest gap: G`, or `largest gap: none` when there
are fewer than two merged periods.

Example: `[8, 10] [1, 3] [2, 6] [15, 18] [18, 20]` merges into `[1, 6] [8, 10] [15, 20]`, covering
`5 + 2 + 5 = 12`, with gaps `2` and `5`: `largest gap: 5`.

```cpp starter
#include <algorithm>
#include <iostream>
#include <numeric>
#include <utility>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<std::pair<long long, long long>> v(n);
    for (auto& [a, b] : v) std::cin >> a >> b;
    std::cout << "\ncovered: 0\nlargest gap: none\n";
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <numeric>
#include <utility>
#include <vector>

using Period = std::pair<long long, long long>;

int main() {
    int n;
    std::cin >> n;
    std::vector<Period> v(n);
    for (auto& [a, b] : v) std::cin >> a >> b;

    std::sort(v.begin(), v.end(), [](const Period& x, const Period& y) { return x.first < y.first; });

    std::vector<Period> merged;
    for (const auto& p : v) {
        if (!merged.empty() && p.first <= merged.back().second) {
            merged.back().second = std::max(merged.back().second, p.second);   // extend
        } else {
            merged.push_back(p);                                               // start a new one
        }
    }

    for (std::size_t i = 0; i < merged.size(); ++i)
        std::cout << (i ? " " : "") << '[' << merged[i].first << ", " << merged[i].second << ']';
    std::cout << '\n';

    long long covered = std::accumulate(merged.begin(), merged.end(), 0LL,
                                        [](long long acc, const Period& p) { return acc + (p.second - p.first); });
    std::cout << "covered: " << covered << '\n';

    if (merged.size() < 2) {
        std::cout << "largest gap: none\n";
    } else {
        // pair each period with the next one: gap = next.first - this.second, keep the maximum
        long long gap = std::inner_product(
            merged.begin(), merged.end() - 1, merged.begin() + 1, merged[1].first - merged[0].second,
            [](long long a, long long b) { return std::max(a, b); },
            [](const Period& prev, const Period& next) { return next.first - prev.second; });
        std::cout << "largest gap: " << gap << '\n';
    }
}
```

```hint
After sorting by start, a period overlaps or touches the last merged one exactly when
`p.first <= merged.back().second`. Then extend the end with `std::max` (the new period may lie
completely inside the old one).
```

```hint
Sort by `first` only, or by the whole pair: both give a valid merge order. Don't forget the case where
a later period starts inside but **ends before** the current merged one: `[1, 10]` then `[2, 3]`.
```

```hint
`std::inner_product(first1, last1, first2, init, combine, pairwise)` can walk neighbors: pass the
periods `0..n-2` and `1..n-1`, compute `next.first - prev.second` pairwise, and combine with `max`.
A simple loop is fine too.
```

```stdin
5
8 10
1 3
2 6
15 18
18 20
```

```expected
[1, 6] [8, 10] [15, 20]
covered: 12
largest gap: 5
```

```stdin
0
```

```expected

covered: 0
largest gap: none
```

```stdin
3
1 10
2 3
4 12
```

```expected hidden
[1, 12]
covered: 11
largest gap: none
```

```stdin
4
-5 -5
-3 -1
-4 -4
0 2
```

```expected hidden
[-5, -5] [-4, -4] [-3, -1] [0, 2]
covered: 4
largest gap: 1
```

```stdin
1
7 7
```

```expected hidden
[7, 7]
covered: 0
largest gap: none
```

```stdin
3
5 6
1 2
1 2
```

```expected hidden
[1, 2] [5, 6]
covered: 2
largest gap: 3
```

```checks
must sort\s*\( :: Sort the periods first.
must \[[^\]]*\]\s*\( :: Use lambdas with the algorithms.
```
:::

:::exercise Version sort {hard}
Sorting version numbers as strings gets it wrong: `"1.10"` comes before `"1.9"` alphabetically. Sort
them properly. A version is a list of numeric components separated by dots (`2.10.3`), compared
component by component **as numbers**:

- leading zeros don't matter: `1.01` equals `1.1`,
- missing components count as `0`: `1.2` equals `1.2.0` and `1.2.0.0`,
- components can be large (up to 18 digits), so use `long long`.

Versions that are **equal** must keep their input order, so use `std::stable_sort` with a lambda
comparator (parse each version into a `std::vector<long long>` first, so the comparator doesn't
re-parse strings O(n log n) times).

**Input:** `n`, then `n` versions (each a word of digits and dots, with no empty components).
**Output:** the versions in ascending order, exactly as written in the input, one per line; then a
line `distinct: K` with the number of different versions (use `std::unique` with the same notion of
equality, or count them while printing).

Example: `1.10 1.9 1.2.0 1.02 0.9.9` sorts to `0.9.9`, `1.2.0`, `1.02`, `1.9`, `1.10` (the two equal
versions `1.2.0` and `1.02` stay in input order), with `distinct: 4`.

```cpp starter
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<std::string> versions(n);
    for (auto& v : versions) std::cin >> v;
    std::sort(versions.begin(), versions.end());
    for (const auto& v : versions) std::cout << v << '\n';
    std::cout << "distinct: " << n << '\n';
}
```

```cpp solution
#include <algorithm>
#include <cstddef>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

std::vector<long long> parse(const std::string& s) {
    std::vector<long long> parts{0};
    for (char c : s) {
        if (c == '.') parts.push_back(0);
        else parts.back() = parts.back() * 10 + (c - '0');
    }
    while (parts.size() > 1 && parts.back() == 0) parts.pop_back();   // 1.2.0.0 is 1.2
    return parts;
}

int main() {
    int n;
    std::cin >> n;
    std::vector<std::pair<std::vector<long long>, std::string>> versions(n);
    for (auto& [key, text] : versions) {
        std::cin >> text;
        key = parse(text);
    }

    std::stable_sort(versions.begin(), versions.end(),
                     [](const auto& a, const auto& b) { return a.first < b.first; });

    for (const auto& [key, text] : versions) std::cout << text << '\n';

    auto last = std::unique(versions.begin(), versions.end(),
                            [](const auto& a, const auto& b) { return a.first == b.first; });
    std::cout << "distinct: " << (last - versions.begin()) << '\n';
}
```

```hint
Normalize when you parse: after splitting into numbers, drop **trailing zero** components. Then
`1.2`, `1.2.0` and `1.02.0.0` all become `{1, 2}`, and two versions are equal exactly when their vectors
are equal.
```

```hint
`std::vector` already compares lexicographically with `<`: `{1, 2} < {1, 2, 1}` and `{1, 9} < {1, 10}`.
Sort pairs of (parsed vector, original text) and compare only the `.first`.
```

```hint
Don't parse with `std::stoi`: a component may not fit in an `int`. Accumulate digits into a
`long long` yourself (`value * 10 + (c - '0')`), or use `std::stoll`.
```

```stdin
5
1.10
1.9
1.2.0
1.02
0.9.9
```

```expected
0.9.9
1.2.0
1.02
1.9
1.10
distinct: 4
```

```stdin
1
0
```

```expected
0
distinct: 1
```

```stdin
6
2.0.0
2
1.999999999999999999
2.0.1
0.0
00.000.0
```

```expected hidden
0.0
00.000.0
1.999999999999999999
2.0.0
2
2.0.1
distinct: 4
```

```stdin
5
3.4.5
3.4.5.0.0
3.4.05
3.4.4.99
3.40
```

```expected hidden
3.4.4.99
3.4.5
3.4.5.0.0
3.4.05
3.40
distinct: 3
```

```checks
must stable_sort :: Keep equal versions in input order with std::stable_sort.
must \[[^\]]*\]\s*\( :: Compare with a lambda.
```
:::

:::exercise RPN calculator {hard}
In **Reverse Polish Notation** the operator comes after its operands: `3 4 + 2 *` means `(3 + 4) * 2`.
It is evaluated with a stack: a number is pushed; an operator pops its operands, computes, and pushes
the result.

Write an evaluator whose operators live in **tables of lambdas**, so adding an operator is one line:

- a `std::map<std::string, std::function<long long(long long, long long)>>` for the binary operators
  `+ - * / % max min`,
- a `std::map<std::string, std::function<long long(long long)>>` for the unary operators `neg abs`.

For a binary operator, the **second** popped value is the left operand: `7 2 -` is `5`. `/` and `%`
work like C++ (truncating toward zero).

**Input:** one expression per line (tokens separated by spaces) until the input ends.
**Output:** per line, the single value left on the stack, or the **first** error encountered:

| Error | When |
| --- | --- |
| `error: unknown token T` | `T` is neither a number nor an operator |
| `error: stack underflow` | an operator needs more values than the stack holds |
| `error: division by zero` | `/` or `%` with a right operand of `0` |
| `error: K values left` | the expression ends with `K != 1` values on the stack (also for an empty line, `K = 0`) |

Numbers are integers, possibly negative (`-3` is a number; a lone `-` is the operator). All results
fit in a `long long`.

```cpp starter
#include <functional>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::cout << "error: 0 values left\n";
    }
}
```

```cpp solution
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

bool isNumber(const std::string& t) {
    std::size_t start = (t.size() > 1 && t[0] == '-') ? 1 : 0;
    return start < t.size() &&
           std::all_of(t.begin() + static_cast<std::ptrdiff_t>(start), t.end(),
                       [](unsigned char c) { return std::isdigit(c) != 0; });
}

std::string evaluate(const std::string& line) {
    using Binary = std::function<long long(long long, long long)>;
    using Unary = std::function<long long(long long)>;
    static const std::map<std::string, Binary> binary{
        {"+", [](long long a, long long b) { return a + b; }},
        {"-", [](long long a, long long b) { return a - b; }},
        {"*", [](long long a, long long b) { return a * b; }},
        {"/", [](long long a, long long b) { return a / b; }},
        {"%", [](long long a, long long b) { return a % b; }},
        {"max", [](long long a, long long b) { return std::max(a, b); }},
        {"min", [](long long a, long long b) { return std::min(a, b); }},
    };
    static const std::map<std::string, Unary> unary{
        {"neg", [](long long a) { return -a; }},
        {"abs", [](long long a) { return a < 0 ? -a : a; }},
    };

    std::vector<long long> stack;
    std::istringstream in(line);
    std::string tok;
    while (in >> tok) {
        if (isNumber(tok)) {
            stack.push_back(std::stoll(tok));
        } else if (auto b = binary.find(tok); b != binary.end()) {
            if (stack.size() < 2) return "error: stack underflow";
            long long right = stack.back();
            stack.pop_back();
            long long left = stack.back();
            stack.pop_back();
            if ((tok == "/" || tok == "%") && right == 0) return "error: division by zero";
            stack.push_back(b->second(left, right));
        } else if (auto u = unary.find(tok); u != unary.end()) {
            if (stack.empty()) return "error: stack underflow";
            stack.back() = u->second(stack.back());
        } else {
            return "error: unknown token " + tok;
        }
    }
    if (stack.size() != 1) return "error: " + std::to_string(stack.size()) + " values left";
    return std::to_string(stack.back());
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) std::cout << evaluate(line) << '\n';
}
```

```hint
Read each line into a `std::istringstream` and pull tokens with `>>`. Decide what a token is in this
order: a number (optional leading `-` followed by digits, at least one digit), a binary operator, a
unary operator, otherwise unknown.
```

```hint
Look operators up with `find`, not `[]`: `binary[tok]` on an unknown token would insert an **empty**
`std::function`, and calling it throws `std::bad_function_call`.
```

```hint
Pop the right operand first: `right = top, pop, left = top, pop`, then push `op(left, right)`. Stop at
the first error: a helper function that **returns** the result line keeps that simple.
```

```stdin
3 4 + 2 *
7 2 -
5 1 2 + 4 * + 3 -
```

```expected
14
5
14
```

```stdin
1 +
4 0 /
2 3
x 1 +
```

```expected
error: stack underflow
error: division by zero
error: 2 values left
error: unknown token x
```

```stdin
-7 2 /

-7 2 %
-3 neg 4 max 10 min
-5 abs -
5 abs neg abs neg
1 2 3 + + 6 -
2 3 4
9 0 % 1 +
--3 1 +
```

```expected hidden
-3
error: 0 values left
-1
4
error: stack underflow
-5
0
error: 3 values left
error: division by zero
error: unknown token --3
```

```checks
must std::function :: Store the operators as std::function objects.
must std::map :: Keep the operator tables in std::maps.
must \.find\s*\( :: Look operators up with find.
```
:::

:::exercise Slow request finder {hard}
A web server's log is sorted by time. Each record is `time user status ms`: when the request arrived,
who sent it, its HTTP status code, and how many milliseconds it took. Operators ask questions like
"between time `FROM` and `TO`, how many server errors were there, and which successful requests were
the slowest?"

Answer each query with a **ranges pipeline** over the log, without copying the whole log:

1. the time window: `std::views::drop_while` (skip records before `FROM`) piped into
   `std::views::take_while` (stop after `TO`); the log is sorted, so this is exactly the records with
   `FROM <= time <= TO`,
2. server errors: `std::ranges::count_if` over the window for status `>= 500`,
3. successful requests (status `200` to `299`): `std::views::filter` over the window, copied into a small
   vector and sorted by `ms` **descending**, ties by **earlier time** first (and for equal times, input
   order: use a stable sort).

**Input:** `n`, then `n` records (times non-decreasing); then `q`, then `q` queries `FROM TO K`
(`FROM <= TO`, `K >= 1`).
**Output:** per query: `[FROM, TO] E errors:` followed by ` user@time=ms` for each of the `K` slowest
successful requests in that order, or ` none` if the window has no successful request.

Example: for the log `1 ann 200 30`, `2 bob 500 5`, `4 cy 200 90`, `4 ann 404 70`, `7 bob 201 90`, the
query `1 7 2` prints `[1, 7] 1 errors: cy@4=90 bob@7=90` (a `404` is neither a success nor a server
error).

```cpp starter
#include <algorithm>
#include <iostream>
#include <ranges>
#include <string>
#include <vector>

struct Request {
    long long time;
    std::string user;
    int status;
    int ms;
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Request> log(n);
    for (auto& r : log) std::cin >> r.time >> r.user >> r.status >> r.ms;
    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        long long from, to;
        int k;
        std::cin >> from >> to >> k;
        std::cout << '[' << from << ", " << to << "] 0 errors: none\n";
    }
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <iterator>
#include <ranges>
#include <string>
#include <vector>

struct Request {
    long long time;
    std::string user;
    int status;
    int ms;
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Request> log(n);
    for (auto& r : log) std::cin >> r.time >> r.user >> r.status >> r.ms;

    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        long long from, to;
        int k;
        std::cin >> from >> to >> k;

        auto window = log | std::views::drop_while([from](const Request& r) { return r.time < from; })
                          | std::views::take_while([to](const Request& r) { return r.time <= to; });

        auto errors = std::ranges::count_if(window, [](int s) { return s >= 500; }, &Request::status);

        std::vector<Request> ok;
        std::ranges::copy(window | std::views::filter([](const Request& r) {
                              return r.status >= 200 && r.status <= 299;
                          }),
                          std::back_inserter(ok));
        std::ranges::stable_sort(ok, [](const Request& a, const Request& b) {
            if (a.ms != b.ms) return a.ms > b.ms;
            return a.time < b.time;
        });

        std::cout << '[' << from << ", " << to << "] " << errors << " errors:";
        if (ok.empty()) std::cout << " none";
        for (const Request& r : ok | std::views::take(k)) std::cout << ' ' << r.user << '@' << r.time << '=' << r.ms;
        std::cout << '\n';
    }
}
```

```hint
Capture the query bounds in the lambdas: `std::views::drop_while([from](const Request& r) { return r.time < from; })`.
The window is a view over `log`; nothing is copied.
```

```hint
`std::ranges::count_if(window, [](int s) { return s >= 500; }, &Request::status)` uses a projection, so
the predicate sees only the status.
```

```hint
A `take_while` view isn't sized, so it can't be sorted in place (and you must not reorder the log).
Copy the filtered requests with `std::ranges::copy(..., std::back_inserter(ok))`, then sort `ok`.
```

```stdin
5
1 ann 200 30
2 bob 500 5
4 cy 200 90
4 ann 404 70
7 bob 201 90
3
1 7 2
2 3 5
5 100 1
```

```expected
[1, 7] 1 errors: cy@4=90 bob@7=90
[2, 3] 1 errors: none
[5, 100] 0 errors: bob@7=90
```

```stdin
0
1
0 10 3
```

```expected
[0, 10] 0 errors: none
```

```stdin
6
-5 a 299 10
-5 b 300 99
0 c 200 10
0 d 503 1
0 e 200 10
9 f 599 1000
5
-5 -5 1
-10 0 10
0 0 2
1 8 1
9 9 9
```

```expected hidden
[-5, -5] 0 errors: a@-5=10
[-10, 0] 1 errors: a@-5=10 c@0=10 e@0=10
[0, 0] 1 errors: c@0=10 e@0=10
[1, 8] 0 errors: none
[9, 9] 1 errors: none
```

```stdin
3
10 x 200 1
20 y 200 2
30 z 200 3
3
11 19 1
10 30 2
31 40 1
```

```expected hidden
[11, 19] 0 errors: none
[10, 30] 0 errors: z@30=3 y@20=2
[31, 40] 0 errors: none
```

```checks
must views::drop_while :: Start the window with std::views::drop_while.
must views::take_while :: End the window with std::views::take_while.
must views::filter :: Select the successful requests with std::views::filter.
must ranges::count_if :: Count the server errors with std::ranges::count_if.
```
:::

---
title: Sorting & Searching
summary: std::sort with default and custom comparators, sorting by several keys, stable_sort, partial_sort, nth_element, find and find_if, and binary search on sorted data.
---

## How the algorithms work

The algorithms in `<algorithm>` don't take containers. They take a **range** described by two
iterators: `first` (the first element) and `last` (one **past** the last element). That's why you
keep writing `v.begin(), v.end()`. It also means they work with any container that has the right
kind of iterators, and on **part** of a container:

```cpp
std::sort(v.begin(), v.end());           // the whole vector
std::sort(v.begin(), v.begin() + 3);     // only the first three elements
std::sort(std::begin(arr), std::end(arr)); // a built-in array
```

(The C++20 `std::ranges` versions accept the container directly: `std::ranges::sort(v)`. They're
covered in the last lesson of this module. Everything you learn here carries over.)

## `std::sort`

`std::sort(first, last)` sorts ascending using `<`. It runs in O(n log n), and needs
**random-access** iterators (vector, array, deque, string; not `std::list`, which has its own
`list.sort()`).

```cpp run
#include <algorithm>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <string>
#include <vector>

void print(const std::vector<int>& v) {
    for (int x : v) std::cout << x << ' ';
    std::cout << '\n';
}

int main() {
    std::vector<int> v{5, 2, 9, 1, 5, 6};

    std::sort(v.begin(), v.end());                                  // ascending
    print(v);

    std::sort(v.begin(), v.end(), std::greater<>{});                // descending, ready-made functor
    print(v);

    std::sort(v.begin(), v.end(), [](int a, int b) { return a < b; });  // ascending, via a lambda
    print(v);

    std::sort(v.begin(), v.end(), [](int a, int b) {                // by distance from 5, ascending
        return std::abs(a - 5) < std::abs(b - 5);
    });
    std::cout << v.front() << " is closest to 5\n";

    std::string s = "sorting";
    std::sort(s.begin(), s.end());                                  // strings are ranges of chars
    std::cout << s << '\n';
}
```

```output
1 2 5 5 6 9
9 6 5 5 2 1
1 2 5 5 6 9
5 is closest to 5
ginorst
```

### The comparator contract

A comparator `comp(a, b)` answers **"must `a` come before `b`?"** It must behave like `<`:

- `comp(a, a)` must be `false`. So use `<` or `>`, **never `<=` or `>=`**.
- If `comp(a, b)` is true, `comp(b, a)` must be false.
- It must be consistent: if `a` before `b` and `b` before `c`, then `a` before `c`.

This is called a **strict weak ordering**. Breaking it (most commonly with `<=`) is **undefined
behavior**: `std::sort` may produce garbage or even read outside the vector and crash.

```cpp
std::sort(v.begin(), v.end(), [](int a, int b) { return a <= b; });   // WRONG: undefined behavior
```

## Sorting structs by multiple keys

To sort by "score descending, then name ascending for ties", compare the first key, and only if
it's equal, fall through to the next:

```cpp run
#include <algorithm>
#include <iostream>
#include <string>
#include <tuple>
#include <vector>

struct Player {
    std::string name;
    int score;
};

int main() {
    std::vector<Player> ps{{"Cleo", 90}, {"Abe", 75}, {"Bea", 90}, {"Dan", 75}, {"Eve", 100}};

    // Version 1: explicit if
    std::sort(ps.begin(), ps.end(), [](const Player& a, const Player& b) {
        if (a.score != b.score) return a.score > b.score;   // higher score first
        return a.name < b.name;                             // tie: alphabetical
    });
    for (const auto& p : ps) std::cout << p.name << ' ' << p.score << '\n';

    // Version 2: std::tie builds tuples of references, which compare key by key.
    // To make score descending, swap a and b for that key.
    std::sort(ps.begin(), ps.end(), [](const Player& a, const Player& b) {
        return std::tie(b.score, a.name) < std::tie(a.score, b.name);
    });
    std::cout << "same order? " << (ps[0].name == "Eve" && ps[1].name == "Bea") << '\n';
}
```

```output
Eve 100
Bea 90
Cleo 90
Abe 75
Dan 75
same order? 1
```

Always take struct arguments by **`const&`** in comparators. `std::sort` calls the comparator
O(n log n) times; copying two strings on every call adds up.

If your struct has a natural ordering, you can instead give it `operator<` (or a defaulted
`operator<=>`), and plain `std::sort(v.begin(), v.end())` will use it.

## `std::stable_sort`

`std::sort` is **not stable**: elements that compare equal may end up in any order.
`std::stable_sort` guarantees that equal elements keep their **original relative order**. That
matters when you sort by one key after another, or when the input order means something:

```cpp run
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Task {
    std::string name;
    int priority;
};

int main() {
    // Already in the order they were submitted
    std::vector<Task> tasks{{"email", 2}, {"deploy", 1}, {"lunch", 3}, {"review", 1}, {"backup", 2}};

    std::stable_sort(tasks.begin(), tasks.end(),
                     [](const Task& a, const Task& b) { return a.priority < b.priority; });

    // Within each priority, submission order is preserved: deploy before review, email before backup
    for (const auto& t : tasks) std::cout << t.priority << ' ' << t.name << '\n';
}
```

```output
1 deploy
1 review
2 email
2 backup
3 lunch
```

## Partial sorting: `partial_sort` and `nth_element`

When you only need part of the answer, don't pay for a full sort.

- `std::partial_sort(first, middle, last)` puts the **smallest `middle - first` elements**, sorted,
  at the front. The rest are left in unspecified order. Perfect for "top 3".
- `std::nth_element(first, nth, last)` puts the element that **would be** at position `nth` in a
  sorted range there; everything before it is `<=` and everything after is `>=` (in no particular
  order). It runs in average O(n). Perfect for medians and "k-th smallest".

```cpp run
#include <algorithm>
#include <functional>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> scores{42, 97, 13, 88, 75, 61, 99, 30};

    std::vector<int> top = scores;
    std::partial_sort(top.begin(), top.begin() + 3, top.end(), std::greater<>{});
    std::cout << "top 3: " << top[0] << ' ' << top[1] << ' ' << top[2] << '\n';

    std::vector<int> m = scores;
    auto mid = m.begin() + m.size() / 2;          // index 4 of 8
    std::nth_element(m.begin(), mid, m.end());
    std::cout << "element at sorted index 4: " << *mid << '\n';

    std::nth_element(m.begin(), m.begin() + 1, m.end());
    std::cout << "2nd smallest: " << m[1] << '\n';
}
```

```output
top 3: 99 97 88
element at sorted index 4: 75
2nd smallest: 30
```

## Linear search: `find`, `find_if`, `find_if_not`

These scan from the start and return an **iterator** to the first match, or `last` if there is
none. **Always compare with `end()` before dereferencing.**

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{4, 8, 15, 16, 23, 42};

    auto it = std::find(v.begin(), v.end(), 16);
    if (it != v.end()) {
        std::cout << "found 16 at index " << std::distance(v.begin(), it) << '\n';  // or it - v.begin()
    }

    if (std::find(v.begin(), v.end(), 7) == v.end()) std::cout << "7 not found\n";

    auto odd = std::find_if(v.begin(), v.end(), [](int x) { return x % 2 != 0; });
    std::cout << "first odd: " << *odd << '\n';

    auto not_small = std::find_if_not(v.begin(), v.end(), [](int x) { return x < 10; });
    std::cout << "first not < 10: " << *not_small << '\n';
}
```

```output
found 16 at index 3
7 not found
first odd: 15
first not < 10: 15
```

> **Pitfall:** `*std::find(...)` without checking is undefined behavior when nothing was found,
> because you'd be dereferencing `end()`.

Containers like `std::set` and `std::map` have their own `.find()` member, which is much faster
(O(log n)) than the generic `std::find` (O(n)). Use the member when it exists.

## Binary search on sorted data

If the range is **sorted**, you can search in O(log n) by repeatedly halving it. These all
**require** sorted input (sorted with the same comparator you pass them). On unsorted data they
give wrong answers.

| Function | Returns |
| --- | --- |
| `std::binary_search(f, l, x)` | `bool`: is `x` present? |
| `std::lower_bound(f, l, x)` | iterator to the first element **`>= x`** |
| `std::upper_bound(f, l, x)` | iterator to the first element **`> x`** |
| `std::equal_range(f, l, x)` | a pair `{lower_bound, upper_bound}` |

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 3, 3, 3, 7, 9};
    //  index:         0  1  2  3  4  5

    std::cout << std::boolalpha << std::binary_search(v.begin(), v.end(), 3) << ' '
              << std::binary_search(v.begin(), v.end(), 4) << '\n';

    auto lo = std::lower_bound(v.begin(), v.end(), 3);   // first >= 3
    auto hi = std::upper_bound(v.begin(), v.end(), 3);   // first > 3
    std::cout << "3s occupy [" << (lo - v.begin()) << ", " << (hi - v.begin()) << ")\n";
    std::cout << "count of 3: " << (hi - lo) << '\n';

    // lower_bound of a missing value = where it would be inserted to keep v sorted
    auto pos = std::lower_bound(v.begin(), v.end(), 5);
    std::cout << "5 would go at index " << (pos - v.begin()) << '\n';
    v.insert(pos, 5);

    auto [first, last] = std::equal_range(v.begin(), v.end(), 9);
    std::cout << "9 found " << (last - first) << " time(s); size now " << v.size() << '\n';

    // How many elements are in [2, 8]?
    auto n = std::upper_bound(v.begin(), v.end(), 8) - std::lower_bound(v.begin(), v.end(), 2);
    std::cout << n << " elements in [2, 8]\n";
}
```

```output
true false
3s occupy [1, 4)
count of 3: 3
5 would go at index 4
9 found 1 time(s); size now 7
5 elements in [2, 8]
```

If the data was sorted with a custom comparator, pass the **same** comparator:

```cpp
std::sort(v.begin(), v.end(), std::greater<>{});
auto it = std::lower_bound(v.begin(), v.end(), 10, std::greater<>{});  // first element <= 10
```

## `std::is_sorted` and `std::is_sorted_until`

```cpp run
#include <algorithm>
#include <functional>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> a{1, 2, 2, 5};
    std::vector<int> b{1, 4, 3, 8};
    std::cout << std::boolalpha << std::is_sorted(a.begin(), a.end()) << ' '
              << std::is_sorted(b.begin(), b.end()) << ' '
              << std::is_sorted(a.rbegin(), a.rend(), std::greater<>{}) << '\n';

    auto bad = std::is_sorted_until(b.begin(), b.end());   // first element that breaks the order
    std::cout << "sorted prefix length: " << (bad - b.begin()) << '\n';
}
```

```output
true false true
sorted prefix length: 2
```

Empty ranges and single elements count as sorted.

## Common mistakes

- Using `<=` in a comparator (undefined behavior).
- Binary searching unsorted data (wrong answers, no error).
- Dereferencing the result of `find` without comparing to `end()`.
- Passing iterators from **two different** containers: `std::sort(a.begin(), b.end())` is undefined
  behavior.
- Calling `std::sort` on a `std::list`. It doesn't compile, because list iterators aren't random-access:

```cpp compile-error
#include <algorithm>
#include <list>

int main() {
    std::list<int> l{3, 1, 2};
    std::sort(l.begin(), l.end());   // error: no match for 'operator-' (needs random-access iterators)
}
```

:::quiz
`v` is `{2, 4, 4, 4, 8}`. What do `std::lower_bound(v.begin(), v.end(), 4) - v.begin()` and
`std::upper_bound(v.begin(), v.end(), 4) - v.begin()` give?

- [ ] `1` and `3`
- [x] `1` and `4`
- [ ] `2` and `4`
- [ ] `0` and `5`

`lower_bound` finds the first element `>= 4` (index 1); `upper_bound` the first element `> 4` (index 4, the `8`). Their difference, 3, is the count of 4s.
:::

:::quiz
You sort a list of employees by department and want people within a department to stay in the
order they were hired (the current order). Which call is correct?

- [ ] `std::sort` with a comparator on department
- [x] `std::stable_sort` with a comparator on department
- [ ] `std::partial_sort` with a comparator on department
- [ ] `std::nth_element` with a comparator on department

Only `stable_sort` guarantees that elements comparing equal (same department) keep their relative order.
:::

:::exercise Sort descending
Read `n` integers and print them sorted from **largest to smallest**, separated by spaces.

**Input:** `n` (at least 1), then `n` integers.
**Output:** the numbers in descending order on one line, separated by single spaces.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    for (std::size_t i = 0; i < v.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```cpp solution
#include <algorithm>
#include <functional>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::sort(v.begin(), v.end(), std::greater<>{});

    for (std::size_t i = 0; i < v.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << v[i];
    }
    std::cout << '\n';
}
```

```hint
`std::sort(v.begin(), v.end(), std::greater<>{})` or a lambda `[](int a, int b) { return a > b; }`.
```

```stdin
5
3 1 4 1 5
```

```expected
5 4 3 1 1
```

```stdin
4
-2 0 -7 10
```

```expected
10 0 -2 -7
```

```stdin
1
42
```

```expected hidden
42
```

```checks
must std::sort|std::ranges::sort :: Sort with std::sort.
```
:::

:::exercise Leaderboard
Read `n` players, each a name and a score. Print them sorted by score **descending**; players with
equal scores are ordered by name **alphabetically**.

**Input:** `n`, then `n` lines `name score` (names have no spaces).
**Output:** one line per player: `name score`.

```cpp starter
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Player {
    std::string name;
    int score;
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Player> players(n);
    for (auto& p : players) std::cin >> p.name >> p.score;

    // sort here

    for (const auto& p : players) std::cout << p.name << ' ' << p.score << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Player {
    std::string name;
    int score;
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Player> players(n);
    for (auto& p : players) std::cin >> p.name >> p.score;

    std::sort(players.begin(), players.end(), [](const Player& a, const Player& b) {
        if (a.score != b.score) return a.score > b.score;
        return a.name < b.name;
    });

    for (const auto& p : players) std::cout << p.name << ' ' << p.score << '\n';
}
```

```hint
In the comparator, first check whether the scores differ. If they do, the higher score comes first.
Otherwise compare names with `<`.
```

```stdin
4
zoe 50
adam 70
mia 50
bob 70
```

```expected
adam 70
bob 70
mia 50
zoe 50
```

```stdin
3
cara -5
al 0
bo -5
```

```expected hidden
al 0
bo -5
cara -5
```

```checks
must std::sort|std::stable_sort :: Use std::sort (or std::stable_sort) with a comparator.
must \[[^\]]*\]\s*\(\s*const\s+Player\s*& :: Write the comparator as a lambda taking const Player&.
```
:::

:::exercise First negative
Read `n` integers and print the **index** (0-based) of the first negative number, using
`std::find_if`. If there is no negative number, print `none`.

**Input:** `n`, then `n` integers.
**Output:** the index, or `none`, followed by a newline.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::cout << "none\n";
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

    auto it = std::find_if(v.begin(), v.end(), [](int x) { return x < 0; });
    if (it == v.end()) {
        std::cout << "none\n";
    } else {
        std::cout << (it - v.begin()) << '\n';
    }
}
```

```hint
`std::find_if` returns an iterator. Compare it with `v.end()` first; if it's a real match,
`it - v.begin()` is its index.
```

```stdin
5
4 0 7 -2 -9
```

```expected
3
```

```stdin
3
1 2 3
```

```expected
none
```

```stdin
2
-1 5
```

```expected hidden
0
```

```stdin
0
```

```expected hidden
none
```

```checks
must find_if :: Use std::find_if.
```
:::

:::exercise Range count queries
Read `n` integers (in any order), then `q` queries. Each query is two integers `lo hi`
(`lo <= hi`); answer **how many of the numbers are between `lo` and `hi`, inclusive**.

Sort the numbers once, then answer each query with `std::lower_bound` and `std::upper_bound` (each
query in O(log n), not by scanning).

**Input:** `n`, `n` integers, `q`, then `q` lines `lo hi`.
**Output:** one count per query, one per line.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    int q;
    std::cin >> q;
    while (q--) {
        int lo, hi;
        std::cin >> lo >> hi;
        std::cout << 0 << '\n';
    }
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
    std::sort(v.begin(), v.end());

    int q;
    std::cin >> q;
    while (q--) {
        int lo, hi;
        std::cin >> lo >> hi;
        auto first = std::lower_bound(v.begin(), v.end(), lo);   // first >= lo
        auto last = std::upper_bound(v.begin(), v.end(), hi);    // first > hi
        std::cout << (last - first) << '\n';
    }
}
```

```hint
Sort first: binary search only works on sorted data.
```

```hint
The numbers in `[lo, hi]` start at `lower_bound(lo)` (first element `>= lo`) and end just before
`upper_bound(hi)` (first element `> hi`). The count is the distance between those iterators.
```

```stdin
7
5 1 9 3 3 7 10
4
3 7
1 10
4 4
11 20
```

```expected
4
7
0
0
```

```stdin
4
-5 0 0 5
3
0 0
-10 -1
-5 5
```

```expected hidden
2
1
4
```

```checks
must lower_bound :: Use std::lower_bound.
must upper_bound :: Use std::upper_bound.
must std::sort|std::ranges::sort :: Sort the numbers first.
```
:::
